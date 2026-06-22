import { Injectable, Logger, UnprocessableEntityException } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "../infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./receipt-ocr-provider.factory";
import { KoreanReceiptParser } from "./receipt-parser";

@Injectable()
export class ReceiptAnalysisService {
  private readonly logger = new Logger(ReceiptAnalysisService.name);
  constructor(
    private readonly normalizer: SharpReceiptImageNormalizer,
    private readonly providerFactory: ReceiptOcrProviderFactory,
    private readonly parser: KoreanReceiptParser
  ) {}

  async analyze(image: Buffer) {
    try {
      const normalized = await this.normalizer.normalize(image);
      const ocr = await this.providerFactory.getProvider().analyze(normalized);
      if (!ocr.text) {
        throw new UnprocessableEntityException({ code: "RECEIPT_ANALYSIS_FAILED", message: "영수증 내용을 읽을 수 없습니다." });
      }
      return this.parser.parse(ocr);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : "receipt analysis failed");
      throw error;
    }
  }
}
