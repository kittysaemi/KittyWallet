export const TEXT_PARSE_PROFILES = ["receipt-transaction"] as const;
export type TextParseProfile = (typeof TEXT_PARSE_PROFILES)[number];
export type TextParseSourceType = "OCR_IMAGE" | "PASTED_TEXT";

export interface ParsedField<T> {
  value: T;
  confidence: number;
  currency?: "KRW";
}

export interface TextParseResult {
  profile: TextParseProfile;
  fields: {
    transactionDate?: ParsedField<string>;
    totalAmount?: ParsedField<number>;
    merchant?: ParsedField<string>;
  };
  items: Array<ParsedField<string>>;
  warnings: string[];
  parserVersion: string;
}

export interface TextParserProfileHandler {
  readonly profile: TextParseProfile;
  parse(text: string): TextParseResult;
}
