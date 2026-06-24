import { Injectable } from "@nestjs/common";
import type { TextParserProfileHandler, TextParseResult } from "./text-parser.types";

const DATE_PATTERN = /\b(20\d{2})[.\-/\s]+(0?[1-9]|1[0-2])[.\-/\s]+(0?[1-9]|[12]\d|3[01])(?:\s*[-.:;]?\s*(?:[01]\d|2[0-3])(?:[:;.]?[0-5]\d){1,2})?(?!\d)/;
const SHORT_DATE_PATTERN = /\b(\d{2})[.\-/\s]+(0?[1-9]|1[0-2])[.\-/\s]+(0?[1-9]|[12]\d|3[01])(?:\s*[-.:;]?\s*(?:[01]\d|2[0-3])(?:[:;.]?[0-5]\d){1,2})?(?!\d)/;
const COMPACT_DATETIME_PATTERN = /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])(?:[0-5]\d){2}\b/;
const AMOUNT_PATTERN = /(?:₩|KRW)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})+|[0-9]+)\s*(?:원|KRW)?/i;
const OCR_LABEL_SEPARATOR = "[\\s_'＿\":;,\\-\\]】）)〉》>]*";
const SALES_AMOUNT_LABEL = new RegExp(`(판[매미]${OCR_LABEL_SEPARATOR}금${OCR_LABEL_SEPARATOR}액)`);
const TOTAL_LABELS = [
  new RegExp(`(총${OCR_LABEL_SEPARATOR}합${OCR_LABEL_SEPARATOR}계|결${OCR_LABEL_SEPARATOR}제${OCR_LABEL_SEPARATOR}금${OCR_LABEL_SEPARATOR}액|매출${OCR_LABEL_SEPARATOR}액)`),
  new RegExp(`(합${OCR_LABEL_SEPARATOR}계|총${OCR_LABEL_SEPARATOR}액|결제${OCR_LABEL_SEPARATOR}금액|받을${OCR_LABEL_SEPARATOR}금액|지불${OCR_LABEL_SEPARATOR}금액)`)
];
const DATE_LABELS = [/(거래\s*일시|결제\s*일시|승인\s*일시)/, /(거래\s*일|거래\s*날짜|주문\s*날짜|결제\s*날짜)/];
const PRODUCT_LABEL = /(상품명|품목|상품\s*내역|구매처)/;
const MERCHANT_LABEL = /(공급자명|상호|가맹점명)/;
const EXCLUDED_LABEL = /(주문\s*번호|회사명|서명)/;
const NON_MEMO_PATTERN = /(사업자|대표자|주소|전화|tel|카드|승인|번호|금액|부가세|공급|결제|거래|일시|합계|매출|주문)/i;

@Injectable()
export class ReceiptTransactionTextParser implements TextParserProfileHandler {
  readonly profile = "receipt-transaction" as const;

  parse(text: string): TextParseResult {
    const rawLines = text.split(/\r?\n/).filter((line) => line.trim());
    const lines = rawLines.map((line) => line.replace(/\s+/g, " ").trim());
    const warnings: string[] = [];
    const excludedIndexes = this.getExcludedIndexes(lines);
    const labeledDate = this.findFirstLabeledValue(lines, DATE_LABELS);
    const date = (labeledDate ? this.toDate(labeledDate) : undefined) ?? lines.map((line) => this.toDate(line)).find(Boolean);
    const salesAmounts = this.findLabeledValues(lines, SALES_AMOUNT_LABEL, true);
    const labeledAmounts = salesAmounts.length ? salesAmounts : this.findFirstLabeledValues(lines, TOTAL_LABELS, true);
    const totalCandidates = [...new Set(labeledAmounts.map((value) => this.toAmount(value)).filter((value): value is number => value !== undefined))];
    if (!totalCandidates.length) {
      const cardApprovalAmounts = this.findCardApprovalAmounts(lines);
      if (cardApprovalAmounts.length === 1) totalCandidates.push(cardApprovalAmounts[0]);
    }
    const merchant = lines.find((line, index) => this.isTextCandidate(line, excludedIndexes.has(index)));
    const labeledItems = this.findProductItems(lines, rawLines);
    const merchantItems = this.findLabeledValues(lines, MERCHANT_LABEL);
    const fallbackItem = this.findTopMemoCandidate(lines, excludedIndexes);
    const itemValues = labeledItems.length ? labeledItems : merchantItems.length ? merchantItems : fallbackItem ? [fallbackItem] : [];
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
    if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    const shortMatch = line.match(SHORT_DATE_PATTERN);
    return shortMatch ? `20${shortMatch[1]}-${shortMatch[2].padStart(2, "0")}-${shortMatch[3].padStart(2, "0")}` : undefined;
  }

