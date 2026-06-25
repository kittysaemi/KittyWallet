import { UnprocessableEntityException } from "@nestjs/common";

jest.mock("../infrastructure/sharp-receipt-image.normalizer", () => ({
  SharpReceiptImageNormalizer: class { normalize = jest.fn(); }
}));

import { ReceiptAnalysisService } from "./receipt-analysis.service";
import type { SharpReceiptImageNormalizer } from "../infrastructure/sharp-receipt-image.normalizer";
import type { ReceiptOcrProviderFactory } from "./receipt-ocr-provider.factory";
import type { TextParsingService } from "../../text-parsing/application/text-parsing.service";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";
import type { TextParseResult } from "../../text-parsing/application/text-parser.types";

const fakeNormalized: NormalizedReceiptImage = {
  buffer: Buffer.from("img"),
  mimeType: "image/jpeg",
  width: 100,
  height: 100
};

const fakeParseResult: TextParseResult = {
  profile: "receipt-transaction",
  fields: {
    transactionDate: { value: "2026-06-22", confidence: 0.91 },
    totalAmount: { value: 12800, confidence: 0.74, currency: "KRW" }
  },
  items: [],
  warnings: [],
  parserVersion: "1"
};

const makeService = (overrides: {
  ocrText?: string;
  ocrConfidence?: number;
  parseResult?: TextParseResult;
} = {}) => {
  const normalizer = { normalize: jest.fn().mockResolvedValue(fakeNormalized) };
  const provider = { analyze: jest.fn().mockResolvedValue({ text: overrides.ocrText ?? "합계 12,800원", confidence: overrides.ocrConfidence ?? 80 }) };
  const providerFactory = { getProvider: jest.fn().mockReturnValue(provider) };
  const textParsingService = { parse: jest.fn().mockReturnValue(overrides.parseResult ?? fakeParseResult) };

  const service = new ReceiptAnalysisService(
    normalizer as unknown as SharpReceiptImageNormalizer,
    providerFactory as unknown as ReceiptOcrProviderFactory,
    textParsingService as unknown as TextParsingService
  );

  return { service, normalizer, provider, providerFactory, textParsingService };
};

describe("ReceiptAnalysisService.preprocessOcrText", () => {
  const { service } = makeService();
  const preprocess = (text: string) =>
    (service as unknown as { preprocessOcrText(t: string): string }).preprocessOcrText(text);

  it("removes control characters", () => {
    expect(preprocess("hello\x01\x1Fworld")).toBe("hello world");
  });

  it("converts full-width comma and period", () => {
    expect(preprocess("가격，1，000。")).toBe("가격,1,000.");
  });

  it("converts full-width space to regular space", () => {
    expect(preprocess("카드　결제")).toBe("카드 결제");
  });

  it("splits merged Korean label and amount onto separate lines", () => {
    const result = preprocess("합계 12,800");
    const lines = result.split("\n");
    expect(lines[0]).toContain("합계");
    expect(lines[1]).toContain("12,800");
  });

  it("splits amount followed by Korean text onto separate lines", () => {
    const lines = preprocess("12,800원 상품명").split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("12,800원");
    expect(lines[1]).toContain("상품명");
  });

  it("removes empty lines", () => {
    expect(preprocess("line1\n\n\nline2")).toBe("line1\nline2");
  });

  it("trims and collapses inner whitespace per line", () => {
    const result = preprocess("  합계   12,800  ");
    expect(result).not.toMatch(/\s{2,}/);
    expect(result.startsWith(" ")).toBe(false);
  });
});

describe("ReceiptAnalysisService.analyze", () => {
  const fakeImage = Buffer.from("image");

  it("returns draft with sourceType and no retry flags on success", async () => {
    const { service } = makeService();
    const result = await service.analyze(fakeImage);

    expect(result.sourceType).toBe("OCR_IMAGE");
    expect(result.analysisQuality.retryRecommended).toBe(false);
    expect(result.analysisQuality.reasons).toHaveLength(0);
  });

  it("includes sourceText from raw OCR output", async () => {
    const { service } = makeService({ ocrText: "합계 12,800원" });
    const result = await service.analyze(fakeImage);

    expect(result.sourceText).toBe("합계 12,800원");
  });

  it("sets LOW_CONFIDENCE reason when OCR confidence is below 65", async () => {
    const { service } = makeService({ ocrConfidence: 50 });
    const result = await service.analyze(fakeImage);

    expect(result.analysisQuality.retryRecommended).toBe(true);
    expect(result.analysisQuality.reasons).toContain("LOW_CONFIDENCE");
  });

  it("sets MISSING_CORE_FIELDS reason when date and amount are both absent", async () => {
    const emptyFields: TextParseResult = { ...fakeParseResult, fields: {} };
    const { service } = makeService({ parseResult: emptyFields });
    const result = await service.analyze(fakeImage);

    expect(result.analysisQuality.retryRecommended).toBe(true);
    expect(result.analysisQuality.reasons).toContain("MISSING_CORE_FIELDS");
  });

  it("does not set MISSING_CORE_FIELDS when only date is present", async () => {
    const dateOnly: TextParseResult = {
      ...fakeParseResult,
      fields: { transactionDate: { value: "2026-06-22", confidence: 0.9 } }
    };
    const { service } = makeService({ parseResult: dateOnly });
    const result = await service.analyze(fakeImage);

    expect(result.analysisQuality.reasons).not.toContain("MISSING_CORE_FIELDS");
  });

  it("throws UnprocessableEntityException when OCR returns empty text", async () => {
    const { service } = makeService({ ocrText: "" });
    await expect(service.analyze(fakeImage)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("passes preprocessed text to parser, not raw OCR text", async () => {
    const rawText = "합계\x01 12,800";
    const { service, textParsingService } = makeService({ ocrText: rawText });

    await service.analyze(fakeImage);

    const passedText = textParsingService.parse.mock.calls[0][1] as string;
    expect(passedText).not.toContain("\x01");
  });
});
