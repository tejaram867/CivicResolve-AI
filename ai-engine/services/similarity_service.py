from pathlib import Path
from typing import List, Dict, Any, Optional
from models.embedding_model import extract_image_embedding, compute_similarity, compare_images


def compare_two_images(image_path_a: str, image_path_b: str, threshold: float = 0.80) -> Dict[str, Any]:
    """Compare two civic issue images using DINOv2 visual embeddings."""
    return compare_images(image_path_a, image_path_b, threshold=threshold)


def find_similar_reports(
    query_image: str,
    existing_reports: List[Dict[str, Any]],
    threshold: float = 0.75,
) -> List[Dict[str, Any]]:
    """
    Compare a newly reported problem image against existing problem images.
    Each report in existing_reports is expected to have 'id' and 'image_path'.
    Returns list of matches sorted by similarity descending.
    """
    query_emb = extract_image_embedding(query_image)
    matches = []

    for report in existing_reports:
        img_path = report.get("image_path")
        if not img_path or not Path(img_path).exists():
            continue

        try:
            cand_emb = extract_image_embedding(img_path)
            sim = compute_similarity(query_emb, cand_emb)

            matches.append({
                "problem_id": report.get("id"),
                "title": report.get("title", "Untitled Problem"),
                "image_path": img_path,
                "similarity": sim,
                "is_potential_duplicate": sim >= threshold,
                "confidence_percentage": round(max(0.0, sim) * 100, 2),
            })
        except Exception as e:
            continue

    matches.sort(key=lambda x: x["similarity"], reverse=True)
    return matches


def find_geo_similar_duplicates(
    query_image: str,
    query_lat: Optional[float],
    query_lon: Optional[float],
    existing_reports: List[Dict[str, Any]],
    radius_meters: float = 100.0,
    similarity_threshold: float = 0.80,
) -> Dict[str, Any]:
    """
    Combined GPS radius + DINOv2 visual similarity duplicate detection.
    Identifies potential duplicate reports of the same real-world civic problem.
    """
    from services.geospatial_service import calculate_haversine_distance

    has_geo = query_lat is not None and query_lon is not None
    query_emb = None
    if query_image and Path(query_image).exists():
        query_emb = extract_image_embedding(query_image)

    matches = []

    for report in existing_reports:
        # Ignore closed/resolved reports if specified
        status = str(report.get("status", "OPEN")).upper()
        if status in ["RESOLVED", "CLOSED"]:
            continue

        cand_lat = report.get("latitude")
        cand_lon = report.get("longitude")
        cand_img = report.get("image_path")

        # 1. Geographic distance check
        distance_meters = None
        within_radius = True
        if has_geo and cand_lat is not None and cand_lon is not None:
            distance_meters = calculate_haversine_distance(query_lat, query_lon, float(cand_lat), float(cand_lon))
            within_radius = distance_meters <= radius_meters

        # 2. Visual similarity check via DINOv2
        sim = 0.0
        if query_emb is not None and cand_img and Path(cand_img).exists():
            try:
                cand_emb = extract_image_embedding(cand_img)
                sim = compute_similarity(query_emb, cand_emb)
            except Exception:
                sim = 0.0

        # 3. Combined potential match decision:
        # Must be within GPS radius AND exceed image similarity threshold
        is_potential_duplicate = bool(within_radius and (sim >= similarity_threshold))

        matches.append({
            "problem_id": report.get("id"),
            "title": report.get("title", "Civic Problem"),
            "status": status,
            "distance_meters": distance_meters,
            "is_within_radius": within_radius,
            "image_similarity": sim,
            "is_potential_duplicate": is_potential_duplicate,
            "similarity_percentage": round(max(0.0, sim) * 100, 2),
            "image_path": cand_img,
        })

    # Sort matches: potential duplicates first, then highest similarity, then closest distance
    matches.sort(
        key=lambda m: (
            1 if m["is_potential_duplicate"] else 0,
            m["image_similarity"],
            -(m["distance_meters"] if m["distance_meters"] is not None else 999999),
        ),
        reverse=True,
    )

    has_potential_match = any(m["is_potential_duplicate"] for m in matches)

    return {
        "potential_match": has_potential_match,
        "radius_meters": radius_meters,
        "similarity_threshold": similarity_threshold,
        "total_candidates_analyzed": len(existing_reports),
        "matches": matches,
    }