  private toAmount(line: string): number | undefined {
    const values = [...line.matchAll(new RegExp(AMOUNT_PATTERN.source, "gi"))]
      .map((match) => Number(match[1].replace(/[\s,]/g, "")))
      .filter((value) => Number.isSafeInteger(value) && value > 0);
    return values.length ? Math.max(...values) : undefined;
  }

  private findLabeledValues(lines: string[], label: RegExp, joinFollowingLines = false): string[] {
    const values: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const currentLine = lines[index];
      if (label.test(currentLine)) {
        const valueOnSameLine = currentLine.replace(label, "").replace(/^[:：\s]+/, "").trim();
        const value = valueOnSameLine || (joinFollowingLines ? lines.slice(index + 1, index + 3).join(" ") : lines[index + 1]);
        if (value) values.push(value);
        continue;
      }
      const combined = lines.slice(index, index + 3).join(" ");
      const combinedMatch = combined.match(label);
      if (!combinedMatch || (combinedMatch.index ?? 0) > currentLine.length) continue;
      const value = combined.replace(label, "").replace(/^[:：\s]+/, "").trim();
      if (value) values.push(value);
    }
    return values;
  }

  private findCardApprovalAmounts(lines: string[]): number[] {
    const isCardApproval = lines.some((line) => /(신[용음]\s*카드\s*(승인|승민)|매출\s*(전표|표))/.test(line));
    if (!isCardApproval) return [];
    return [...new Set(lines.filter((line) => /(?:₩\s*\d|\d[\d,\s]*\s*(?:원|KRW)|\b\d{1,3}(?:,\d{3})+\b)/i.test(line)).map((line) => this.toAmount(line)).filter((value): value is number => value !== undefined))];
  }

  private findFirstLabeledValue(lines: string[], labels: RegExp[]): string | undefined {
    for (const label of labels) {
      const value = this.findLabeledValues(lines, label)[0];
      if (value) return value;
    }
    return undefined;
  }

  private findFirstLabeledValues(lines: string[], labels: RegExp[], joinFollowingLines = false): string[] {
    for (const label of labels) {
      const values = this.findLabeledValues(lines, label, joinFollowingLines);
      if (values.length) return values;
    }
    return [];
  }

  private findProductItems(lines: string[], rawLines: string[]): string[] {
    const items: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!PRODUCT_LABEL.test(lines[index])) continue;
      const valueOnSameLine = lines[index].replace(PRODUCT_LABEL, "").replace(/^[:：\s]+/, "").trim();
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

  private findTopMemoCandidate(lines: string[], excludedIndexes: Set<number>): string | undefined {
    const isSpecialReceipt = lines.some((line) => /(상세 이용내역|신[용음]\s*카드\s*(승인|승민)|매출전표|카드\s*종류)/.test(line));
    const hasOcrCardApproval = lines.some((line) => /(신[용음]\s*카드\s*(승인|승민)|매출\s*(전표|표))/.test(line));
    if (!isSpecialReceipt && !hasOcrCardApproval) return undefined;
    return lines.find((line, index) => !excludedIndexes.has(index) && this.isTextCandidate(line, false) && !NON_MEMO_PATTERN.test(line) && !/(상세 이용내역|신용카드 승인|매출전표|이용내역|결제정보)/.test(line));
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
    return !isExcluded && !/(상세\s*이용내역)/.test(line) && !TOTAL_LABELS.some((label) => label.test(line)) && !DATE_LABELS.some((label) => label.test(line)) && !PRODUCT_LABEL.test(line) && !MERCHANT_LABEL.test(line) && !EXCLUDED_LABEL.test(line) && !NON_MEMO_PATTERN.test(line) && !DATE_PATTERN.test(line) && !COMPACT_DATETIME_PATTERN.test(line) && !SHORT_DATE_PATTERN.test(line) && !/(?:₩\s*\d|\d[\d,\s]*\s*(?:원|KRW))/i.test(line) && line.length >= 2 && line.length <= 80;
  }
}
