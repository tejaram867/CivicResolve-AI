from transformers import pipeline

_text_classifier = None


def get_text_classifier():
    global _text_classifier
    if _text_classifier is None:
        _text_classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli"
        )
    return _text_classifier


def classify_text(text: str, labels: list[str]):
    if not text or not text.strip():
        raise ValueError("Text input is required for the text model.")

    classifier = get_text_classifier()
    result = classifier(text, candidate_labels=labels, multi_label=False)

    return {
        "model": "facebook/bart-large-mnli",
        "input": text,
        "labels": result["labels"],
        "scores": [float(score) for score in result["scores"]],
        "best": {
            "label": result["labels"][0],
            "score": float(result["scores"][0]),
        },
    }
