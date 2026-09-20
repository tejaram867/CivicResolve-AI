from transformers import pipeline

_clip_classifier = None


def get_clip_classifier():
    global _clip_classifier
    if _clip_classifier is None:
        _clip_classifier = pipeline(
            "zero-shot-image-classification",
            model="openai/clip-vit-base-patch32"
        )
    return _clip_classifier


def classify_image(image_path: str, labels: list[str]):
    classifier = get_clip_classifier()
    results = classifier(image_path, candidate_labels=labels)

    return {
        "model": "openai/clip-vit-base-patch32",
        "image_path": image_path,
        "results": [
            {
                "label": item["label"],
                "score": float(item["score"]),
            }
            for item in results
        ],
        "best": {
            "label": results[0]["label"],
            "score": float(results[0]["score"]),
        },
    }
