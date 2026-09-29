import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AppException } from "../src/common/exceptions/app.exception";
import { GetBudgetCalculatorSourceUseCase } from "../src/modules/dashboard/application/use-cases/get-budget-calculator-source.use-case";
import { BudgetCalculatorConfig } from "../src/modules/dashboard/domain/budget-calculator-config";
import { BudgetCalculatorRepository } from "../src/modules/dashboard/infrastructure/budget-calculator.repository";
import { BudgetCalculatorSourceQueryDto } from "../src/modules/dashboard/presentation/dto/request/budget-calculator-source-query.dto";

const config: BudgetCalculatorConfig = {
  observationMonths: 6,
  automaticMinOccurrences: 3,
  candidateMinOccurrences: 2,
  intervalTolerancePercent: 20,
  intervalToleranceMinDays: 3,
  amountTolerancePercent: 20,
  candidateRecentMonths: 3
};

function expense(
  id: number,
  date: string,
  amount: number,
  overrides: Partial<{ walletId: bigint; interest: number; nextMonthCashYn: boolean; memo: string }> = {}
) {
  return {
    transactionId: BigInt(id),
    walletId: 1n,
    categoryId: 10n,
    categoryName: "생활",
    memo: "메모",
    transactionDate: new Date(`${date}T00:00:00.000Z`),
    amount,
    interest: 0,
    nextMonthCashYn: false,
    ...overrides
  };
}

