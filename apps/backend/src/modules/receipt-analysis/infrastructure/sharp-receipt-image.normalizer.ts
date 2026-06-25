import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fileTypeFromBuffer } from "file-type";
import heicConvert from "heic-convert";
import sharp from "sharp";
import type { Sharp } from "sharp";
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

@Injectable()
export class SharpReceiptImageNormalizer implements ReceiptImageNormalizer {
  constructor(private readonly configService: ConfigService) {}

  async normalize(input: Buffer): Promise<NormalizedReceiptImage> {
    if (!input?.length) throw new ReceiptImageRequiredException();

    const maxInputBytes = this.getPositiveNumber("OCR_MAX_INPUT_FILE_BYTES", DEFAULT_MAX_INPUT_BYTES);
    if (input.length > maxInputBytes) throw new ReceiptImageTooLargeException();

    const detected = await fileTypeFromBuffer(input);
    if (!detected || !RECEIPT_IMAGE_MIME_TYPES.includes(detected.mime as ReceiptImageMimeType)) {
      throw new ReceiptImageUnsupportedException();
    }

    try {
      const maxDimension = this.getPositiveNumber("OCR_MAX_IMAGE_DIMENSION", DEFAULT_MAX_DIMENSION);
      const decodedInput =
        detected.mime === "image/heic" || detected.mime === "image/heif"
          ? Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.9 }))
          : input;
      const image = sharp(decodedInput, { failOn: "error", limitInputPixels: DEFAULT_MAX_PIXELS }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) throw new ReceiptImageInvalidException();

      const resized = image.resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });
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
        height: output.info.height
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
