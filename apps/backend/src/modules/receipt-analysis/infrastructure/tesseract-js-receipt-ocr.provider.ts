import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWorker } from "tesseract.js";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";
import type { ReceiptOcrProvider, ReceiptOcrResult } from "../application/receipt-ocr.types";

@Injectable()
export class TesseractJsReceiptOcrProvider implements ReceiptOcrProvider {
  readonly id = "tesseract";

  constructor(private readonly configService: ConfigService) {}

  async analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult> {
    const languages = this.configService.get<string>("OCR_LANGUAGES") ?? "kor+eng";
    const worker = await createWorker(languages);
    try {
      const result = await worker.recognize(image.buffer);
      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence
      };
    } finally {
      await worker.terminate();
    }
  }
}
