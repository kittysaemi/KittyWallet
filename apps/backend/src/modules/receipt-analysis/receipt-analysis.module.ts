import { Module } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "./infrastructure/sharp-receipt-image.normalizer";

@Module({
  providers: [SharpReceiptImageNormalizer],
  exports: [SharpReceiptImageNormalizer]
})
export class ReceiptAnalysisModule {}
