import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fileTypeFromBuffer } from "file-type";
import heicConvert from "heic-convert";
import sharp from "sharp";
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

      const output = await image
        .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
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
}
