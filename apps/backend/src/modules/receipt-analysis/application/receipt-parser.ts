import { Injectable } from "@nestjs/common";
import type { ReceiptOcrResult } from "./receipt-ocr.types";

export interface ReceiptDraft {
  merchant?: string;
  transactionDate?: string;
  totalAmount?: number;
  currency?: "KRW";
  memoItems: string[];
  warnings: string[];
}

export interface ReceiptParser {
  parse(result: ReceiptOcrResult): ReceiptDraft;
}

const TOTAL_LABEL = /(합s*계|총s*액|결제s*금액|받s*은s*금액)/i;
const DATE_PATTERN = /\b(20\d{2})[.\-/년\s]+(0?[1-9]|1[0-2])[.\-/월\s]+(0?[1-9]|[12]\d|3[01])\s*일?\b/;
const AMOUNT_PATTERN = /(?:₩|KRW)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})+|[0-9]+)\s*(?:원|KRW)?/i;

@Injectable()
export class KoreanReceiptParser implements ReceiptParser {
  parse(result: ReceiptOcrResult): ReceiptDraft {
    const lines = result.text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const warnings: string[] = [];
    const totalCandidates = lines
      .filter((line) => TOTAL_LABEL.test(line))
      .map((line) => this.toAmount(line))
      .filter((amount): amount is number => amount !== undefined);

    const date = lines.map((line) => this.toDate(line)).find((value) => value !== undefined);
    if (!date) warnings.push("거래 날짜를 확인해 주세요.");
    if (totalCandidates.length !== 1) warnings.push("결제 금액을 확인해 주세요.");

    const merchant = lines.find((line) => this.isMerchantCandidate(line));
    if (!merchant) warnings.push("상호명을 확인해 주세요.");

    return {
      merchant,
      transactionDate: date,
      totalAmount: totalCandidates.length === 1 ? totalCandidates[0] : undefined,
      currency: totalCandidates.length ? "KRW" : undefined,
      memoItems: this.extractMemoItems(lines),
      warnings
    };
  }

  private toDate(line: string): string | undefined {
    const match = line.match(DATE_PATTERN);
    if (!match) return undefined;
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  private toAmount(line: string): number | undefined {
    const match = line.match(AMOUNT_PATTERN);
    if (!match) return undefined;
    const value = Number(match[1].replace(/[\s,]/g, ""));
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }

  private isMerchantCandidate(line: string): boolean {
    return !TOTAL_LABEL.test(line) && !DATE_PATTERN.test(line) && !AMOUNT_PATTERN.test(line) && line.length >= 2 && line.length <= 40;
  }

  private extractMemoItems(lines: string[]): string[] {
    return [...new Set(lines.filter((line) => this.isMerchantCandidate(line)).slice(1, 9))]
      .map((line) => line.replace(/\s{2,}.*/, "").trim())
      .filter((line) => line.length >= 2 && line.length <= 40);
  }
}
