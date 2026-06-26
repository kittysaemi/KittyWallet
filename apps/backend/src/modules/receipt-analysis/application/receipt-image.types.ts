export const RECEIPT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
] as const;

export type ReceiptImageMimeType = (typeof RECEIPT_IMAGE_MIME_TYPES)[number];

export interface NormalizedReceiptImage {
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  isCamera?: boolean;
}

export interface ReceiptImageNormalizer {
  normalize(input: Buffer): Promise<NormalizedReceiptImage>;
}
