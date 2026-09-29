import { BudgetCalculatorConfig } from "./budget-calculator-config";

// 반복 지출 판별(예산계산기정책.md 6.1~6.3).
// 같은 정규화 키 거래의 발생 횟수·간격·금액만으로 판별하며 카테고리명은 사용하지 않는다.

export type RecurringWalletType = "ACCOUNT" | "CARD";

export interface RecurringSourceTransaction {
  transactionId: bigint;
  walletType: RecurringWalletType;
  walletId: bigint;
  categoryId: bigint;
  categoryName: string;
  memo: string | null;
  transactionDate: Date;
  /** 계좌는 amount, 카드는 amount + interest */
  amount: number;
}

export interface RecurringClassification {
  key: string;
  classification: "AUTOMATIC" | "CANDIDATE";
  walletType: RecurringWalletType;
  walletId: bigint;
  categoryName: string;
  memo: string | null;
  latestTransactionId: bigint;
  occurrences: number;
  medianIntervalDays: number;
  /** AUTOMATIC: 가장 최근 금액 × 다음 달 예정 횟수, CANDIDATE: 가장 최근 금액 */
  amount: number;
  /** AUTOMATIC일 때 다음 달 예정 횟수 */
  nextPeriodCount: number;
  reason: string;
}

export interface RecurringClassifyWindow {
  nextStartDate: Date;
  nextEndDate: Date;
  candidateRecentStartDate: Date;
  observationMonths: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeMemo(memo: string | null): string {
  return (memo ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function recurringKey(
  walletType: RecurringWalletType,
  walletId: bigint,
  categoryId: bigint,
  memo: string | null
): string {
  return [walletType, walletId.toString(), categoryId.toString(), normalizeMemo(memo)].join("|");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countScheduledDates(
  lastDate: Date,
  intervalDays: number,
  startDate: Date,
  endDate: Date
): number {
  let count = 0;
  for (let step = 1; ; step += 1) {
    const scheduled = lastDate.getTime() + step * intervalDays * DAY_MS;
    if (scheduled > endDate.getTime()) {
      return count;
    }
    if (scheduled >= startDate.getTime()) {
      count += 1;
    }
  }
}

export function classifyRecurringGroup(
  transactions: RecurringSourceTransaction[],
  config: BudgetCalculatorConfig,
  window: RecurringClassifyWindow
): RecurringClassification | null {
  const sorted = [...transactions].sort(
    (a, b) =>
      a.transactionDate.getTime() - b.transactionDate.getTime() ||
      (a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : 0)
  );
  const occurrences = sorted.length;
  // 한 번만 발생했거나 후보 최소 횟수에 못 미치면 자동 반영·후보 모두 아니다.
  if (occurrences < config.candidateMinOccurrences) {
    return null;
  }

  const intervals = sorted
    .slice(1)
    .map((tx, index) =>
      Math.round((tx.transactionDate.getTime() - sorted[index].transactionDate.getTime()) / DAY_MS)
    );
  const medianIntervalDays = Math.round(median(intervals));
  // 같은 날 여러 번 기록된 거래처럼 간격이 없으면 반복 주기로 볼 수 없다.
  if (medianIntervalDays < 1) {
    return null;
  }

  const latest = sorted[sorted.length - 1];
  const intervalTolerance = Math.max(
    config.intervalToleranceMinDays,
    (medianIntervalDays * config.intervalTolerancePercent) / 100
  );
  const amountTolerance = (latest.amount * config.amountTolerancePercent) / 100;
  const regularInterval = intervals.every(
    (interval) => Math.abs(interval - medianIntervalDays) <= intervalTolerance
  );
  const regularAmount = sorted.every((tx) => Math.abs(tx.amount - latest.amount) <= amountTolerance);

  const base = {
    key: recurringKey(latest.walletType, latest.walletId, latest.categoryId, latest.memo),
    walletType: latest.walletType,
    walletId: latest.walletId,
    categoryName: latest.categoryName,
    memo: latest.memo,
    latestTransactionId: latest.transactionId,
    occurrences,
    medianIntervalDays
  };

  if (occurrences >= config.automaticMinOccurrences && regularInterval && regularAmount) {
    const nextPeriodCount = countScheduledDates(
      latest.transactionDate,
      medianIntervalDays,
      window.nextStartDate,
      window.nextEndDate
    );
    // 4주·6주 주기처럼 다음 달에 예정일이 없으면 다음 달 고정지출에 넣지 않는다.
    if (nextPeriodCount === 0) {
      return null;
    }
    return {
      ...base,
      classification: "AUTOMATIC",
      amount: latest.amount * nextPeriodCount,
      nextPeriodCount,
      reason:
        `최근 ${window.observationMonths}개월 ${occurrences}회 반복(약 ${medianIntervalDays}일 간격)` +
        (nextPeriodCount > 1 ? `, 다음 달 ${nextPeriodCount}회 예상` : "")
    };
  }

  if (latest.transactionDate.getTime() < window.candidateRecentStartDate.getTime()) {
    return null;
  }
  return {
    ...base,
    classification: "CANDIDATE",
    amount: latest.amount,
    nextPeriodCount: 0,
    reason:
      occurrences < config.automaticMinOccurrences
        ? `반복 횟수 부족(${occurrences}회)`
        : `반복은 있으나 간격 또는 금액이 불규칙(${occurrences}회)`
  };
}

export function classifyRecurringTransactions(
  transactions: RecurringSourceTransaction[],
  config: BudgetCalculatorConfig,
  window: RecurringClassifyWindow
): RecurringClassification[] {
  const groups = new Map<string, RecurringSourceTransaction[]>();
  for (const tx of transactions) {
    const key = recurringKey(tx.walletType, tx.walletId, tx.categoryId, tx.memo);
    const group = groups.get(key);
    if (group) {
      group.push(tx);
    } else {
      groups.set(key, [tx]);
    }
  }

  const results: RecurringClassification[] = [];
  for (const group of groups.values()) {
    const result = classifyRecurringGroup(group, config, window);
    if (result) {
      results.push(result);
    }
  }
  return results;
}
