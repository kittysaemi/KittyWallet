import {
  BalanceLedgerEntry,
  calculateBalanceAtDate,
  excludeTransactions,
  minimumAllowedBalance,
  toDateKey
} from "./balance-at-date.util";

describe("calculateBalanceAtDate", () => {
  it("초기잔액에 asOfDate까지의 INCOME/EXPENSE만 반영한다", () => {
    const ledger: BalanceLedgerEntry[] = [
      { transactionId: 1n, transactionType: "INCOME", amount: 10000, transactionDate: new Date("2026-08-01") },
      { transactionId: 2n, transactionType: "EXPENSE", amount: 3000, transactionDate: new Date("2026-08-05") }
    ];

    const balance = calculateBalanceAtDate(50000, ledger, new Date("2026-08-05"));

    expect(balance).toBe(57000);
  });

  it("asOfDate 이후에 발생한 거래는 무시한다", () => {
    const ledger: BalanceLedgerEntry[] = [
      { transactionId: 1n, transactionType: "INCOME", amount: 10000, transactionDate: new Date("2026-08-01") },
      { transactionId: 2n, transactionType: "EXPENSE", amount: 3000, transactionDate: new Date("2026-08-05") },
      { transactionId: 3n, transactionType: "EXPENSE", amount: 100000, transactionDate: new Date("2026-08-10") }
    ];

    const balance = calculateBalanceAtDate(50000, ledger, new Date("2026-08-05"));

    expect(balance).toBe(57000);
  });

  it("candidate 거래를 asOfDate 시점 계산에 포함한다", () => {
    const ledger: BalanceLedgerEntry[] = [
      { transactionId: 1n, transactionType: "INCOME", amount: 10000, transactionDate: new Date("2026-08-01") }
    ];

    const balance = calculateBalanceAtDate(50000, ledger, new Date("2026-08-05"), [
      { transactionType: "EXPENSE", amount: 20000, transactionDate: new Date("2026-08-05") }
    ]);

    expect(balance).toBe(40000);
  });

  it("candidate가 asOfDate 이후라면 무시한다", () => {
    const balance = calculateBalanceAtDate(50000, [], new Date("2026-08-05"), [
      { transactionType: "EXPENSE", amount: 20000, transactionDate: new Date("2026-08-06") }
    ]);

    expect(balance).toBe(50000);
  });
});

describe("minimumAllowedBalance", () => {
  it("allowNegativeBalance가 false면 0을 반환한다", () => {
    expect(minimumAllowedBalance({ allowNegativeBalance: false, negativeBalanceLimit: 100000 })).toBe(0);
  });

  it("allowNegativeBalance가 true면 -negativeBalanceLimit을 반환한다", () => {
    expect(minimumAllowedBalance({ allowNegativeBalance: true, negativeBalanceLimit: 100000 })).toBe(-100000);
  });
});

describe("excludeTransactions", () => {
  const ledger: BalanceLedgerEntry[] = [
    { transactionId: 1n, transactionType: "INCOME", amount: 10000, transactionDate: new Date("2026-08-01") },
    { transactionId: 2n, transactionType: "EXPENSE", amount: 3000, transactionDate: new Date("2026-08-05") }
  ];

  it("지정된 transactionId를 제외한다", () => {
    const result = excludeTransactions(ledger, [1n]);
    expect(result).toHaveLength(1);
    expect(result[0].transactionId).toBe(2n);
  });

  it("제외 목록이 비어있으면 원본을 그대로 반환한다", () => {
    expect(excludeTransactions(ledger, [])).toBe(ledger);
  });
});

describe("toDateKey", () => {
  it("UTC 기준 YYYY-MM-DD 문자열을 반환한다", () => {
    expect(toDateKey(new Date("2026-08-05T00:00:00.000Z"))).toBe("2026-08-05");
  });
});
