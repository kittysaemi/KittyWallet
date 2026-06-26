import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fileTypeFromBuffer } from "file-type";
import heicConvert from "heic-convert";
import sharp from "sharp";
import type { Sharp } from "sharp";
import cv from "@techstark/opencv-js";
import {
  RECEIPT_IMAGE_MIME_TYPES,
  type NormalizedReceiptImage,
  type ReceiptImageMimeType,
  type ReceiptImageNormalizer
} from "../application/receipt-image.types";
import {
  ReceiptImageInvalidException,
  ReceiptImageRequiredException,
  ReceiptImageTooLargeException,
  ReceiptImageUnsupportedException
} from "../application/receipt-image-normalization.error";

const DEFAULT_MAX_INPUT_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_MAX_PIXELS = 24_000_000;
const DARK_PIXEL_THRESHOLD = 80;
const BRIGHT_PIXEL_THRESHOLD = 185;
const DARK_BACKGROUND_RATIO = 0.65;
const MAX_BRIGHT_TEXT_RATIO = 0.25;
const MIN_BRIGHT_TEXT_RATIO = 0.005;
const DOCUMENT_DETECT_SIZE = 800;
const DOCUMENT_WARP_SIZE = 1600;
const DOCUMENT_MIN_AREA_RATIO = 0.20;

let cvInitPromise: Promise<void> | null = null;

function ensureOpenCV(): Promise<void> {
  if (!cvInitPromise) {
    cvInitPromise = new Promise<void>((resolve) => {
      if (typeof (cv as Record<string, unknown>)["Mat"] === "function") {
        resolve();
      } else {
        (cv as unknown as { onRuntimeInitialized: () => void }).onRuntimeInitialized = resolve;
      }
    });
  }
  return cvInitPromise;
}

function orderPoints(
  pts: [number, number][]
): [[number, number], [number, number], [number, number], [number, number]] {
  const sums = pts.map(([x, y]) => x + y);
  const diffs = pts.map(([x, y]) => x - y);
  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const tr = pts[diffs.indexOf(Math.min(...diffs))];
  const bl = pts[diffs.indexOf(Math.max(...diffs))];
  return [tl, tr, br, bl];
}