describe("GetBudgetCalculatorSourceUseCase", () => {
  const repo = {
    getUserTimezoneSetting: jest.fn(),
    getAccounts: jest.fn(),
    getCards: jest.fn(),
    getAccountBalanceDeltasBefore: jest.fn(),
    getAccountIncomeInPeriod: jest.fn(),
    getExpensesInPeriod: jest.fn(),
    getCardInstallmentsInPeriod: jest.fn(),
    getRecurringSourceTransactions: jest.fn()
  } as unknown as jest.Mocked<BudgetCalculatorRepository>;
  const useCase = new GetBudgetCalculatorSourceUseCase(repo, config);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-09-20T03:00:00.000Z"));
    repo.getUserTimezoneSetting.mockResolvedValue("Asia/Seoul");
    repo.getAccounts.mockResolvedValue([
      { accountId: 1n, accountName: "CMA_RP", initialBalance: 1000000 },
      { accountId: 2n, accountName: "생활비 통장", initialBalance: 0 }
    ]);
    repo.getCards.mockResolvedValue([{ cardId: 5n, cardName: "신한카드" }]);
    repo.getAccountBalanceDeltasBefore.mockResolvedValue(new Map([["1", 300000]]));
    repo.getAccountIncomeInPeriod.mockResolvedValue(new Map([["1", 3000000]]));
    repo.getExpensesInPeriod.mockImplementation(async (_userId, walletType) =>
      walletType === "ACCOUNT"
        ? [
            expense(100, "2026-09-05", 200000, { walletId: 2n, memo: "관리비", nextMonthCashYn: true }),
            expense(101, "2026-09-15", 12000)
          ]
        : [expense(200, "2026-09-18", 50000, { walletId: 5n, interest: 1500 })]
    );
    repo.getCardInstallmentsInPeriod.mockResolvedValue([
      {
        transactionId: 300n,
        walletId: 5n,
        installmentId: 20n,
        installmentSeq: 4,
        categoryName: "가전",
        memo: "냉장고",
        amount: 80000,
        interest: 2000
      }
    ]);
    repo.getRecurringSourceTransactions.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("기준 월 시작 잔액 = 초기 잔액 + 기준 월 이전 거래 합계이며 현재 잔액을 쓰지 않는다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    const [, accountIds, beforeDate] = repo.getAccountBalanceDeltasBefore.mock.calls[0];
    expect(accountIds).toEqual([1n, 2n]);
    expect(beforeDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(result.accounts).toEqual([
      { account_id: 1, account_name: "CMA_RP", opening_balance: 1300000, base_period_income_amount: 3000000 },
      { account_id: 2, account_name: "생활비 통장", opening_balance: 0, base_period_income_amount: 0 }
    ]);
  });

  it("기준 월·다음 달 기간과 기준 월 실제 지출을 항목 단위로 반환한다(카드는 amount + interest)", async () => {
    const result = await useCase.execute(1n, "2026-09");

    expect(result.base_period).toEqual({ year: 2026, month: 9, start_date: "2026-09-01", end_date: "2026-09-30" });
    expect(result.next_period).toEqual({ year: 2026, month: 10, start_date: "2026-10-01", end_date: "2026-10-31" });
    expect(result.base_period_items.cash_expenses.map((e) => e.transaction_id)).toEqual([100, 101]);
    expect(result.base_period_items.card_expenses[0]).toMatchObject({
      card_id: 5,
      amount: 50000,
      interest: 1500,
      total_amount: 51500
    });
    expect(result.cards).toEqual([{ card_id: 5, card_name: "신한카드" }]);
  });

  it("다음 달 할부 회차는 회차 금액 + 이자로, n월 현금 동일 사용 체크 거래는 현금 고정지출로 반영한다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    expect(result.next_period_items.card_fixed_items).toEqual([
      expect.objectContaining({ item_id: "installment-20-4", card_id: 5, amount: 82000, classification: "AUTOMATIC" })
    ]);
    expect(result.next_period_items.cash_fixed_items).toEqual([
      expect.objectContaining({ item_id: "cash-next-month-100", account_id: 2, amount: 200000 })
    ]);
  });

  it("체크 거래와 같은 반복 지출은 반복 판별로 한 번 더 반영하지 않는다", async () => {
    repo.getRecurringSourceTransactions.mockResolvedValue(
      ["2026-06-05", "2026-07-05", "2026-08-05"].map((date, i) => ({
        transactionId: BigInt(400 + i),
        walletType: "ACCOUNT" as const,
        walletId: 2n,
        categoryId: 10n,
        categoryName: "생활",
        memo: "관리비",
        transactionDate: new Date(`${date}T00:00:00.000Z`),
        amount: 200000
      }))
    );

    const result = await useCase.execute(1n, "2026-09");

    expect(result.next_period_items.cash_fixed_items).toHaveLength(1);
    expect(result.next_period_items.cash_fixed_items[0].item_id).toBe("cash-next-month-100");
  });

  it("반복 판별은 기준 월 직전 6개 완료 월만 조회하고 AUTOMATIC/CANDIDATE를 나눠 반환한다", async () => {
    repo.getRecurringSourceTransactions.mockResolvedValue([
      ...["2026-06-10", "2026-07-10", "2026-08-10"].map((date, i) => ({
        transactionId: BigInt(500 + i),
        walletType: "CARD" as const,
        walletId: 5n,
        categoryId: 11n,
        categoryName: "통신",
        memo: "통신비",
        transactionDate: new Date(`${date}T00:00:00.000Z`),
        amount: 55000
      })),
      ...["2026-07-28", "2026-08-27"].map((date, i) => ({
        transactionId: BigInt(600 + i),
        walletType: "CARD" as const,
        walletId: 5n,
        categoryId: 12n,
        categoryName: "의료",
        memo: "병원",
        transactionDate: new Date(`${date}T00:00:00.000Z`),
        amount: 35000
      }))
    ]);

    const result = await useCase.execute(1n, "2026-09");

    const [, startDate, beforeDate] = repo.getRecurringSourceTransactions.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(beforeDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(result.next_period_items.card_fixed_items.map((i) => i.item_id)).toEqual([
      "installment-20-4",
      "card-recurring-502"
    ]);
    expect(result.next_period_items.candidates).toEqual([
      expect.objectContaining({
        item_id: "candidate-601",
        source_type: "CARD",
        wallet_id: 5,
        amount: 35000,
        classification: "CANDIDATE"
      })
    ]);
  });

  it("응답에 예정 지출(pending)·기준 월 후보·계산 결과를 포함하지 않는다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    expect(Object.keys(result.base_period_items)).toEqual(["cash_expenses", "card_expenses"]);
    expect(Object.keys(result)).toEqual([
      "base_period",
      "next_period",
      "accounts",
      "cards",
      "base_period_items",
      "next_period_items"
    ]);
  });

  it("오늘(사용자 시간대) 기준 미래 월은 VALIDATION_001로 거부하고 원본을 조회하지 않는다", async () => {
    await expect(useCase.execute(1n, "2026-10")).rejects.toMatchObject({
      code: "VALIDATION_001",
      statusCode: 400
    });
    expect(repo.getAccounts).not.toHaveBeenCalled();
  });

  it("현재 월과 과거 월은 허용한다", async () => {
    await expect(useCase.execute(1n, "2026-09")).resolves.toBeDefined();
    await expect(useCase.execute(1n, "2025-12")).resolves.toBeDefined();
  });

  it("원본 조회 중 오류가 나면 DASHBOARD_002를 반환한다", async () => {
    repo.getCards.mockRejectedValue(new Error("db down"));

    const error = await useCase.execute(1n, "2026-09").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "DASHBOARD_002", statusCode: 500 });
  });
});

describe("BudgetCalculatorSourceQueryDto", () => {
  async function errorsOf(query: Record<string, unknown>) {
    return validate(plainToInstance(BudgetCalculatorSourceQueryDto, query));
  }

  it("base_month가 없거나 형식이 틀리면 검증 오류다", async () => {
    expect(await errorsOf({})).not.toHaveLength(0);
    expect(await errorsOf({ base_month: "2026-13" })).not.toHaveLength(0);
    expect(await errorsOf({ base_month: "2026-9" })).not.toHaveLength(0);
  });

  it("YYYY-MM 형식은 통과한다", async () => {
    expect(await errorsOf({ base_month: "2026-09" })).toHaveLength(0);
  });
});
