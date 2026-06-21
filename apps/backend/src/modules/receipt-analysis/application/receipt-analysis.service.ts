import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { SharpReceiptImageNormalizer } from "../infrastructure/sharp-receipt-image.normalizer";
import { ReceiptOcrProviderFactory } from "./receipt-ocr-provider.factory";
import { KoreanReceiptParser } from "./receipt-parser";

@Injectable()
export class ReceiptAnalysisService {
  constructor(
    private readonly normalizer: SharpReceiptImageNormalizer,
    private readonly providerFactory: ReceiptOcrProviderFactory,
    private readonly parser: KoreanReceiptParser
  ) {}

  async analyze(image: Buffer) {
    const normalized = await this.normalizer.normalize(image);
    const ocr = await this.providerFactory.getProvider().analyze(normalized);
    if (!ocr.text) {
      throw new UnprocessableEntityException({ code: "RECEIPT_ANALYSIS_FAILED", message: "영수증 내용을 읽을 수 없습니다." });
    }
    return this.parser.parse(ocr);
  }
}
