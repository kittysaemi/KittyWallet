import { Injectable } from "@nestjs/common";
import type { TextParserProfileHandler, TextParseResult } from "./text-parser.types";

const DATE_PATTERN = /\b(20\d{2})[.\-/\s]+(0?[1-9]|1[0-2])[.\-/\s]+(0?[1-9]|[12]\d|3[01])\b/;
const COMPACT_DATETIME_PATTERN = /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])(?:[0-5]\d){2}\b/;
const AMOUNT_PATTERN = /(?:₩|KRW)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})+|[0-9]+)\s*(?:원|KRW)?/i;
const TOTAL_LABEL = /(합계|총액|결제\s*금액|판매\s*금액|매출액|받을\s*금액|지불\s*금액)/;
const DATE_LABEL = /(주문\s*날짜|거래\s*날짜|결제\s*날짜|승인\s*일시)/;
const ITEM_LABEL = /(상품명|품목|상품\s*내역)/;
const EXCLUDED_LABEL = /(주문\s*번호|회사명|서명)/;

@Injectable()
export class ReceiptTransactionTextParser implements TextParserProfileHandler {
  readonly profile = "receipt-transaction" as const;

  parse(text: string): TextParseResult {
    const rawLines = text.split(/\r?\n/).filter((line) => line.trim());
    const lines = rawLines.map((line) => line.replace(/\s+/g, " ").trim());
    const warnings: string[] = [];
    const excludedIndexes = this.getExcludedIndexes(lines);
    const labeledDate = this.findLabeledValues(lines, DATE_LABEL)[0];
    const date = (labeledDate ? this.toDate(labeledDate) : undefined) ?? lines.map((line) => this.toDate(line)).find(Boolean);
    const labeledAmounts = this.findLabeledValues(lines, TOTAL_LABEL);
    const totalCandidates = (labeledAmounts.length ? labeledAmounts.map((value) => this.toAmount(value)) : lines.filter((line) => TOTAL_LABEL.test(line)).map((line) => this.toAmount(line))).filter((value): value is number => value !== undefined);
    const merchant = lines.find((line, index) => this.isTextCandidate(line, excludedIndexes.has(index)));
    const labeledItems = this.findProductItems(lines, rawLines);
    const itemValues = labeledItems.length ? labeledItems : lines.filter((line, index) => this.isTextCandidate(line, excludedIndexes.has(index))).slice(1, 9);
    const items = [...new Set(itemValues)].map((value) => ({ value, confidence: labeledItems.length ? 0.7 : 0.4 }));

    if (!date) warnings.push("거래 날짜를 확인해 주세요.");
    if (totalCandidates.length !== 1) warnings.push("결제 금액을 확인해 주세요.");
    if (!merchant) warnings.push("상호명을 확인해 주세요.");

    return {
      profile: this.profile,
      fields: {
        ...(date ? { transactionDate: { value: date, confidence: 0.6 } } : {}),
        ...(totalCandidates.length === 1 ? { totalAmount: { value: totalCandidates[0], confidence: 0.55, currency: "KRW" as const } } : {}),
        ...(merchant ? { merchant: { value: merchant, confidence: 0.35 } } : {})
      },
      items,
      warnings,
      parserVersion: "receipt-rule-v1"
    };
  }

  private toDate(line: string): string | undefined {
    const match = line.match(DATE_PATTERN);
    if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    const compactMatch = line.match(COMPACT_DATETIME_PATTERN);
    return compactMatch ? `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}` : undefined;
  }

  private toAmount(line: string): number | undefined {
    const match = line.match(AMOUNT_PATTERN);
    const value = match ? Number(match[1].replace(/[\s,]/g, "")) : NaN;
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }

  private findLabeledValues(lines: string[], label: RegExp): string[] {
    const values: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!label.test(lines[index])) continue;
      const valueOnSameLine = lines[index].replace(label, "").replace(/^[:：\s]+/, "").trim();
      const value = valueOnSameLine || lines[index + 1];
      if (value) values.push(value);
    }
    return values;
  }

  private findProductItems(lines: string[], rawLines: string[]): string[] {
    const items: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!ITEM_LABEL.test(lines[index])) continue;
      const valueOnSameLine = lines[index].replace(ITEM_LABEL, "").replace(/^[:：\s]+/, "").trim();
      if (/(단가|수량|금액)/.test(valueOnSameLine)) {
        const productName = this.extractProductName(rawLines[index + 1]);
        if (productName) items.push(productName);
        continue;
      }
      if (valueOnSameLine) items.push(valueOnSameLine);
      else if (lines[index + 1]) items.push(lines[index + 1]);
    }
    return items;
  }

  private extractProductName(rawLine: string | undefined): string | undefined {
    if (!rawLine) return undefined;
    const cells = rawLine.trim().split(/\t+|\s{2,}/).filter(Boolean);
    const numericCellIndex = cells.findIndex((cell) => /(?:₩|￦)?\s*\d{1,3}(?:,\d{3})+/.test(cell));
    if (numericCellIndex > 0) return cells.slice(0, numericCellIndex).join(" ").replace(/\s+/g, " ").trim();
    const amountStart = rawLine.search(/(?:₩|￦)?\s*\d{1,3}(?:,\d{3})+/);
    return amountStart > 0 ? rawLine.slice(0, amountStart).replace(/\s+/g, " ").trim() : undefined;
  }

  private getExcludedIndexes(lines: string[]): Set<number> {
    const excluded = new Set<number>();
    lines.forEach((line, index) => {
      if (EXCLUDED_LABEL.test(line)) {
        excluded.add(index);
        excluded.add(index + 1);
      }
    });
    return excluded;
  }

  private isTextCandidate(line: string, isExcluded = false): boolean {
    return !isExcluded && !TOTAL_LABEL.test(line) && !DATE_LABEL.test(line) && !ITEM_LABEL.test(line) && !EXCLUDED_LABEL.test(line) && !DATE_PATTERN.test(line) && !COMPACT_DATETIME_PATTERN.test(line) && !AMOUNT_PATTERN.test(line) && line.length >= 2 && line.length <= 80;
  }
}
