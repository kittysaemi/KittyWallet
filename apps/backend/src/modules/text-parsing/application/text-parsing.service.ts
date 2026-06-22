import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { ReceiptTransactionTextParser } from "./receipt-transaction-text-parser";
import type { TextParseProfile, TextParseResult, TextParseSourceType } from "./text-parser.types";

@Injectable()
export class TextParsingService {
  constructor(private readonly receiptParser: ReceiptTransactionTextParser, private readonly prisma: PrismaService) {}

  parse(profile: TextParseProfile, text: string): TextParseResult {
    if (!text.trim()) throw new BadRequestException({ code: "TEXT_PARSE_TEXT_REQUIRED", message: "분석할 텍스트가 필요합니다." });
    if (profile === this.receiptParser.profile) return this.receiptParser.parse(text);
    throw new BadRequestException({ code: "TEXT_PARSE_PROFILE_UNSUPPORTED", message: "지원하지 않는 파서 profile입니다." });
  }

  async saveTrainingSample(input: { userId: bigint; profile: TextParseProfile; sourceType: TextParseSourceType; sourceText: string; finalDraft: Record<string, unknown>; parserVersion: string }) {
    if (!input.sourceText.trim()) return;
    await this.prisma.textParseTrainingSample.create({ data: { ...input, finalDraft: input.finalDraft as Prisma.InputJsonValue } });
  }
}
