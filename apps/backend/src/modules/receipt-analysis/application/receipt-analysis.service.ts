import { Injectable, Logger, UnprocessableEntityException } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "../infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./receipt-ocr-provider.factory";
import { TextParsingService } from "../../text-parsing/application/text-parsing.service";

@Injectable()
export class ReceiptAnalysisService {
  private readonly logger = new Logger(ReceiptAnalysisService.name);
  constructor(
    private readonly normalizer: SharpReceiptImageNormalizer,
    private readonly providerFactory: ReceiptOcrProviderFactory,
    private readonly textParsingService: TextParsingService
  ) {}

  async analyze(image: Buffer) {
    try {
      const normalized = await this.normalizer.normalize(image);
      const ocr = await this.providerFactory.getProvider().analyze(normalized);
      if (!ocr.text) {
        throw new UnprocessableEntityException({ code: "RECEIPT_ANALYSIS_FAILED", message: "영수증 내용을 읽을 수 없습니다." });
      }
      const draft = this.textParsingService.parse("receipt-transaction", ocr.text);
      const missingCoreFields = !draft.fields.transactionDate && !draft.fields.totalAmount;
      const retryReasons = [
        ...(ocr.confidence < 65 ? ["LOW_CONFIDENCE"] : []),
        ...(missingCoreFields ? ["MISSING_CORE_FIELDS"] : [])
      ] as const;

      return {
        ...draft,
        analysisQuality: {
          retryRecommended: retryReasons.length > 0,
          reasons: retryReasons
        },
        sourceText: ocr.text,
        sourceType: "OCR_IMAGE" as const
      };
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : "receipt analysis failed");
      throw error;
    }
  }
}
