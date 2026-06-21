import { Module } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "./infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./application/receipt-ocr-provider.factory";
import { TesseractJsReceiptOcrProvider } from "./infrastructure/tesseract-js-receipt-ocr.provider";
import { KoreanReceiptParser } from "./application/receipt-parser";

@Module({
  providers: [SharpReceiptImageNormalizer, TesseractJsReceiptOcrProvider, ReceiptOcrProviderFactory, KoreanReceiptParser],
  exports: [SharpReceiptImageNormalizer, ReceiptOcrProviderFactory, KoreanReceiptParser]
})
export class ReceiptAnalysisModule {}
