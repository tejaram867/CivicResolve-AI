from PIL import Image
from transformers import BlipForConditionalGeneration, BlipProcessor

_blip_processor = None
_blip_model = None


def get_blip_components():
    global _blip_processor, _blip_model
    if _blip_processor is None or _blip_model is None:
        _blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    return _blip_processor, _blip_model


def caption_image(image_path: str):
    processor, model = get_blip_components()
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    output = model.generate(**inputs, max_new_tokens=50)
    caption = processor.decode(output[0], skip_special_tokens=True)

    return {
        "model": "Salesforce/blip-image-captioning-base",
        "image_path": image_path,
        "caption": caption,
    }
