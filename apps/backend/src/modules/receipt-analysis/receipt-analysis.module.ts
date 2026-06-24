import { Module } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "./infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./application/receipt-ocr-provider.factory";
import { TesseractJsReceiptOcrProvider } from "./infrastructure/tesseract-js-receipt-ocr.provider";
import { ReceiptAnalysisService } from "./application/receipt-analysis.service";
import { ReceiptAnalysisController } from "./presentation/receipt-analysis.controller";
import { TextParsingModule } from "../text-parsing/text-parsing.module";
import { PaddleOcrReceiptOcrProvider } from "./infrastructure/paddle-ocr-receipt-ocr.provider";

@Module({
  controllers: [ReceiptAnalysisController],
  imports: [TextParsingModule],
  providers: [SharpReceiptImageNormalizer, TesseractJsReceiptOcrProvider, PaddleOcrReceiptOcrProvider, ReceiptOcrProviderFactory, ReceiptAnalysisService],
  exports: [SharpReceiptImageNormalizer, ReceiptOcrProviderFactory]
})
export class ReceiptAnalysisModule {}
