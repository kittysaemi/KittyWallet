import type { NormalizedReceiptImage } from "./receipt-image.types";

export interface ReceiptOcrResult {
  text: string;
  confidence: number;
  lines?: Array<{ text: string; confidence: number }>;
}

export interface ReceiptOcrProvider {
  readonly id: string;
  analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult>;
}
