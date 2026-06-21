import { Module } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "./infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./application/receipt-ocr-provider.factory";
import { TesseractJsReceiptOcrProvider } from "./infrastructure/tesseract-js-receipt-ocr.provider";
import { KoreanReceiptParser } from "./application/receipt-parser";
import { ReceiptAnalysisService } from "./application/receipt-analysis.service";
import { ReceiptAnalysisController } from "./presentation/receipt-analysis.controller";

@Module({
  controllers: [ReceiptAnalysisController],
  providers: [SharpReceiptImageNormalizer, TesseractJsReceiptOcrProvider, ReceiptOcrProviderFactory, KoreanReceiptParser, ReceiptAnalysisService],
  exports: [SharpReceiptImageNormalizer, ReceiptOcrProviderFactory, KoreanReceiptParser]
})
export class ReceiptAnalysisModule {}
