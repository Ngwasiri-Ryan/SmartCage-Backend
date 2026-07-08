import cv2
import numpy as np
from ultralytics import YOLO

class SimpleTracker:
  def __init__(self, max_lost_frames=10):
    self.next_id = 1
    self.tracks = {}  # id -> { 'bbox': [...], 'centroid': (cx, cy), 'lost_frames': 0, 'history': [] }
    self.max_lost_frames = max_lost_frames

  def calculate_iou(self, boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    unionArea = boxAArea + boxBArea - interArea
    return interArea / float(unionArea) if unionArea > 0 else 0

  def update(self, detections):
    matched_detections = set()
    matched_tracks = set()

    for track_id, track in self.tracks.items():
      best_iou = 0.25
      best_det_idx = -1
      for idx, det in enumerate(detections):
        if idx in matched_detections:
          continue
        iou = self.calculate_iou(track['bbox'], det)
        if iou > best_iou:
          best_iou = iou
          best_det_idx = idx

      if best_det_idx != -1:
        det = detections[best_det_idx]
        cx = (det[0] + det[2]) / 2.0
        cy = (det[1] + det[3]) / 2.0
        
        diag = np.sqrt((det[2] - det[0])**2 + (det[3] - det[1])**2)
        old_cx, old_cy = track['centroid']
        displacement = np.sqrt((cx - old_cx)**2 + (cy - old_cy)**2) / diag if diag > 0 else 0.0

        track['bbox'] = det
        track['centroid'] = (cx, cy)
        track['lost_frames'] = 0
        track['history'].append(displacement)
        if len(track['history']) > 60:  # ~60-frame rolling window
          track['history'].pop(0)

        matched_detections.add(best_det_idx)
        matched_tracks.add(track_id)

    # Clean up lost tracks
    lost_ids = []
    for track_id, track in list(self.tracks.items()):
      if track_id not in matched_tracks:
        track['lost_frames'] += 1
        if track['lost_frames'] > self.max_lost_frames:
          lost_ids.append(track_id)
    
    for track_id in lost_ids:
      del self.tracks[track_id]

    # Register new tracks
    for idx, det in enumerate(detections):
      if idx not in matched_detections:
        cx = (det[0] + det[2]) / 2.0
        cy = (det[1] + det[3]) / 2.0
        self.tracks[self.next_id] = {
          'bbox': det,
          'centroid': (cx, cy),
          'lost_frames': 0,
          'history': [0.05]
        }
        self.next_id += 1

    return self.tracks

class ChickTracker:
  def __init__(self):
    print("[ChickTracker] Initializing YOLOv8 model...")
    # Load YOLOv8 Nano model (pretrained on COCO)
    self.model = YOLO('yolov8n.pt')
    self.tracker = SimpleTracker()

  def process_frame(self, frame):
    """
    Runs YOLOv8 detector on class 14 (bird) to locate chicks,
    updates tracking, and returns updated tracks with motion metrics.
    """
    # Class index 14 is 'bird' in COCO dataset
    results = self.model(frame, classes=[14], verbose=False)
    
    detections = []
    if len(results) > 0:
      boxes = results[0].boxes
      for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
        detections.append([x1, y1, x2, y2])

    tracks = self.tracker.update(detections)
    
    flagged_ids = []
    for track_id, track in tracks.items():
      # Calculate rolling average motion score
      if len(track['history']) >= 10:
        avg_motion = sum(track['history']) / len(track['history'])
        # If motion stays below 0.015 (threshold) after initial setup
        if avg_motion < 0.015 and len(track['history']) >= 30:
          flagged_ids.append((track_id, avg_motion))
          
    return tracks, flagged_ids
