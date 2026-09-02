import {
  AmbiguousGroup,
  ConfirmedMatch,
  TransferCandidateTransaction,
  UnmatchedTransaction
} from "./types";

/**
 * 이슈 #392 매칭 규칙 (한 명의 userId 내부에서만 매칭한다):
 *  - amount 동일 (Decimal 문자열 정확히 일치)
 *  - walletId(계좌)가 서로 다름
 *  - transactionDate가 같은 날짜
 *  - EXPENSE 1건 + INCOME 1건 짝
 *
 * "시간차가 작은 순으로 정렬해 그리디 1:1 매칭"에서 쓰는 시간차 기준:
 * transactionDate 컬럼은 시각 정보가 없는 DATE 타입이라 그 자체로는 시간차를 계산할 수 없다.
 * 따라서 실제 등록 시각인 createdAt의 차이를 시간차로 사용한다.
 * → 이는 이슈 본문에 명시되지 않은 해석/가정이므로, 사람 검토 시 함께 확인이 필요하다 (README 참고).
 *
 * 애매 처리 규칙: 그리디 진행 중 특정 시간차(diff) 구간에서 아직 미사용 상태인 후보 쌍이
 * 동시에 2건 이상 존재하면, 그 시간차에서 유일하게 결정할 수 없으므로 관련된 모든 거래를
 * "애매"로 분류하고 이후 그리디 진행 과정에서 제외한다 (더 큰 시간차의 다른 후보와도 매칭하지 않음).
 */

interface Pair {
  expense: TransferCandidateTransaction;
  income: TransferCandidateTransaction;
  timeDiffMs: number;
}

export interface UserMatchResult {
  confirmed: ConfirmedMatch[];
  ambiguous: AmbiguousGroup[];
  unmatched: UnmatchedTransaction[];
}

export function makeGroupId(a: TransferCandidateTransaction, b: TransferCandidateTransaction): string {
  // NOTE: #388에서 확정될 transferGroupId의 실제 타입/채번 정책에 맞춰 조정이 필요할 수 있음.
  // 여기서는 두 거래 중 더 작은 transactionId를 그룹 식별자로 재사용한다 (별도 채번 불필요, 추적 용이).
  const aId = BigInt(a.transactionId);
  const bId = BigInt(b.transactionId);
  return (aId < bId ? aId : bId).toString();
}

function buildCandidatePairs(
  expenses: TransferCandidateTransaction[],
  incomes: TransferCandidateTransaction[]
): Pair[] {
  const pairs: Pair[] = [];
  for (const expense of expenses) {
    for (const income of incomes) {
      if (expense.amount !== income.amount) continue;
      if (expense.walletId === income.walletId) continue;
      if (expense.transactionDate !== income.transactionDate) continue;

      const timeDiffMs = Math.abs(
        new Date(expense.createdAt).getTime() - new Date(income.createdAt).getTime()
      );
      pairs.push({ expense, income, timeDiffMs });
    }
  }
  return pairs;
}

export function matchTransfersForUser(
  transactions: TransferCandidateTransaction[]
): UserMatchResult {
  const expenses = transactions.filter((t) => t.transactionType === "EXPENSE");
  const incomes = transactions.filter((t) => t.transactionType === "INCOME");

  const pairs = buildCandidatePairs(expenses, incomes).sort(
    (a, b) => a.timeDiffMs - b.timeDiffMs
  );

  const usedExpenseIds = new Set<string>();
  const usedIncomeIds = new Set<string>();
  const confirmed: ConfirmedMatch[] = [];
  const ambiguous: AmbiguousGroup[] = [];

  let cursor = 0;
  while (cursor < pairs.length) {
    const diff = pairs[cursor].timeDiffMs;
    let end = cursor;
    while (end < pairs.length && pairs[end].timeDiffMs === diff) end++;

    const bucket = pairs
      .slice(cursor, end)
      .filter(
        (p) =>
          !usedExpenseIds.has(p.expense.transactionId) &&
          !usedIncomeIds.has(p.income.transactionId)
      );
    cursor = end;

    if (bucket.length === 0) {
      continue;
    }

    if (bucket.length === 1) {
      const p = bucket[0];
      usedExpenseIds.add(p.expense.transactionId);
      usedIncomeIds.add(p.income.transactionId);
      confirmed.push({
        groupId: makeGroupId(p.expense, p.income),
        userId: p.expense.userId,
        timeDiffMs: diff,
        expense: p.expense,
        income: p.income
      });
      continue;
    }

    const expenseCandidates = new Map<string, TransferCandidateTransaction>();
    const incomeCandidates = new Map<string, TransferCandidateTransaction>();
    for (const p of bucket) {
      expenseCandidates.set(p.expense.transactionId, p.expense);
      incomeCandidates.set(p.income.transactionId, p.income);
      usedExpenseIds.add(p.expense.transactionId);
      usedIncomeIds.add(p.income.transactionId);
    }

    ambiguous.push({
      userId: bucket[0].expense.userId,
      timeDiffMs: diff,
      reason: `동일 시간차(${diff}ms)에 후보 쌍이 ${bucket.length}건 동시에 존재하여 자동 결정 불가`,
      expenseCandidates: [...expenseCandidates.values()],
      incomeCandidates: [...incomeCandidates.values()]
    });
  }

  const unmatched: UnmatchedTransaction[] = [
    ...expenses
      .filter((e) => !usedExpenseIds.has(e.transactionId))
      .map((t) => ({ ...t, reason: "동일 금액/날짜/다른 계좌 조건을 만족하는 반대 거래 없음" })),
    ...incomes
      .filter((i) => !usedIncomeIds.has(i.transactionId))
      .map((t) => ({ ...t, reason: "동일 금액/날짜/다른 계좌 조건을 만족하는 반대 거래 없음" }))
  ];

  return { confirmed, ambiguous, unmatched };
}
