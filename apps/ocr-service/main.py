import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from paddleocr import PaddleOCR
from PIL import Image, ImageEnhance, ImageStat

app = FastAPI()
ocr = None
ocr_inference_lock = asyncio.Lock()

# Hard ceiling per request so a runaway inference cannot block the lock forever.
# The NestJS client's AbortSignal will fire first when OCR_TIMEOUT_MS is smaller,
# but this acts as a safety net at the Python layer.
OCR_INFERENCE_TIMEOUT = float(os.getenv("OCR_INFERENCE_TIMEOUT", "30"))

# Limit the longest side of the image before feeding it to PaddleOCR.
# Smartphone photos (4000+ px) can push memory over the container limit.
OCR_MAX_SIDE = int(os.getenv("OCR_MAX_SIDE", "2000"))


def env_flag(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def get_ocr():
    global ocr
    if ocr is None:
        ocr = PaddleOCR(
            device="cpu",
            enable_mkldnn=False,
            use_doc_orientation_classify=env_flag("PADDLE_OCR_USE_DOC_ORIENTATION", True),
            use_doc_unwarping=env_flag("PADDLE_OCR_USE_DOC_UNWARPING", True),
            use_textline_orientation=env_flag("PADDLE_OCR_USE_TEXTLINE_ORIENTATION", False),
            text_detection_model_name=os.getenv("PADDLE_OCR_DETECTION_MODEL", "PP-OCRv5_mobile_det"),
            text_recognition_model_name=os.getenv("PADDLE_OCR_RECOGNITION_MODEL", "korean_PP-OCRv5_mobile_rec"),
        )
    return ocr


def warm_up_ocr_models() -> None:
    """Run one inference before health checks can mark the service ready."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp:
        image_path = temp.name
    try:
        Image.new("RGB", (32, 32), color="white").save(image_path, "JPEG")
        # Creating PaddleOCR alone does not necessarily load all inference
        # models. A tiny prediction makes the first user scan fast and makes a
        # missing model fail deployment rather than a user's request.
        list(get_ocr().predict(image_path))
    finally:
        if os.path.exists(image_path):
            os.unlink(image_path)


@app.on_event("startup")
async def warm_up_ocr() -> None:
    async with ocr_inference_lock:
        await run_in_threadpool(warm_up_ocr_models)


def recognize_path(image_path: str) -> list[dict[str, float | str]]:
    """Map PaddleOCR 3.x pipeline output to the provider-neutral response contract."""
    lines: list[dict[str, float | str]] = []
    for result in get_ocr().predict(image_path):
        payload = getattr(result, "json", result)
        if isinstance(payload, str):
            import json

            payload = json.loads(payload)
        data = payload.get("res", payload) if isinstance(payload, dict) else {}
        texts = data.get("rec_texts", [])
        scores = data.get("rec_scores", [])
        for text, score in zip(texts, scores):
            normalized = str(text).strip()
            if normalized:
                lines.append({"text": normalized, "confidence": round(float(score) * 100, 2)})
    return lines


def resize_for_ocr(image_path: str) -> str:
    """Downscale the image so its longest side is at most OCR_MAX_SIDE pixels.

    Returns the original path unchanged when no resizing is needed, otherwise
    saves a JPEG next to the original and returns the new path.
    """
    img = Image.open(image_path)
    w, h = img.size
    if max(w, h) <= OCR_MAX_SIDE:
        return image_path
    scale = OCR_MAX_SIDE / max(w, h)
    resized_path = f"{image_path}-resized.jpg"
    img.resize((int(w * scale), int(h * scale)), Image.LANCZOS).save(resized_path, "JPEG", quality=90)
    return resized_path


def create_bottom_sheet_candidate(image_path: str) -> str | None:
    """Extract a bright full-width bottom sheet from a dimmed mobile screenshot."""
    image = Image.open(image_path).convert("L")
    width, height = image.size
    if height < width * 1.2:
        return None
    split_y = int(height * 0.38)
    top_brightness = ImageStat.Stat(image.crop((0, 0, width, split_y))).mean[0]
    bottom_brightness = ImageStat.Stat(image.crop((0, split_y, width, height))).mean[0]
    if bottom_brightness < 180 or bottom_brightness < top_brightness * 1.7:
        return None
    candidate_path = f"{image_path}-bottom-sheet.jpg"
    crop = image.crop((0, split_y, width, height))
    cw, ch = crop.size
    max_side = max(cw, ch)
    if max_side < OCR_MAX_SIDE:
        scale = min(2.0, OCR_MAX_SIDE / max_side)
        crop = crop.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    ImageEnhance.Contrast(crop).enhance(1.4).save(candidate_path)
    return candidate_path


@app.get("/health")
def health():
    return {"status": "ok", "engine": "paddleocr-3"}


@app.post("/v1/ocr")
async def recognize(image: UploadFile = File(...)):
    suffix = Path(image.filename or "receipt.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(await image.read())
        image_path = temp.name
    resized_path: str | None = None
    try:
        resized_path = await run_in_threadpool(resize_for_ocr, image_path)
        # PaddleOCR CPU inference is blocking and uses multiple native threads.
        # Serialize it to prevent competing inference jobs from starving the
        # container, while keeping the ASGI event loop free for health checks.
        try:
            async with ocr_inference_lock:
                lines = await asyncio.wait_for(
                    run_in_threadpool(recognize_path, resized_path),
                    timeout=OCR_INFERENCE_TIMEOUT,
                )
                bottom_sheet_path = await run_in_threadpool(create_bottom_sheet_candidate, resized_path)
                if bottom_sheet_path:
                    lines = await asyncio.wait_for(
                        run_in_threadpool(recognize_path, bottom_sheet_path),
                        timeout=OCR_INFERENCE_TIMEOUT,
                    )
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="OCR inference timed out")
        if not lines:
            raise HTTPException(status_code=422, detail="No text recognized")
        return {"text": "\n".join(line["text"] for line in lines), "confidence": round(sum(line["confidence"] for line in lines) / len(lines), 2), "lines": lines}
    finally:
        cleanup_paths = {image_path, f"{image_path}-bottom-sheet.jpg"}
        if resized_path:
            cleanup_paths.add(resized_path)
            cleanup_paths.add(f"{resized_path}-bottom-sheet.jpg")
        for path in cleanup_paths:
            if os.path.exists(path):
                os.unlink(path)