@Injectable()
export class SharpReceiptImageNormalizer implements ReceiptImageNormalizer, OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await ensureOpenCV();
  }

  async normalize(input: Buffer, isCamera?: boolean): Promise<NormalizedReceiptImage> {
    if (!input?.length) throw new ReceiptImageRequiredException();

    const maxInputBytes = this.getPositiveNumber("OCR_MAX_INPUT_FILE_BYTES", DEFAULT_MAX_INPUT_BYTES);
    if (input.length > maxInputBytes) throw new ReceiptImageTooLargeException();

    const detected = await fileTypeFromBuffer(input);
    if (!detected || !RECEIPT_IMAGE_MIME_TYPES.includes(detected.mime as ReceiptImageMimeType)) {
      throw new ReceiptImageUnsupportedException();
    }

    try {
      const maxDimension = this.getPositiveNumber("OCR_MAX_IMAGE_DIMENSION", DEFAULT_MAX_DIMENSION);
      const isHEIC = detected.mime === "image/heic" || detected.mime === "image/heif";
      const decodedInput = isHEIC
        ? Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.9 }))
        : input;
      const image = sharp(decodedInput, { failOn: "error", limitInputPixels: DEFAULT_MAX_PIXELS }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) throw new ReceiptImageInvalidException();

      // Use the frontend hint when provided (most reliable — set before canvas strips EXIF).
      // Fallback: HEIC is always a camera photo; PNG is always a screenshot; JPEG without
      // a hint falls back to EXIF presence (only works when canvas compression was skipped).
      const isPNG = detected.mime === "image/png";
      const isCameraPhoto = isCamera !== undefined
        ? isCamera
        : isHEIC || (!isPNG && !!metadata.exif);

      // Skip perspective warp for camera photos: natural backgrounds produce false quad
      // detections and warpPerspective distorts the receipt instead of correcting it.
      const cropped = isCameraPhoto ? image : await this.cropToDocumentBounds(image, metadata.width, metadata.height);
      const resized = cropped.resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });
      const shouldInvert = await this.isDarkBackgroundWithLightText(resized);
      const prepared = shouldInvert ? resized.clone().negate({ alpha: false }).normalize() : resized;

      const output = await prepared
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      const maxOutputBytes = this.getPositiveNumber("OCR_MAX_NORMALIZED_FILE_BYTES", DEFAULT_MAX_OUTPUT_BYTES);
      if (output.data.length > maxOutputBytes) throw new ReceiptImageTooLargeException();

      return {
        buffer: output.data,
        mimeType: "image/jpeg",
        width: output.info.width,
        height: output.info.height,
        isCamera: isCameraPhoto
      };
    } catch (error) {
      if (
        error instanceof ReceiptImageInvalidException ||
        error instanceof ReceiptImageTooLargeException
      ) {
        throw error;
      }
      throw new ReceiptImageInvalidException();
    }
  }

  private getPositiveNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private async cropToDocumentBounds(image: Sharp, origWidth: number, origHeight: number): Promise<Sharp> {
    try {
      await ensureOpenCV();

      const detectRaw = await image
        .clone()
        .resize({ width: DOCUMENT_DETECT_SIZE, height: DOCUMENT_DETECT_SIZE, fit: "inside", withoutEnlargement: true })
        .removeAlpha()
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width: dw, height: dh } = detectRaw.info;
      const quad = this.findDocumentQuad(detectRaw.data, dw, dh);
      if (!quad) return image;

      const sx = origWidth / dw;
      const sy = origHeight / dh;
      const origQuad = quad.map(([x, y]) => [x * sx, y * sy]) as [number, number][];

      const warpRaw = await image
        .clone()
        .resize({ width: DOCUMENT_WARP_SIZE, height: DOCUMENT_WARP_SIZE, fit: "inside", withoutEnlargement: true })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width: ww, height: wh } = warpRaw.info;
      const wsx = ww / origWidth;
      const wsy = wh / origHeight;
      const [tl, tr, br, bl] = origQuad.map(([x, y]) => [x * wsx, y * wsy]) as [number, number][];

      const outW = Math.round(Math.max(
        Math.hypot(tr[0] - tl[0], tr[1] - tl[1]),
        Math.hypot(br[0] - bl[0], br[1] - bl[1])
      ));
      const outH = Math.round(Math.max(
        Math.hypot(bl[0] - tl[0], bl[1] - tl[1]),
        Math.hypot(br[0] - tr[0], br[1] - tr[1])
      ));
      if (outW < 64 || outH < 64) return image;

      const src = new cv.Mat(wh, ww, cv.CV_8UC3);
      src.data.set(warpRaw.data);

      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl[0], tl[1], tr[0], tr[1], br[0], br[1], bl[0], bl[1]
      ]);
      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, outW - 1, 0, outW - 1, outH - 1, 0, outH - 1
      ]);
      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(outW, outH));

      const resultBuffer = Buffer.from(warped.data);
      src.delete();
      srcPts.delete();
      dstPts.delete();
      M.delete();
      warped.delete();

      return sharp(resultBuffer, { raw: { width: outW, height: outH, channels: 3 } });
    } catch {
      return image;
    }
  }

  private findDocumentQuad(
    grayData: Uint8Array | Buffer,
    width: number,
    height: number
  ): [[number, number], [number, number], [number, number], [number, number]] | null {
    const totalArea = width * height;

    const gray = new cv.Mat(height, width, cv.CV_8UC1);
    gray.data.set(grayData);

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    gray.delete();

    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);
    blurred.delete();

    const dilated = new cv.Mat();
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, dilated, kernel);
    edges.delete();
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    dilated.delete();
    hierarchy.delete();

    let bestPts: [number, number][] | null = null;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area < totalArea * DOCUMENT_MIN_AREA_RATIO) continue;

      const perim = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * perim, true);

      if (approx.rows === 4 && area > bestArea) {
        const pts: [number, number][] = [];
        for (let j = 0; j < 4; j++) {
          pts.push([approx.data32S[j * 2], approx.data32S[j * 2 + 1]]);
        }
        bestPts = pts;
        bestArea = area;
      }
      approx.delete();
    }
    contours.delete();

    return bestPts ? orderPoints(bestPts) : null;
  }

  private async isDarkBackgroundWithLightText(image: Sharp): Promise<boolean> {
    const preview = await image
      .clone()
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = preview.info.width * preview.info.height;
    if (!totalPixels) return false;

    let darkPixels = 0;
    let brightPixels = 0;
    for (const value of preview.data) {
      if (value <= DARK_PIXEL_THRESHOLD) darkPixels += 1;
      if (value >= BRIGHT_PIXEL_THRESHOLD) brightPixels += 1;
    }

    const darkRatio = darkPixels / totalPixels;
    const brightRatio = brightPixels / totalPixels;

    return (
      darkRatio >= DARK_BACKGROUND_RATIO &&
      brightRatio >= MIN_BRIGHT_TEXT_RATIO &&
      brightRatio <= MAX_BRIGHT_TEXT_RATIO
    );
  }
}
