import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";
import type { ReceiptOcrProvider, ReceiptOcrResult } from "../application/receipt-ocr.types";

@Injectable()
export class PaddleOcrReceiptOcrProvider implements ReceiptOcrProvider {
  readonly id = "paddle";
  private readonly logger = new Logger(PaddleOcrReceiptOcrProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult> {
    const serviceUrl = this.configService.get<string>("PADDLE_OCR_URL") ?? "http://ocr:8000";
    const timeoutMs = Number(this.configService.get<string>("OCR_TIMEOUT_MS") ?? 180_000);
    const form = new FormData();
    form.append("image", new Blob([Uint8Array.from(image.buffer)], { type: image.mimeType }), "receipt.jpg");
    let response: Response;
    try {
      response = await fetch(`${serviceUrl}/v1/ocr`, { method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new ServiceUnavailableException({ code: "RECEIPT_OCR_PROVIDER_UNAVAILABLE", message: "PaddleOCR 서비스를 사용할 수 없습니다." });
    }
    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 500);
      this.logger.error(`PaddleOCR request failed: status=${response.status}, detail=${detail || "(empty response)"}`);
      throw new ServiceUnavailableException({ code: "RECEIPT_ANALYSIS_FAILED", message: "PaddleOCR 분석에 실패했습니다." });
    }
    return response.json() as Promise<ReceiptOcrResult>;
  }
}
