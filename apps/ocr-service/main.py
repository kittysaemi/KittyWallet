import asyncio
import logging
import os
import tempfile
import time
from pathlib import Path

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from paddleocr import PaddleOCR
from PIL import Image, ImageEnhance, ImageStat
from PIL.ExifTags import TAGS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ocr")

app = FastAPI()
ocr = None
ocr_inference_lock = asyncio.Lock()

# Hard ceiling per request so a runaway inference cannot block the lock forever.
# The NestJS client's AbortSignal will fire first when OCR_TIMEOUT_MS is smaller,
# but this acts as a safety net at the Python layer.
OCR_INFERENCE_TIMEOUT = float(os.getenv("OCR_INFERENCE_TIMEOUT", "20"))

# Limit the longest side of the image before feeding it to PaddleOCR.
# Smartphone photos (4000+ px) can push memory over the container limit.
OCR_MAX_SIDE = int(os.getenv("OCR_MAX_SIDE", "2000"))
# When average confidence from the first pass falls below this value,
# a second pass (CLAHE for camera photos, adaptive threshold for others) is attempted.
# Lowered from 70 to 50: camera photos with good lighting often score 55-65%,
# and triggering an aggressive binarize pass degraded clean images.
OCR_LOW_CONF_THRESHOLD = float(os.getenv("OCR_LOW_CONF_THRESHOLD", "50"))


