import os
import shutil
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.embedding_model import (
    extract_image_embedding,
    compute_similarity,
    compare_images,
    get_embedding_vector,
)
from services.similarity_service import compare_two_images, find_similar_reports
from models.clip_model import classify_image
from models.text_model import classify_text
from models.yolo_model import detect_objects
from models.blip_model import caption_image

app = FastAPI(title="FUSIONX AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class CompareRequest(BaseModel):
    image_a_path: str
    image_b_path: str
    threshold: Optional[float] = 0.80


class CandidateReport(BaseModel):
    id: str
    title: Optional[str] = None
    image_path: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "OPEN"


class DuplicateSearchRequest(BaseModel):
    query_image_path: str
    query_latitude: Optional[float] = None
    query_longitude: Optional[float] = None
    radius_meters: Optional[float] = 100.0
    threshold: Optional[float] = 0.80
    candidates: List[CandidateReport]


@app.get("/")
def root():
    return {
        "service": "FUSIONX AI Engine",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/health",
        "models": [
            "facebook/dinov2-base (embeddings & similarity)",
            "openai/clip-vit-base-patch32 (zero-shot visual classification)",
            "facebook/bart-large-mnli (zero-shot text classification)",
            "ultralytics/yolo11n (object detection)",
            "Salesforce/blip-image-captioning-base (captioning)",
        ],
        "endpoints": {
            "root": "GET /",
            "health": "GET /health",
            "api_health": "GET /api/health",
            "similarity": "POST /ai/similarity",
            "embed": "POST /ai/embed",
            "find_duplicates": "POST /ai/find-duplicates",
            "evidence": "POST /ai/evidence",
            "predict": "POST /ai/predict",
            "swagger_ui": "GET /docs",
        },
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "engine": "FUSIONX AI Service",
        "models": ["dinov2-base", "bart-large-mnli", "clip-vit-base-patch32", "yolo11n", "blip-image-captioning-base"],
    }


@app.post("/ai/predict")
@app.post("/predict")
async def predict_endpoint(
    model: str = Form("clip"),
    text: Optional[str] = Form(""),
    labels: Optional[str] = Form(""),
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
):
    """Unified single-model prediction endpoint running warm in-memory models."""
    target_image = image_path
    if image:
        target_image = str(UPLOAD_DIR / f"predict_{image.filename}")
        with open(target_image, "wb") as f:
            shutil.copyfileobj(image.file, f)

    label_list = [l.strip() for l in labels.split(",") if l.strip()] if labels else [
        "a photograph of a pothole",
        "a photograph of a damaged road",
        "a photograph of garbage",
        "a photograph of a flooded road",
        "a photograph of a broken streetlight",
        "a photograph of a normal road",
        "a photograph of water leakage",
    ]

    if model == "text":
        return {"success": True, "model": "text", **classify_text(text or "", label_list)}

    if model == "clip":
        if not target_image or not os.path.exists(target_image):
            raise HTTPException(status_code=400, detail="Valid image required for CLIP")
        return {"success": True, "model": "clip", **classify_image(target_image, label_list)}

    if model == "yolo":
        if not target_image or not os.path.exists(target_image):
            raise HTTPException(status_code=400, detail="Valid image required for YOLO")
        return {"success": True, "model": "yolo", **detect_objects(target_image)}

    if model == "blip":
        if not target_image or not os.path.exists(target_image):
            raise HTTPException(status_code=400, detail="Valid image required for BLIP")
        return {"success": True, "model": "blip", **caption_image(target_image)}

    if model == "embedding":
        if not target_image or not os.path.exists(target_image):
            raise HTTPException(status_code=400, detail="Valid image required for embedding")
        return {"success": True, "model": "dinov2", **get_embedding_vector(target_image)}

    raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")


class EvidenceJsonRequest(BaseModel):
    text: str
    image_path: Optional[str] = None


@app.post("/ai/evidence")
async def evaluate_evidence_endpoint(
    text: str = Form(...),
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
):
    """
    Evaluate multimodal Evidence Strength Score (0-100) combining
    BART (text), CLIP (visual), YOLO (objects), BLIP (caption) and Image Validity.
    """
    from services.evidence_service import evaluate_evidence_strength

    target_image = image_path
    if image:
        target_image = str(UPLOAD_DIR / f"evidence_{image.filename}")
        with open(target_image, "wb") as f:
            shutil.copyfileobj(image.file, f)

    result = evaluate_evidence_strength(text=text, image_path=target_image)
    return {"success": True, **result}


@app.post("/ai/evidence/json")
def evaluate_evidence_json_endpoint(payload: EvidenceJsonRequest):
    """Evaluate multimodal Evidence Strength via JSON payload."""
    from services.evidence_service import evaluate_evidence_strength

    result = evaluate_evidence_strength(text=payload.text, image_path=payload.image_path)
    return {"success": True, **result}


@app.get("/ai/evidence")
def get_evidence_docs():
    return {
        "endpoint": "POST /ai/evidence",
        "description": "Evaluate multimodal Evidence Strength Score (0-100) combining BART, CLIP, YOLO, BLIP, and Image Validity",
        "parameters": {"text": "string (required)", "image": "file (optional)", "image_path": "string (optional)"},
        "interactive_docs": "/docs#/default/evaluate_evidence_endpoint_ai_evidence_post",
    }


class PriorityApiRequest(BaseModel):
    severity: Optional[int] = None
    evidence_strength: Optional[float] = None
    support_count: Optional[int] = 0
    criticality: Optional[Union[Dict[str, Any], str, float, int]] = None
    created_at: Optional[str] = None
    recent_supports: Optional[Union[List[Any], int]] = None
    weights: Optional[Dict[str, float]] = None
    support_cap: Optional[int] = 20
    duration_cap_days: Optional[int] = 30


@app.post("/ai/priority")
def calculate_priority_endpoint(payload: PriorityApiRequest):
    """Calculate transparent AI-assisted Priority Score (0-100) and Level."""
    from services.priority_service import calculate_priority

    result = calculate_priority(
        severity=payload.severity,
        evidence_strength=payload.evidence_strength,
        support_count=payload.support_count,
        criticality=payload.criticality,
        created_at=payload.created_at,
        recent_supports=payload.recent_supports,
        weights=payload.weights,
        support_cap=payload.support_cap if payload.support_cap is not None else 20,
        duration_cap_days=payload.duration_cap_days if payload.duration_cap_days is not None else 30,
    )
    return {"success": True, **result}


@app.get("/ai/priority")
def get_priority_docs():
    return {
        "endpoint": "POST /ai/priority",
        "description": "Calculate transparent AI-assisted Priority Score (0-100) and Level",
        "parameters": {
            "severity": "int 1-5 (optional)",
            "evidence_strength": "float 0-100 (optional)",
            "support_count": "int (default: 0)",
            "criticality": "string | dict | float (optional)",
            "created_at": "ISO timestamp string (optional)",
            "recent_supports": "int count or list (optional)",
        },
        "interactive_docs": "/docs#/default/calculate_priority_endpoint_ai_priority_post",
    }


@app.get("/ai/similarity")
def get_similarity_docs():
    return {
        "endpoint": "POST /ai/similarity",
        "description": "Compute DINOv2 visual cosine similarity between two images",
        "parameters": {"image_a": "file or path", "image_b": "file or path", "threshold": "float (default: 0.80)"},
        "interactive_docs": "/docs#/default/check_similarity_ai_similarity_post",
    }


@app.post("/ai/similarity")
async def check_similarity(
    image_a: Optional[UploadFile] = File(None),
    image_b: Optional[UploadFile] = File(None),
    image_a_path: Optional[str] = Form(None),
    image_b_path: Optional[str] = Form(None),
    threshold: float = Form(0.80),
):
    """
    Compute DINOv2 visual cosine similarity between two images.
    Accepts either file uploads or existing server file paths.
    """
    path_a = image_a_path
    path_b = image_b_path

    if image_a:
        path_a = str(UPLOAD_DIR / f"temp_a_{image_a.filename}")
        with open(path_a, "wb") as f:
            shutil.copyfileobj(image_a.file, f)

    if image_b:
        path_b = str(UPLOAD_DIR / f"temp_b_{image_b.filename}")
        with open(path_b, "wb") as f:
            shutil.copyfileobj(image_b.file, f)

    if not path_a or not path_b or not os.path.exists(path_a) or not os.path.exists(path_b):
        raise HTTPException(status_code=400, detail="Both images must be provided and exist on disk.")

    result = compare_two_images(path_a, path_b, threshold=threshold)
    return {"success": True, **result}


@app.get("/ai/embed")
def get_embed_docs():
    return {
        "endpoint": "POST /ai/embed",
        "description": "Extract a 768-dimensional normalized visual embedding via DINOv2",
        "parameters": {"image": "file or path"},
        "interactive_docs": "/docs#/default/extract_embedding_ai_embed_post",
    }


@app.post("/ai/embed")
async def extract_embedding(
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
):
    """Extract a 768-dimensional normalized visual embedding via DINOv2."""
    target_path = image_path

    if image:
        target_path = str(UPLOAD_DIR / f"embed_{image.filename}")
        with open(target_path, "wb") as f:
            shutil.copyfileobj(image.file, f)

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=400, detail="Image file or valid image_path required.")

    result = get_embedding_vector(target_path)
    return {"success": True, **result}


@app.post("/ai/find-duplicates")
def search_duplicates(payload: DuplicateSearchRequest):
    """
    Find visual and geospatial duplicates from candidate civic issues.
    Combines GPS radius check with DINOv2 visual similarity.
    """
    from services.similarity_service import find_geo_similar_duplicates

    candidates_data = [c.dict() for c in payload.candidates]
    result = find_geo_similar_duplicates(
        query_image=payload.query_image_path,
        query_lat=payload.query_latitude,
        query_lon=payload.query_longitude,
        existing_reports=candidates_data,
        radius_meters=payload.radius_meters if payload.radius_meters is not None else 100.0,
        similarity_threshold=payload.threshold if payload.threshold is not None else 0.80,
    )
    return {
        "success": True,
        "query_image": payload.query_image_path,
        **result,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
