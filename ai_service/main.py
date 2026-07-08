import os
import cv2
import time
import threading
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from face_recognizer import FaceRecognizer
from chick_tracker import ChickTracker
from rtsp_transcoder import RTSPTranscoder

app = FastAPI(title="SmartCage AI Service")

# Resolve absolute path to root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')
NESTJS_API_URL = process_env_api_url = os.environ.get("NESTJS_API_URL", "http://localhost:3000")

# Initialize models and utilities
recognizer = FaceRecognizer()
chick_tracker = ChickTracker()
transcoder = RTSPTranscoder(BACKEND_DIR)

# Track active background stream monitoring threads
# cameraId -> { "stop_event": threading.Event, "thread": threading.Thread }
active_streams = {}

# Keep track of last access alert time per matched name to avoid alert spamming
access_alert_cooldown = {}

class FaceRegisterRequest(BaseModel):
  personnelId: int
  angle: str
  imagePath: str

class FaceValidateRequest(BaseModel):
  imagePath: str

class StartStreamRequest(BaseModel):
  cameraId: int
  rtspUrl: str

class StopStreamRequest(BaseModel):
  cameraId: int

@app.post("/register-face")
def register_face(req: FaceRegisterRequest):
  # Map relative web path "/uploads/faces/..." to local filesystem path
  local_path = os.path.join(BACKEND_DIR, req.imagePath.lstrip('/'))
  
  print(f"[AI Service] Processing face registration for personnel #{req.personnelId} on path: {local_path}")
  
  if not os.path.exists(local_path):
    raise HTTPException(status_code=404, detail=f"Image file not found at: {local_path}")
    
  try:
    embedding = recognizer.get_embedding(local_path)
    return {"status": "ok", "embedding": embedding}
  except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))

@app.post("/validate-face")
def validate_face(req: FaceValidateRequest):
  local_path = os.path.join(BACKEND_DIR, req.imagePath.lstrip('/'))
  print(f"[AI Service] Validating face image path: {local_path}")
  
  if not os.path.exists(local_path):
    raise HTTPException(status_code=404, detail=f"Image file not found at: {local_path}")
    
  try:
    res = recognizer.validate_face(local_path)
    return res
  except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))

@app.post("/start-stream")
def start_stream(req: StartStreamRequest):
  print(f"[AI Service] Request to start stream for camera #{req.cameraId} (RTSP: {req.rtspUrl})")
  
  try:
    # 1. Start FFmpeg HLS Transcoding
    hls_url = transcoder.start(req.cameraId, req.rtspUrl)
    
    # 2. Start Background Frame Processing (YOLO + Face recognition)
    if req.cameraId in active_streams:
      active_streams[req.cameraId]["stop_event"].set()
      active_streams[req.cameraId]["thread"].join()
      
    stop_event = threading.Event()
    thread = threading.Thread(
      target=monitor_stream_loop,
      args=(req.cameraId, req.rtspUrl, stop_event),
      daemon=True
    )
    thread.start()
    active_streams[req.cameraId] = {"stop_event": stop_event, "thread": thread}
    
    return {"status": "ok", "hlsUrl": hls_url}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop-stream")
def stop_stream(req: StopStreamRequest):
  print(f"[AI Service] Stopping stream for camera #{req.cameraId}")
  
  # Stop background thread
  stream_data = active_streams.pop(req.cameraId, None)
  if stream_data:
    stream_data["stop_event"].set()
    stream_data["thread"].join()

  # Stop FFmpeg transcoding
  transcoder.stop(req.cameraId)
  return {"status": "ok"}


def fetch_personnel_candidates():
  """
  Retrieve registered faces and embeddings from NestJS backend.
  """
  try:
    r = requests.get(f"{NESTJS_API_URL}/personnel")
    if r.status_code == 200:
      personnel_list = r.json()
      candidates = []
      for p in personnel_list:
        for face in p.get('faces', []):
          if face.get('embedding'):
            candidates.append({
              'personnelId': p['id'],
              'name': p['name'],
              'embedding': face['embedding']
            })
      return candidates
  except Exception as e:
    print(f"[AI Service] Error loading candidates: {e}")
  return []


