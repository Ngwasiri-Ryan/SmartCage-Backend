import subprocess
import os
import signal

class RTSPTranscoder:
  def __init__(self, backend_dir: str):
    self.backend_dir = backend_dir
    self.processes = {}  # cameraId -> subprocess.Popen

  def start(self, camera_id: int, rtsp_url: str) -> str:
    # Ensure any existing transcoder for this camera is stopped first
    self.stop(camera_id)

    # Set up stream target directory inside NestJS uploads path
    stream_dir = os.path.join(self.backend_dir, 'uploads', 'streams', str(camera_id))
    os.makedirs(stream_dir, exist_ok=True)
    m3u8_path = os.path.join(stream_dir, 'index.m3u8')

    # Clear stale segments from previous sessions
    if os.path.exists(stream_dir):
      for f in os.listdir(stream_dir):
        if f.endswith('.m3u8') or f.endswith('.ts'):
          try:
            os.remove(os.path.join(stream_dir, f))
          except:
            pass

    local_ffmpeg = os.path.join(os.path.dirname(__file__), 'ffmpeg.exe')
    ffmpeg_path = local_ffmpeg if os.path.exists(local_ffmpeg) else 'ffmpeg'

    # FFmpeg command to transcode video copy without re-encoding to minimize CPU utilization
    cmd = [
      ffmpeg_path,
      '-rtsp_transport', 'tcp',
      '-i', rtsp_url,
      '-c:v', 'copy',
      '-an',
      '-hls_time', '2',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments',
      m3u8_path
    ]

    print(f"[RTSPTranscoder] Launching FFmpeg for Camera #{camera_id}")
    
    try:
      # Spawn FFmpeg in background
      devnull = open(os.devnull, 'w')
      
      # Use CREATE_NEW_PROCESS_GROUP on Windows to prevent signals from propagation
      creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
      
      process = subprocess.Popen(
        cmd,
        stdout=devnull,
        stderr=devnull,
        creationflags=creation_flags
      )
      self.processes[camera_id] = process
      return f"/uploads/streams/{camera_id}/index.m3u8"
    except Exception as e:
      print(f"[RTSPTranscoder] FFmpeg start failed: {e}")
      raise e

  def stop(self, camera_id: int):
    process = self.processes.pop(camera_id, None)
    if process:
      print(f"[RTSPTranscoder] Terminating FFmpeg process for Camera #{camera_id}")
      try:
        if os.name == 'nt':
          process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
          process.terminate()
        process.wait(timeout=5)
      except Exception as e:
        print(f"[RTSPTranscoder] Force killing FFmpeg process: {e}")
        try:
          process.kill()
        except:
          pass
