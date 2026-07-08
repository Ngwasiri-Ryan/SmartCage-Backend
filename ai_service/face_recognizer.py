import os
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
import numpy as np

class FaceRecognizer:
  def __init__(self):
    # Use CPU by default for a school project, GPU if available
    self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[FaceRecognizer] Initializing on device: {self.device}")
    
    # Initialize MTCNN for face detection
    self.mtcnn = MTCNN(keep_all=False, device=self.device)
    
    # Initialize InceptionResnetV1 for face embedding extraction
    self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

  def validate_face(self, image_path: str):
    """
    Validate if the image contains exactly one face.
    Returns: {"status": "ok", "embedding": list} or {"status": "error", "error": "no_face_detected"|"multiple_faces_detected"}
    """
    if not os.path.exists(image_path):
      raise FileNotFoundError(f"Image not found at path: {image_path}")

    img = Image.open(image_path).convert('RGB')
    
    # Detect face count
    boxes, _ = self.mtcnn.detect(img)
    if boxes is None or len(boxes) == 0:
      return {"status": "error", "error": "no_face_detected"}
    elif len(boxes) > 1:
      return {"status": "error", "error": "multiple_faces_detected"}
      
    # Generate embedding
    try:
      embedding = self.get_embedding(image_path)
      return {"status": "ok", "embedding": embedding}
    except Exception as e:
      return {"status": "error", "error": str(e)}

  def get_embedding(self, image_path: str):
    """
    Load image, detect face using MTCNN, and extract 512-dim embedding.
    """
    if not os.path.exists(image_path):
      raise FileNotFoundError(f"Image not found at path: {image_path}")

    img = Image.open(image_path).convert('RGB')
    
    # Detect face and crop
    face = self.mtcnn(img)
    if face is None:
      raise ValueError("No face detected in the image.")
      
    # Generate face embedding
    with torch.no_grad():
      face_tensor = face.unsqueeze(0).to(self.device)
      embedding = self.resnet(face_tensor)
      
    # Convert PyTorch tensor to python list
    return embedding.squeeze(0).cpu().numpy().tolist()

  def compute_similarity(self, embedding1: list, embedding2: list) -> float:
    """
    Calculate the Cosine Similarity between two face embeddings.
    Range: [-1.0, 1.0] where 1.0 is identical.
    """
    v1 = np.array(embedding1)
    v2 = np.array(embedding2)
    
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    
    if norm_v1 == 0 or norm_v2 == 0:
      return 0.0
      
    return float(dot_product / (norm_v1 * norm_v2))

  def match_face(self, query_embedding: list, candidates: list, threshold: float = 0.65):
    """
    Matches the face embedding against a list of candidates.
    candidates list format: [{'personnelId': int, 'name': str, 'embedding': list}]
    
    Returns: (personnelId, name, score, is_authorized)
    """
    best_score = -1.0
    best_candidate = None
    
    for c in candidates:
      score = self.compute_similarity(query_embedding, c['embedding'])
      if score > best_score:
        best_score = score
        best_candidate = c
        
    if best_score >= threshold and best_candidate:
      return best_candidate['personnelId'], best_candidate['name'], best_score, True
      
    # If no candidate matched above threshold, return unauthorized Unknown
    return None, "Unknown", best_score, False
