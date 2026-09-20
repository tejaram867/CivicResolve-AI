from ultralytics import YOLO

_yolo_model = None


def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        _yolo_model = YOLO("yolo11n.pt")
    return _yolo_model


def detect_objects(image_path: str):
    model = get_yolo_model()
    results = model(image_path)

    detections = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            class_name = result.names[class_id]
            detections.append({
                "class_name": class_name,
                "confidence": confidence,
                "box": [float(value) for value in box.xyxy[0].tolist()],
            })

    return {
        "model": "yolo11n.pt",
        "image_path": image_path,
        "detections": detections,
        "best_detection": detections[0] if detections else None,
    }