def env_flag(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def get_ocr():
    global ocr
    if ocr is None:
        ocr = PaddleOCR(
            device="cpu",
            enable_mkldnn=False,
            use_doc_orientation_classify=env_flag("PADDLE_OCR_USE_DOC_ORIENTATION", True),
            use_doc_unwarping=env_flag("PADDLE_OCR_USE_DOC_UNWARPING", False),
            use_textline_orientation=env_flag("PADDLE_OCR_USE_TEXTLINE_ORIENTATION", False),
            text_detection_model_name=os.getenv("PADDLE_OCR_DETECTION_MODEL", "PP-OCRv5_mobile_det"),
            text_recognition_model_name=os.getenv("PADDLE_OCR_RECOGNITION_MODEL", "korean_PP-OCRv5_mobile_rec"),
        )
    return ocr


def warm_up_ocr_models() -> None:
    """Run one inference before health checks can mark the service ready."""
    logger.info(
        "OCR config: use_doc_unwarping=%s use_doc_orientation=%s use_textline_orientation=%s "
        "det=%s rec=%s inference_timeout=%.0fs max_side=%d low_conf=%.0f%%",
        env_flag("PADDLE_OCR_USE_DOC_UNWARPING", False),
        env_flag("PADDLE_OCR_USE_DOC_ORIENTATION", True),
        env_flag("PADDLE_OCR_USE_TEXTLINE_ORIENTATION", False),
        os.getenv("PADDLE_OCR_DETECTION_MODEL", "PP-OCRv5_mobile_det"),
        os.getenv("PADDLE_OCR_RECOGNITION_MODEL", "korean_PP-OCRv5_mobile_rec"),
        OCR_INFERENCE_TIMEOUT, OCR_MAX_SIDE, OCR_LOW_CONF_THRESHOLD,
    )
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp:
        image_path = temp.name
    try:
        Image.new("RGB", (32, 32), color="white").save(image_path, "JPEG")
        # Creating PaddleOCR alone does not necessarily load all inference
        # models. A tiny prediction makes the first user scan fast and makes a
        # missing model fail deployment rather than a user's request.
        t0 = time.monotonic()
        list(get_ocr().predict(image_path))
        logger.info("warm-up done in %.1fs", time.monotonic() - t0)
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


def _score(lines: list[dict]) -> float:
    """Higher is better: penalizes both low line count and low confidence."""
    if not lines:
        return 0.0
    return len(lines) * sum(line["confidence"] for line in lines) / len(lines)


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


def adaptive_threshold_candidate(image_path: str, is_cam: bool = False) -> str | None:
    """Improve low-contrast images for a second OCR pass.

    Camera photos use CLAHE (Contrast Limited Adaptive Histogram Equalization) which
    enhances local contrast without over-binarizing clean areas — better for uneven
    lighting from handheld shots. Screenshots and thermal-paper receipts fall back to
    adaptive threshold binarization which recovers faded print more aggressively.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    out_path = f"{image_path}-thresh.jpg"
    if is_cam:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cv2.imwrite(out_path, clahe.apply(img))
    else:
        blurred = cv2.GaussianBlur(img, (3, 3), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)
        cv2.imwrite(out_path, thresh)
    return out_path


def is_camera_photo(image_path: str) -> bool:
    """Return True if the image carries camera EXIF metadata (Make, Model, or ExposureTime).

    Camera photos always embed these tags; screenshots and messenger-shared images
    typically do not. Used to skip screenshot-specific preprocessing on real photos.
    """
    try:
        with Image.open(image_path) as img:
            exif = img._getexif()
            if not exif:
                return False
            # 271=Make, 272=Model, 33434=ExposureTime
            return any(tag in exif for tag in (271, 272, 33434))
    except Exception:
        return False


def find_bright_content_region(image_path: str) -> str | None:
    """Detect the uppermost bright content panel in a dimmed mobile screenshot.

    Scans horizontal strips from the top to find a dark→bright transition,
    then crops everything from that boundary downward. Works for bottom sheets,
    center modals, and card-style overlays at arbitrary vertical positions.
    Returns None for landscape images or images that don't match the pattern.

    Only call this function after confirming the image is NOT a camera photo
    (use is_camera_photo). Natural photo backgrounds (wood, fabric, dark surfaces)
    can mimic the dark-top/bright-bottom pattern and cause false crops.
    """
    image = Image.open(image_path).convert("L")
    width, height = image.size
    if height < width * 1.2:
        return None

    BRIGHT = 190
    step = max(1, height // 100)
    start_y = None
    for y in range(0, height, step):
        strip = image.crop((0, y, width, min(y + step, height)))
        if ImageStat.Stat(strip).mean[0] >= BRIGHT:
            start_y = y
            break

    # Reject if bright region starts too early (image is just bright overall)
    # or no bright region was found
    if start_y is None or start_y < int(height * 0.15):
        return None

    top_region = image.crop((0, 0, width, start_y))
    # Natural photo backgrounds (wood grain, fabric, dark tables with texture) have
    # high pixel variance. Screenshot dim overlays are nearly uniform. Skip the crop
    # when the top region looks like a natural scene rather than a UI overlay.
    if ImageStat.Stat(top_region).stddev[0] > 25:
        return None

    top_brightness = ImageStat.Stat(top_region).mean[0]
    bottom_brightness = ImageStat.Stat(image.crop((0, start_y, width, height))).mean[0]
    if bottom_brightness < BRIGHT or bottom_brightness < top_brightness * 1.5:
        return None

    crop = image.crop((0, start_y, width, height))
    cw, ch = crop.size
    max_side = max(cw, ch)
    if max_side < OCR_MAX_SIDE:
        scale = min(2.0, OCR_MAX_SIDE / max_side)
        crop = crop.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    out_path = f"{image_path}-bright-region.jpg"
    ImageEnhance.Contrast(crop).enhance(1.4).save(out_path)
    return out_path


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
    t_req = time.monotonic()
    try:
        # Check EXIF on the original file before resize strips the metadata.
        camera_photo = await run_in_threadpool(is_camera_photo, image_path)
        resized_path = await run_in_threadpool(resize_for_ocr, image_path)
        logger.info("req start: filename=%s is_camera=%s", image.filename, camera_photo)
        # PaddleOCR CPU inference is blocking and uses multiple native threads.
        # Serialize it to prevent competing inference jobs from starving the
        # container, while keeping the ASGI event loop free for health checks.
        try:
            async with ocr_inference_lock:
                t_pass = time.monotonic()
                lines = await asyncio.wait_for(
                    run_in_threadpool(recognize_path, resized_path),
                    timeout=OCR_INFERENCE_TIMEOUT,
                )
                avg1 = sum(l["confidence"] for l in lines) / len(lines) if lines else 0.0
                logger.info("pass1: lines=%d avg_conf=%.1f%% elapsed=%.1fs", len(lines), avg1, time.monotonic() - t_pass)

                # Skip screenshot overlay detection for camera photos — the dark
                # background of a table can mimic a dimmed UI overlay and cause the
                # receipt to be cropped incorrectly.
                region_pass_done = False
                region_path = None if camera_photo else await run_in_threadpool(find_bright_content_region, resized_path)
                if region_path:
                    t_pass = time.monotonic()
                    region_lines = await asyncio.wait_for(
                        run_in_threadpool(recognize_path, region_path),
                        timeout=OCR_INFERENCE_TIMEOUT,
                    )
                    region_pass_done = True
                    improved = _score(region_lines) > _score(lines)
                    logger.info(
                        "pass2(region): lines=%d score=%.1f improved=%s elapsed=%.1fs",
                        len(region_lines), _score(region_lines), improved, time.monotonic() - t_pass,
                    )
                    if improved:
                        lines = region_lines

                avg_conf = sum(line["confidence"] for line in lines) / len(lines) if lines else 0
                # Enhancement pass is skipped when a region crop was already attempted —
                # both together would make the total pipeline exceed the backend timeout.
                if avg_conf < OCR_LOW_CONF_THRESHOLD and not region_pass_done:
                    thresh_path = await run_in_threadpool(adaptive_threshold_candidate, resized_path, camera_photo)
                    if thresh_path:
                        t_pass = time.monotonic()
                        thresh_lines = await asyncio.wait_for(
                            run_in_threadpool(recognize_path, thresh_path),
                            timeout=OCR_INFERENCE_TIMEOUT,
                        )
                        improved = _score(thresh_lines) > _score(lines)
                        logger.info(
                            "pass3(enhance/%s): lines=%d score=%.1f improved=%s elapsed=%.1fs",
                            "clahe" if camera_photo else "thresh",
                            len(thresh_lines), _score(thresh_lines), improved, time.monotonic() - t_pass,
                        )
                        if improved:
                            lines = thresh_lines
                elif avg_conf < OCR_LOW_CONF_THRESHOLD and region_pass_done:
                    logger.info("pass3 skipped: region pass already done (avg_conf=%.1f%%)", avg_conf)

        except asyncio.TimeoutError:
            logger.warning("OCR inference timed out after %.1fs", time.monotonic() - t_req)
            raise HTTPException(status_code=504, detail="OCR inference timed out")
        if not lines:
            raise HTTPException(status_code=422, detail="No text recognized")
        avg_final = sum(l["confidence"] for l in lines) / len(lines) if lines else 0.0
        logger.info("req done: lines=%d avg_conf=%.1f%% total=%.1fs", len(lines), avg_final, time.monotonic() - t_req)
        return {"text": "\n".join(line["text"] for line in lines), "confidence": round(avg_final, 2), "lines": lines}
    finally:
        base = resized_path or image_path
        cleanup_paths = {
            image_path,
            base,
            f"{base}-bright-region.jpg",
            f"{base}-thresh.jpg",
        }
        for path in cleanup_paths:
            if os.path.exists(path):
                os.unlink(path)
