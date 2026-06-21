import { Module } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "./infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./application/receipt-ocr-provider.factory";
import { TesseractJsReceiptOcrProvider } from "./infrastructure/tesseract-js-receipt-ocr.provider";

@Module({
  providers: [SharpReceiptImageNormalizer, TesseractJsReceiptOcrProvider, ReceiptOcrProviderFactory],
  exports: [SharpReceiptImageNormalizer, ReceiptOcrProviderFactory]
})
export class ReceiptAnalysisModule {}
