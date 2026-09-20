import argparse
import json
import os
import sys
from pathlib import Path

from models.text_model import classify_text
from models.clip_model import classify_image
from models.yolo_model import detect_objects
from models.blip_model import caption_image
from models.embedding_model import get_embedding_vector, compare_images
from services.similarity_service import compare_two_images


def load_default_labels():
    return [
        "a photograph of a pothole",
        "a photograph of a damaged road",
        "a photograph of garbage",
        "a photograph of a flooded road",
        "a photograph of a broken streetlight",
        "a photograph of a normal road",
        "a photograph of water leakage",
    ]


def build_response(model_name, text=None, image_path=None, labels=None, compare_image_path=None):
    labels = labels or load_default_labels()

    if model_name == "text":
        return {"success": True, "model": "text", **classify_text(text or "", labels)}

    if model_name == "clip":
        if not image_path:
            raise ValueError("Image path is required for CLIP model")
        return {"success": True, "model": "clip", **classify_image(image_path, labels)}

    if model_name == "yolo":
        if not image_path:
            raise ValueError("Image path is required for YOLO model")
        return {"success": True, "model": "yolo", **detect_objects(image_path)}

    if model_name == "blip":
        if not image_path:
            raise ValueError("Image path is required for BLIP model")
        return {"success": True, "model": "blip", **caption_image(image_path)}

    if model_name == "embedding":
        if not image_path:
            raise ValueError("Image path is required for embedding model")
        return {"success": True, "model": "dinov2", **get_embedding_vector(image_path)}

    if model_name == "similarity":
        if not image_path or not compare_image_path:
            raise ValueError("Both --image and --compare-image are required for similarity model")
        return {"success": True, "model": "dinov2-similarity", **compare_images(image_path, compare_image_path)}

    raise ValueError(f"Unsupported model: {model_name}")


def main():
    parser = argparse.ArgumentParser(description="Civic AI engine")
    parser.add_argument(
        "--model",
        default="clip",
        choices=["clip", "yolo", "blip", "text", "embedding", "similarity"],
    )
    parser.add_argument("--image")
    parser.add_argument("--compare-image")
    parser.add_argument("--text")
    parser.add_argument("--labels", nargs="*")
    args = parser.parse_args()

    try:
        response = build_response(
            model_name=args.model,
            text=args.text,
            image_path=args.image,
            compare_image_path=args.compare_image,
            labels=args.labels or load_default_labels(),
        )
        print(json.dumps(response, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
