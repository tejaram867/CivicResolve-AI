from pathlib import Path
from typing import List, Union
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

_embedding_processor = None
_embedding_model = None

MODEL_NAME = "facebook/dinov2-base"


def get_embedding_components():
    """Lazy-load and cache the DINOv2 processor and model."""
    global _embedding_processor, _embedding_model
    if _embedding_processor is None or _embedding_model is None:
        _embedding_processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        _embedding_model = AutoModel.from_pretrained(MODEL_NAME)
        _embedding_model.eval()
    return _embedding_processor, _embedding_model


def extract_image_embedding(image_path: Union[str, Path]) -> torch.Tensor:
    """Extract a 768-dimensional normalized embedding vector using DINOv2."""
    processor, model = get_embedding_components()
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)
        # Extract the [CLS] token representation (shape: [1, 768])
        cls_token = outputs.last_hidden_state[:, 0, :]
        normalized_emb = F.normalize(cls_token, p=2, dim=-1)

    return normalized_emb


def compute_similarity(emb1: torch.Tensor, emb2: torch.Tensor) -> float:
    """Calculate cosine similarity between two normalized embedding vectors."""
    sim = F.cosine_similarity(emb1, emb2).item()
    return float(round(sim, 4))


def compare_images(image_path_a: str, image_path_b: str, threshold: float = 0.80) -> dict:
    """Compare two images using DINOv2 visual embeddings and return similarity metrics."""
    emb_a = extract_image_embedding(image_path_a)
    emb_b = extract_image_embedding(image_path_b)
    similarity = compute_similarity(emb_a, emb_b)

    return {
        "model": MODEL_NAME,
        "embedding_dimension": 768,
        "image_a": image_path_a,
        "image_b": image_path_b,
        "similarity": similarity,
        "is_visually_similar": similarity >= threshold,
        "similarity_percentage": round(max(0.0, similarity) * 100, 2),
    }


def get_embedding_vector(image_path: str) -> dict:
    """Get the raw 768-dimensional embedding vector for an image."""
    emb = extract_image_embedding(image_path)
    vector = emb.squeeze(0).tolist()

    return {
        "model": MODEL_NAME,
        "embedding_dimension": len(vector),
        "image_path": image_path,
        "embedding": vector,
    }
