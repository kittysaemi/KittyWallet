import { matchTransfersForUser } from "./matcher";
import { TransferCandidateTransaction } from "./types";

function tx(overrides: Partial<TransferCandidateTransaction> & { transactionId: string }): TransferCandidateTransaction {
  return {
    userId: "1",
    categoryId: "1",
    walletId: "1",
    transactionType: "EXPENSE",
    amount: "10000",
    transactionDate: "2026-01-01",
    createdAt: "2026-01-01T09:00:00.000Z",
    ...overrides
  };
}

describe("matchTransfersForUser", () => {
  it("동일 금액/날짜/다른 계좌인 유일한 후보 쌍은 확정 매칭된다", () => {
    const expense = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A", createdAt: "2026-01-01T09:00:00.000Z" });
    const income = tx({ transactionId: "2", transactionType: "INCOME", walletId: "B", createdAt: "2026-01-01T09:05:00.000Z" });

    const result = matchTransfersForUser([expense, income]);

    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0].expense.transactionId).toBe("1");
    expect(result.confirmed[0].income.transactionId).toBe("2");
    expect(result.confirmed[0].timeDiffMs).toBe(5 * 60 * 1000);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  it("같은 계좌(walletId 동일)는 후보에서 제외되어 미매칭 처리된다", () => {
    const expense = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A" });
    const income = tx({ transactionId: "2", transactionType: "INCOME", walletId: "A" });

    const result = matchTransfersForUser([expense, income]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.unmatched.map((t) => t.transactionId).sort()).toEqual(["1", "2"]);
  });

  it("날짜가 다르면 후보에서 제외되어 미매칭 처리된다", () => {
    const expense = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A", transactionDate: "2026-01-01" });
    const income = tx({ transactionId: "2", transactionType: "INCOME", walletId: "B", transactionDate: "2026-01-02" });

    const result = matchTransfersForUser([expense, income]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.unmatched).toHaveLength(2);
  });

  it("금액이 다르면 후보에서 제외되어 미매칭 처리된다", () => {
    const expense = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A", amount: "10000" });
    const income = tx({ transactionId: "2", transactionType: "INCOME", walletId: "B", amount: "9999" });

    const result = matchTransfersForUser([expense, income]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.unmatched).toHaveLength(2);
  });

  it("동일 최소 시간차에 후보가 2건 이상 동시에 존재하면 애매로 분류되고 그리디에서 제외된다", () => {
    // expense1(A)@10:00, expense2(C)@10:20, income1(B)@10:10, income2(D)@10:30
    // diffs: e1-i1=10min, e1-i2=30min, e2-i1=10min, e2-i2=10min → 최소 10min에 3쌍 동시 존재
    const e1 = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A", createdAt: "2026-01-01T10:00:00.000Z" });
    const e2 = tx({ transactionId: "2", transactionType: "EXPENSE", walletId: "C", createdAt: "2026-01-01T10:20:00.000Z" });
    const i1 = tx({ transactionId: "3", transactionType: "INCOME", walletId: "B", createdAt: "2026-01-01T10:10:00.000Z" });
    const i2 = tx({ transactionId: "4", transactionType: "INCOME", walletId: "D", createdAt: "2026-01-01T10:30:00.000Z" });

    const result = matchTransfersForUser([e1, e2, i1, i2]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(1);
    expect(result.ambiguous[0].expenseCandidates.map((t) => t.transactionId).sort()).toEqual(["1", "2"]);
    expect(result.ambiguous[0].incomeCandidates.map((t) => t.transactionId).sort()).toEqual(["3", "4"]);
    expect(result.unmatched).toHaveLength(0);
  });

  it("짝을 찾지 못한 단일 거래는 미매칭으로 분류된다", () => {
    const lone = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A" });

    const result = matchTransfersForUser([lone]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].transactionId).toBe("1");
  });

  it("그리디 매칭: 시간차가 겹치지 않는 두 쌍은 각자 독립적으로 확정된다", () => {
    // diffs: e1-i1=1min(최소, 유일) → 확정 / e2-i2=5min(그 다음, 유일) → 확정
    // 교차 조합(e1-i2=25min, e2-i1=19min)은 더 큰 시간차이고 이미 사용된 거래라 무시된다
    const e1 = tx({ transactionId: "1", transactionType: "EXPENSE", walletId: "A", createdAt: "2026-01-01T09:00:00.000Z" });
    const e2 = tx({ transactionId: "2", transactionType: "EXPENSE", walletId: "A", createdAt: "2026-01-01T09:20:00.000Z" });
    const i1 = tx({ transactionId: "3", transactionType: "INCOME", walletId: "B", createdAt: "2026-01-01T09:01:00.000Z" });
    const i2 = tx({ transactionId: "4", transactionType: "INCOME", walletId: "B", createdAt: "2026-01-01T09:25:00.000Z" });

    const result = matchTransfersForUser([e1, e2, i1, i2]);

    expect(result.confirmed).toHaveLength(2);
    const pairsByExpense = new Map(result.confirmed.map((m) => [m.expense.transactionId, m.income.transactionId]));
    expect(pairsByExpense.get("1")).toBe("3");
    expect(pairsByExpense.get("2")).toBe("4");
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  it("여러 사용자가 섞여 들어와도 matchTransfersForUser 자체는 입력 그대로 하나의 그룹으로 처리한다 (userId 분리는 호출자 책임)", () => {
    // 이 함수는 이미 한 사용자로 필터링된 배열을 받는 것을 전제로 한다.
    // 02-dry-run-match.ts에서 userId별로 그룹핑 후 이 함수를 호출한다.
    const e1 = tx({ transactionId: "1", userId: "1", transactionType: "EXPENSE", walletId: "A" });
    const i1 = tx({ transactionId: "2", userId: "1", transactionType: "INCOME", walletId: "B" });

    const result = matchTransfersForUser([e1, i1]);
    expect(result.confirmed).toHaveLength(1);
  });
});
