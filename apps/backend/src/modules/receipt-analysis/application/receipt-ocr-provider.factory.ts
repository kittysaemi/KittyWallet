import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReceiptOcrProvider } from "./receipt-ocr.types";
import { TesseractJsReceiptOcrProvider } from "../infrastructure/tesseract-js-receipt-ocr.provider";
import { PaddleOcrReceiptOcrProvider } from "../infrastructure/paddle-ocr-receipt-ocr.provider";

@Injectable()
export class ReceiptOcrProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly tesseractProvider: TesseractJsReceiptOcrProvider,
    private readonly paddleProvider: PaddleOcrReceiptOcrProvider
  ) {}

  getProvider(): ReceiptOcrProvider {
    const provider = (this.configService.get<string>("OCR_PROVIDER") ?? "tesseract").toLowerCase();
    if (provider === this.tesseractProvider.id) return this.tesseractProvider;
    if (provider === this.paddleProvider.id) return this.paddleProvider;
    throw new ServiceUnavailableException({
      code: "RECEIPT_OCR_PROVIDER_UNAVAILABLE",
      message: "설정된 영수증 분석 서비스를 사용할 수 없습니다."
    });
  }
}
