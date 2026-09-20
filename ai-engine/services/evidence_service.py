import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image

from models.text_model import classify_text
from models.clip_model import classify_image
from models.yolo_model import detect_objects
from models.blip_model import caption_image

# Configurable scoring weights
EVIDENCE_WEIGHTS = {
    "category_consistency": 0.40,
    "caption_consistency": 0.30,
    "object_evidence": 0.15,
    "image_validity": 0.15,
}

# Standard civic candidate labels for BART and CLIP
CANDIDATE_LABELS = [
    "a photograph of garbage",
    "a photograph of a pothole",
    "a photograph of a damaged road",
    "a photograph of water leakage",
    "a photograph of a flooded road",
    "a photograph of a broken streetlight",
    "a photograph of a normal road",
]

# Semantic clusters for flexible category consistency
CATEGORY_CLUSTERS = {
    "garbage": {"garbage", "trash", "waste", "debris", "dump", "rubbish"},
    "pothole": {"pothole", "damaged road", "road damage", "cracked road"},
    "damaged road": {"damaged road", "pothole", "road damage", "cracked road"},
    "water leakage": {"water leakage", "flooded road", "pipeline leak", "water problem", "pipe burst"},
    "flooded road": {"flooded road", "water leakage", "water problem"},
    "broken streetlight": {"broken streetlight", "streetlight", "street lamp", "light pole"},
    "normal road": {"normal road", "clean road"},
}

# Keywords to evaluate BLIP caption consistency
CATEGORY_KEYWORDS = {
    "garbage": {"garbage", "trash", "waste", "debris", "litter", "rubbish", "dump", "pile", "plastic", "bin", "scrap"},
    "pothole": {"pothole", "hole", "cavity", "damaged", "asphalt", "cracked", "pavement", "road", "street", "sidewalk"},
    "damaged road": {"road", "street", "damaged", "broken", "cracked", "pavement", "asphalt", "hole", "sidewalk"},
    "water leakage": {"water", "leak", "leakage", "pipeline", "flooded", "flowing", "puddle", "pipe", "burst", "drain", "spray", "spraying", "soil"},
    "flooded road": {"flood", "flooded", "water", "puddle", "submerged", "street", "rain", "road"},
    "broken streetlight": {"light", "pole", "streetlight", "street light", "lamp", "post", "wire", "bulb", "dark", "lantern"},
    "normal road": {"clean", "normal", "empty", "car", "highway", "traffic", "road", "street"},
}


def normalize_label(label: str) -> str:
    """Normalize labels like 'a photograph of a pothole' -> 'pothole'."""
    clean = label.lower().strip()
    for prefix in ["a photograph of a ", "a photograph of ", "photograph of ", "photo of "]:
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
    return clean.strip()


def check_image_validity(image_path: Optional[str]) -> tuple[bool, float, str]:
    """Check if the provided image path exists, is readable and valid."""
    if not image_path:
        return False, 0.0, "No evidence image supplied"

    path_obj = Path(image_path)
    if not path_obj.exists() or not path_obj.is_file():
        return False, 0.0, "Evidence image file does not exist on disk"

    try:
        with Image.open(path_obj) as img:
            img.verify()
        with Image.open(path_obj) as img:
            w, h = img.size
            if w < 20 or h < 20:
                return False, 0.2, "Image resolution is too low to extract meaningful evidence"
        return True, 1.0, "Evidence image is valid and accessible"
    except Exception as e:
        return False, 0.0, f"Image file is corrupt or unreadable: {str(e)}"


def compute_category_consistency(
    bart_result: Dict[str, Any],
    clip_result: Optional[Dict[str, Any]],
) -> tuple[float, str]:
    """Calculate category consistency between text (BART) and visual (CLIP)."""
    if not clip_result or "best" not in clip_result:
        return 0.0, "No visual category available to cross-verify text"

    text_best_raw = bart_result["best"]["label"]
    text_conf = float(bart_result["best"]["score"])
    text_cat = normalize_label(text_best_raw)

    clip_best_raw = clip_result["best"]["label"]
    clip_conf = float(clip_result["best"]["score"])
    clip_cat = normalize_label(clip_best_raw)

    # 1. Exact category match
    if text_cat == clip_cat:
        score = 0.80 + 0.20 * min(text_conf, clip_conf)
        msg = f"Text category ({text_cat}, {text_conf:.1%}) matches visual category ({clip_cat}, {clip_conf:.1%})"
        return round(score, 4), msg

    # 2. Semantically related categories
    related_set = CATEGORY_CLUSTERS.get(text_cat, set())
    if clip_cat in related_set:
        score = 0.65 + 0.25 * min(text_conf, clip_conf)
        msg = f"Text category ({text_cat}) is semantically consistent with visual category ({clip_cat})"
        return round(score, 4), msg

    # 3. Category mismatch — check CLIP's confidence score for the text's category
    clip_results_list = clip_result.get("results", [])
    clip_for_text = next(
        (float(item["score"]) for item in clip_results_list if normalize_label(item["label"]) == text_cat),
        0.0
    )

    score = max(0.05, round(clip_for_text * 0.5, 4))
    msg = f"Category divergence: text describes '{text_cat}', but image classified as '{clip_cat}' ({clip_conf:.1%})"
    return score, msg


