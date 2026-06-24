import { ReceiptTransactionTextParser } from "./receipt-transaction-text-parser";

describe("ReceiptTransactionTextParser", () => {
  const parser = new ReceiptTransactionTextParser();

  it("extracts a receipt transaction draft from OCR text", () => {
    const result = parser.parse("고양이 마트\n2026.06.22\n참치캔\n합계 12,800원");

    expect(result.profile).toBe("receipt-transaction");
    expect(result.fields.transactionDate?.value).toBe("2026-06-22");
    expect(result.fields.totalAmount?.value).toBe(12800);
    expect(result.items).toEqual([]);
  });

  it("keeps an ambiguous total unset and returns a warning", () => {
    const result = parser.parse("고양이 마트\n합계 1,000원\n총액 2,000원");

    expect(result.fields.totalAmount).toBeUndefined();
    expect(result.warnings).toContain("결제 금액을 확인해 주세요.");
  });

  it("uses labeled next lines and excludes order metadata from memo items", () => {
    const result = parser.parse(`주문 번호
2026062122759161
주문 날짜
2026.06.21 03:21:34
상품명
앱코 NCORE NC500 게이밍 노트북 쿨링 패드 스마트폰 거치대
회사명
NAVER FINANCIAL
서명
윤새미
합계
29,900원`);

    expect(result.fields.transactionDate?.value).toBe("2026-06-21");
    expect(result.fields.totalAmount?.value).toBe(29900);
    expect(result.items.map((item) => item.value)).toEqual(["앱코 NCORE NC500 게이밍 노트북 쿨링 패드 스마트폰 거치대"]);
  });

  it("normalizes an approval datetime and uses the sales amount", () => {
    const result = parser.parse(`공급자명 지큐브스페이스
주문번호 yyu26032172533334
승인일시 20260302172533
승인번호 26022023
과세 금액 1,390,909원
부가세 금액 139,091원
판매 금액 1,530,000원
가맹점명 토스페이먼츠`);

    expect(result.fields.transactionDate?.value).toBe("2026-03-02");
    expect(result.fields.totalAmount?.value).toBe(1530000);
  });

  it("prioritizes the sales amount over tax components and other total labels", () => {
    const result = parser.parse(`과세 금액 1,390,909원
부가세 금액 139,091원
총 합계 1,500,000원
판매 금 액 1,530,000원`);

    expect(result.fields.totalAmount?.value).toBe(1530000);
  });

  it("parses a labeled date when OCR joins the date and time", () => {
    const result = parser.parse("서현365의원\n거래일시:2026/06/2305:13:20\n합계: 680,000원");

    expect(result.fields.transactionDate?.value).toBe("2026-06-23");
  });

  it("keeps the existing transaction date label support", () => {
    const result = parser.parse("거래 날짜 2026-06-22\n합계 12,800원");

    expect(result.fields.transactionDate?.value).toBe("2026-06-22");
  });

  it("recovers an OCR date with damaged separators and a joined time", () => {
    const result = parser.parse("결제일시1;2026.06.2209;18\n결제금액 990원");

    expect(result.fields.transactionDate?.value).toBe("2026-06-22");
  });

  it("recovers a short OCR date with a joined time", () => {
    const result = parser.parse("거래일시:26/06/2316:19:53\n총 합 계 220,000원");

    expect(result.fields.transactionDate?.value).toBe("2026-06-23");
  });

  it("uses a fuzzy sales amount label and the largest amount on its value line", () => {
    const result = parser.parse("승인일시 20260302172443\n판미금액\n11 1,000,000원");

    expect(result.fields.totalAmount?.value).toBe(1000000);
  });

  it("uses a repeated comma-formatted amount on a card approval receipt", () => {
    const result = parser.parse("매출표\n220,000\n220,000");

    expect(result.fields.totalAmount?.value).toBe(220000);
  });

  it("uses the one currency amount on a credit card approval receipt", () => {
    const result = parser.parse("서울정정신건강의학과\n신음 카드 승민\n35,600원");

    expect(result.fields.totalAmount?.value).toBe(35600);
    expect(result.items.map((item) => item.value)).toEqual(["서울정정신건강의학과"]);
  });

  it("keeps a numeric merchant name as a memo candidate", () => {
    const result = parser.parse("서현365의원\n카드종류:신한프리미엄카드\n합계 680,000원");

    expect(result.items.map((item) => item.value)).toEqual(["서현365의원"]);
  });

  it("extracts the first product table column and the sales amount", () => {
    const result = parser.parse(`2022/12/24 15:59\t\tPOS:4162 - 0067
상품명\t\t\t단가\t\t수량\t\t\t금액
K2\t\t\t430,000\t\t 1\t\t430,000
\t\t\t\t\t과세물품가액\t391,000
\t\t\t\t\t부 가 세\t39,100
매출액\t\t\t\t\t￦430,100
받은돈\t\t\t\t\t￦430,100`);

    expect(result.fields.transactionDate?.value).toBe("2022-12-24");
    expect(result.fields.totalAmount?.value).toBe(430100);
    expect(result.items.map((item) => item.value)).toEqual(["K2"]);
  });
});
