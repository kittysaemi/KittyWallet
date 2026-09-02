export type BalanceEntryType = "INCOME" | "EXPENSE";

export interface BalanceLedgerEntry {
  transactionId: bigint;
  transactionType: BalanceEntryType;
  amount: number;
  transactionDate: Date;
}

export interface BalanceCandidateEntry {
  transactionType: BalanceEntryType;
  amount: number;
  transactionDate: Date;
}

export function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 계좌 초기잔액 + (asOfDate까지의 INCOME 합) - (asOfDate까지의 EXPENSE 합).
 * asOfDate 이후에 발생한 거래는 무시한다(과거 날짜 등록/수정 시의 시점 기준 검증용).
 */
export function calculateBalanceAtDate(
  initialBalance: number,
  ledger: BalanceLedgerEntry[],
  asOfDate: Date,
  candidates: BalanceCandidateEntry[] = []
): number {
  const asOfKey = toDateKey(asOfDate);
  const entries: BalanceCandidateEntry[] = [...ledger, ...candidates];

  return entries.reduce((balance, entry) => {
    if (toDateKey(entry.transactionDate) > asOfKey) {
      return balance;
    }
    const delta = entry.transactionType === "INCOME" ? entry.amount : -entry.amount;
    return balance + delta;
  }, initialBalance);
}

export function minimumAllowedBalance(account: {
  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;
}): number {
  return account.allowNegativeBalance ? -account.negativeBalanceLimit : 0;
}

export function excludeTransactions(
  ledger: BalanceLedgerEntry[],
  excludeTransactionIds: bigint[]
): BalanceLedgerEntry[] {
  if (excludeTransactionIds.length === 0) {
    return ledger;
  }
  const excluded = new Set(excludeTransactionIds.map((id) => id.toString()));
  return ledger.filter((entry) => !excluded.has(entry.transactionId.toString()));
}