def compute_caption_consistency(
    text: str,
    text_cat: str,
    blip_caption: Optional[str],
) -> tuple[float, str]:
    """Calculate consistency between citizen text description and BLIP caption."""
    if not blip_caption:
        return 0.0, "No image caption available for evidence analysis"

    caption_lower = blip_caption.lower()
    text_lower = text.lower()

    # Get keywords for the text category
    expected_keywords = CATEGORY_KEYWORDS.get(text_cat, set())

    # Check for keywords matching expected category
    matched_keywords = [kw for kw in expected_keywords if kw in caption_lower]

    # Check for conflicting categories (e.g. text is water leakage, but caption has garbage)
    conflicting_categories = []
    for other_cat, keywords in CATEGORY_KEYWORDS.items():
        if other_cat != text_cat and other_cat not in CATEGORY_CLUSTERS.get(text_cat, set()):
            if any(kw in caption_lower for kw in keywords if len(kw) > 3):
                conflicting_categories.append(other_cat)

    if matched_keywords and not conflicting_categories:
        score = min(1.0, 0.70 + 0.10 * len(matched_keywords))
        msg = f"Caption ('{blip_caption}') directly substantiates reported issue keywords: {', '.join(matched_keywords[:3])}"
        return round(score, 4), msg

    if matched_keywords and conflicting_categories:
        score = 0.50
        msg = f"Caption ('{blip_caption}') contains mixed elements for '{text_cat}' and '{conflicting_categories[0]}'"
        return score, msg

    if conflicting_categories:
        score = 0.15
        msg = f"Caption ('{blip_caption}') describes '{conflicting_categories[0]}' rather than reported '{text_cat}'"
        return score, msg

    # Neutral / generic scene
    score = 0.45
    msg = f"Caption ('{blip_caption}') provides generic visual context"
    return score, msg


def compute_object_evidence(yolo_result: Optional[Dict[str, Any]]) -> tuple[float, str]:
    """
    Evaluate supporting object evidence from YOLO detections.
    YOLO absence is treated neutrally (0.55), while detections provide supporting context.
    """
    if not yolo_result:
        return 0.50, "Object detection unavailable (neutral signal)"

    detections = yolo_result.get("detections", [])
    if not detections:
        # Potholes and road cracks are not standard COCO classes — neutral score
        return 0.55, "No specific foreground objects detected (neutral; typical for close-up road/surface damage)"

    class_names = [d["class_name"] for d in detections[:5]]
    avg_conf = sum(d["confidence"] for d in detections) / len(detections)
    score = min(1.0, 0.65 + 0.35 * avg_conf)
    msg = f"Detected {len(detections)} supporting objects in scene: {', '.join(set(class_names))}"
    return round(score, 4), msg


def evaluate_evidence_strength(
    text: str,
    image_path: Optional[str] = None,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Compute transparent multimodal Evidence Strength Score (0-100)
    combining BART (text), CLIP (visual), YOLO (objects), BLIP (caption) and Image Validity.
    """
    active_weights = weights or EVIDENCE_WEIGHTS
    explanations: List[str] = []

    # 1. Image Validity Signal
    is_valid_image, img_val_score, img_val_msg = check_image_validity(image_path)
    explanations.append(img_val_msg)

    # 2. Text Classification (BART)
    try:
        bart_result = classify_text(text, CANDIDATE_LABELS)
        text_cat = normalize_label(bart_result["best"]["label"])
    except Exception as e:
        bart_result = {"best": {"label": "unknown", "score": 0.0}}
        text_cat = "unknown"
        explanations.append(f"Text classification error: {str(e)}")

    clip_result = None
    yolo_result = None
    blip_result = None

    if is_valid_image and image_path:
        # 3. Visual Classification (CLIP)
        try:
            clip_result = classify_image(image_path, CANDIDATE_LABELS)
        except Exception as e:
            explanations.append(f"CLIP image classification failed: {str(e)}")

        # 4. Object Detection (YOLO)
        try:
            yolo_result = detect_objects(image_path)
        except Exception as e:
            explanations.append(f"YOLO object detection failed: {str(e)}")

        # 5. Image Captioning (BLIP)
        try:
            blip_result = caption_image(image_path)
        except Exception as e:
            explanations.append(f"BLIP captioning failed: {str(e)}")

    # Compute individual signals
    cat_score, cat_msg = compute_category_consistency(bart_result, clip_result)
    explanations.append(cat_msg)

    blip_cap = blip_result.get("caption") if blip_result else None
    cap_score, cap_msg = compute_caption_consistency(text, text_cat, blip_cap)
    explanations.append(cap_msg)

    obj_score, obj_msg = compute_object_evidence(yolo_result)
    explanations.append(obj_msg)

    # Weighted combination
    raw_weighted = (
        active_weights["category_consistency"] * cat_score
        + active_weights["caption_consistency"] * cap_score
        + active_weights["object_evidence"] * obj_score
        + active_weights["image_validity"] * img_val_score
    )

    # If image is completely invalid, evidence strength is capped at a low baseline
    if not is_valid_image:
        raw_weighted = min(raw_weighted, 0.15)

    evidence_strength = int(round(max(0.0, min(1.0, raw_weighted)) * 100))

    # Transparent interpretation
    if evidence_strength >= 81:
        interpretation = "Very Strong"
    elif evidence_strength >= 61:
        interpretation = "Strong"
    elif evidence_strength >= 41:
        interpretation = "Moderate"
    elif evidence_strength >= 21:
        interpretation = "Weak"
    else:
        interpretation = "Very Weak"

    return {
        "evidence_strength": evidence_strength,
        "interpretation": interpretation,
        "text_category": text_cat,
        "visual_category": normalize_label(clip_result["best"]["label"]) if clip_result else None,
        "blip_caption": blip_cap,
        "signals": {
            "category_consistency": cat_score,
            "caption_consistency": cap_score,
            "object_evidence": obj_score,
            "image_validity": img_val_score,
        },
        "weights": active_weights,
        "explanation": explanations,
        "models_executed": {
            "bart": True,
            "clip": clip_result is not None,
            "yolo": yolo_result is not None,
            "blip": blip_result is not None,
        },
    }
