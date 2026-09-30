import { Prisma } from "@prisma/client";
import { RegisterFixedExpensesUseCase } from "../src/modules/fixed-expense/application/register-fixed-expenses.use-case";
import {
  calcFixedExpensePeriod,
  toTargetDate
} from "../src/modules/fixed-expense/domain/fixed-expense-period";
import { FixedExpenseRepository } from "../src/modules/fixed-expense/infrastructure/fixed-expense.repository";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().split("T")[0];

describe("fixed-expense-period", () => {
  it("실행일 기준 지난달 1일~말일과 이번 달을 계산한다", () => {
    const p = calcFixedExpensePeriod("2026-10-01");
    expect(iso(p.sourceStartDate)).toBe("2026-09-01");
    expect(iso(p.sourceEndDate)).toBe("2026-09-30");
    expect(p.targetYear).toBe(2026);
    expect(p.targetMonthIndex).toBe(9);
  });

  it("1월 실행이면 지난해 12월을 원본으로 본다", () => {
    const p = calcFixedExpensePeriod("2027-01-01");
    expect(iso(p.sourceStartDate)).toBe("2026-12-01");
    expect(iso(p.sourceEndDate)).toBe("2026-12-31");
  });

  it("일자를 유지하고, 이번 달에 없는 일자는 말일로 등록한다", () => {
    expect(iso(toTargetDate(d("2026-09-15"), 2026, 9))).toBe("2026-10-15");
    expect(iso(toTargetDate(d("2026-10-31"), 2026, 10))).toBe("2026-11-30");
    expect(iso(toTargetDate(d("2027-01-31"), 2027, 1))).toBe("2027-02-28");
  });
});

describe("RegisterFixedExpensesUseCase", () => {
  const source = (id: number, walletId: number, date: string) => ({
    transactionId: BigInt(id),
    userId: 7n,
    walletId: BigInt(walletId),
    categoryId: 3n,
    amount: new Prisma.Decimal(13500),
    memo: "tving",
    transactionDate: d(date)
  });

  function makeRepo(overrides: Partial<Record<keyof FixedExpenseRepository, jest.Mock>> = {}) {
    return {
      findEnabledUserIds: jest.fn().mockResolvedValue([7n]),
      findSourceTransactions: jest.fn().mockResolvedValue([]),
      findActiveCardIds: jest.fn().mockResolvedValue(new Set<string>()),
      createAll: jest.fn().mockImplementation(async (rows: unknown[]) => rows.length),
      ...overrides
    } as unknown as FixedExpenseRepository & Record<string, jest.Mock>;
  }

  it("설정을 켠 사용자가 없으면 아무것도 등록하지 않는다", async () => {
    const repo = makeRepo({ findEnabledUserIds: jest.fn().mockResolvedValue([]) });
    const result = await new RegisterFixedExpensesUseCase(repo).execute("2026-10-01");
    expect(result).toEqual({ created: 0, skipped: 0 });
    expect(repo.findSourceTransactions).not.toHaveBeenCalled();
    expect(repo.createAll).not.toHaveBeenCalled();
  });

  it("지난달 체크 거래를 이번 달 같은 일자로 등록하고, 삭제·사용 안 함 카드는 건너뛴다", async () => {
    const repo = makeRepo({
      findSourceTransactions: jest
        .fn()
        .mockResolvedValue([source(1, 3, "2026-09-18"), source(2, 9, "2026-09-20")]),
      findActiveCardIds: jest.fn().mockResolvedValue(new Set(["3"]))
    });

    const result = await new RegisterFixedExpensesUseCase(repo).execute("2026-10-01");

    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(repo.findSourceTransactions).toHaveBeenCalledWith([7n], d("2026-09-01"), d("2026-09-30"));
    const rows = repo.createAll.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 7n, walletId: 3n, categoryId: 3n, memo: "tving" });
    expect(iso(rows[0].transactionDate)).toBe("2026-10-18");
  });

  it("등록 중 오류가 나면 오류를 전달한다(등록은 한 트랜잭션으로 롤백)", async () => {
    const repo = makeRepo({
      findSourceTransactions: jest.fn().mockResolvedValue([source(1, 3, "2026-09-18")]),
      findActiveCardIds: jest.fn().mockResolvedValue(new Set(["3"])),
      createAll: jest.fn().mockRejectedValue(new Error("db error"))
    });

    await expect(new RegisterFixedExpensesUseCase(repo).execute("2026-10-01")).rejects.toThrow(
      "db error"
    );
  });
});