def monitor_stream_loop(camera_id: int, rtsp_url: str, stop_event: threading.Event):
  """
  Grabs RTSP stream, processes frame at 1 FPS, and sends callbacks on detection/inactivity alerts.
  """
  print(f"[StreamLoop #{camera_id}] Background frame processing thread started.")
  
  # Attempt to connect to stream
  cap = cv2.VideoCapture(rtsp_url)
  if not cap.isOpened():
    print(f"[StreamLoop #{camera_id}] Error: Could not open RTSP source.")
    return

  last_process_time = 0
  
  while not stop_event.is_set():
    ret, frame = cap.read()
    if not ret:
      # Simple reconnect logic
      print(f"[StreamLoop #{camera_id}] Stream disconnected. Reconnecting...")
      cap.release()
      time.sleep(2)
      cap = cv2.VideoCapture(rtsp_url)
      continue

    now = time.time()
    # Process exactly 1 frame per second to save CPU
    if now - last_process_time < 1.0:
      continue
    last_process_time = now

    # ──── 1. Chick Inactivity Tracking ────
    try:
      tracks, flagged_chicks = chick_tracker.process_frame(frame)
      if flagged_chicks:
        # Trigger Health Alert
        chick_id, score = flagged_chicks[0]
        trigger_health_alert(camera_id, score, f"Tracked chick #{chick_id} exhibits abnormally low movement score of {score:.3f}", frame)
    except Exception as e:
      print(f"[StreamLoop #{camera_id}] Chick tracker error: {e}")

    # ──── 2. Face Recognition Access Control ────
    # Look for people (Class 0 in COCO model)
    try:
      results = chick_tracker.model(frame, classes=[0], verbose=False)
      if len(results) > 0 and len(results[0].boxes) > 0:
        # A person is in frame, process face recognition
        candidates = fetch_personnel_candidates()
        
        # Save frame to temporary file to pass to MTCNN
        temp_img_path = os.path.join(ROOT_DIR, "ai_service", f"temp_face_{camera_id}.jpg")
        cv2.imwrite(temp_img_path, frame)
        
        try:
          query_embed = recognizer.get_embedding(temp_img_path)
          p_id, name, score, is_authorized = recognizer.match_face(query_embed, candidates)
          
          # Cooldown to prevent logging access logs every second for the same person
          cooldown_key = f"{camera_id}_{name}"
          if now - access_alert_cooldown.get(cooldown_key, 0) > 30: # 30s cooldown
            access_alert_cooldown[cooldown_key] = now
            trigger_access_log(camera_id, p_id, is_authorized, name, frame)
        except ValueError:
          # MTCNN did not find a face inside the person box — skip
          pass
        finally:
          if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
    except Exception as e:
      print(f"[StreamLoop #{camera_id}] Face recognizer error: {e}")

  cap.release()
  print(f"[StreamLoop #{camera_id}] Frame processing thread exited.")


def trigger_health_alert(camera_id: int, score: float, description: str, frame):
  """
  Saves frame snapshot and POSTs alert to NestJS.
  """
  # Save alert snapshot locally
  snap_filename = f"chick_health_alert_{int(time.time())}.jpg"
  snap_dir = os.path.join(BACKEND_DIR, 'uploads', 'snapshots')
  os.makedirs(snap_dir, exist_ok=True)
  
  snap_path = os.path.join(snap_dir, snap_filename)
  cv2.imwrite(snap_path, frame)

  # Call NestJS callback
  url = f"{NESTJS_API_URL}/health-alerts"
  files = {'file': (snap_filename, open(snap_path, 'rb'), 'image/jpeg')}
  data = {
    'cameraId': str(camera_id),
    'movementScore': f"{score:.3f}",
    'description': description
  }
  
  try:
    r = requests.post(url, data=data, files=files)
    print(f"[Callback] Health Alert sent, HTTP status: {r.status_code}")
  except Exception as e:
    print(f"[Callback] Failed to post health alert: {e}")


def trigger_access_log(camera_id: int, personnel_id: int | None, is_authorized: bool, matched_name: str, frame):
  """
  Saves frame snapshot and POSTs access log to NestJS.
  """
  snap_filename = f"access_log_{int(time.time())}.jpg"
  snap_dir = os.path.join(BACKEND_DIR, 'uploads', 'snapshots')
  os.makedirs(snap_dir, exist_ok=True)
  
  snap_path = os.path.join(snap_dir, snap_filename)
  cv2.imwrite(snap_path, frame)

  url = f"{NESTJS_API_URL}/access-logs"
  files = {'file': (snap_filename, open(snap_path, 'rb'), 'image/jpeg')}
  data = {
    'cameraId': str(camera_id),
    'personnelId': str(personnel_id) if personnel_id is not None else "",
    'isAuthorized': 'true' if is_authorized else 'false',
    'matchedName': matched_name
  }
  
  try:
    r = requests.post(url, data=data, files=files)
    print(f"[Callback] Access Log sent ({matched_name}), HTTP status: {r.status_code}")
  except Exception as e:
    print(f"[Callback] Failed to post access log: {e}")
