import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AppException } from "../src/common/exceptions/app.exception";
import { GetBudgetCalculatorSourceUseCase } from "../src/modules/dashboard/application/use-cases/get-budget-calculator-source.use-case";
import { BudgetCalculatorRepository } from "../src/modules/dashboard/infrastructure/budget-calculator.repository";
import { BudgetCalculatorSourceQueryDto } from "../src/modules/dashboard/presentation/dto/request/budget-calculator-source-query.dto";

function expense(
  id: number,
  date: string,
  amount: number,
  overrides: Partial<{ walletId: bigint; interest: number; memo: string; categoryName: string }> = {}
) {
  return {
    transactionId: BigInt(id),
    walletId: 1n,
    categoryName: "생활",
    memo: "메모",
    transactionDate: new Date(`${date}T00:00:00.000Z`),
    amount,
    interest: 0,
    ...overrides
  };
}

describe("GetBudgetCalculatorSourceUseCase", () => {
  const repo = {
    getUserTimezoneSetting: jest.fn(),
    getAccounts: jest.fn(),
    getCards: jest.fn(),
    getAccountBalanceDeltasUntil: jest.fn(),
    getCashSameUseExpenses: jest.fn(),
    getCardExpensesInPeriod: jest.fn(),
    getCardInstallmentsInPeriod: jest.fn(),
    getCardFixedExpensesInPeriod: jest.fn()
  } as unknown as jest.Mocked<BudgetCalculatorRepository>;
  const useCase = new GetBudgetCalculatorSourceUseCase(repo);

  beforeEach(() => {
    jest.clearAllMocks();
    // 사용자 시간대(Asia/Seoul) 기준 오늘은 2026-09-20이다.
    jest.useFakeTimers().setSystemTime(new Date("2026-09-20T03:00:00.000Z"));
    repo.getUserTimezoneSetting.mockResolvedValue("Asia/Seoul");
    repo.getAccounts.mockResolvedValue([
      { accountId: 1n, accountName: "생활비 통장", initialBalance: 1000000 },
      { accountId: 2n, accountName: "적금 통장", initialBalance: 0 }
    ]);
    repo.getCards.mockResolvedValue([{ cardId: 5n, cardName: "신한카드" }]);
    repo.getAccountBalanceDeltasUntil.mockResolvedValue(new Map([["1", 300000]]));
    repo.getCashSameUseExpenses.mockResolvedValue([
      { ...expense(100, "2026-09-05", 200000, { memo: "보험료" }), accountName: "생활비 통장" },
      {
        ...expense(101, "2026-09-10", 300000, { categoryName: "계좌금액이동", memo: "적금" }),
        accountName: "생활비 통장"
      }
    ]);
    repo.getCardExpensesInPeriod.mockResolvedValue([
      expense(200, "2026-09-18", 50000, { walletId: 5n, interest: 1500 })
    ]);
    repo.getCardInstallmentsInPeriod.mockResolvedValue([
      {
        ...expense(300, "2026-10-10", 80000, { walletId: 5n, interest: 2000, memo: "냉장고" }),
        installmentId: 20n,
        installmentSeq: 4
      }
    ]);
    repo.getCardFixedExpensesInPeriod.mockResolvedValue([
      expense(400, "2026-09-25", 55000, { walletId: 5n, memo: "통신비" })
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("이번 달이면 오늘(사용자 시간대)까지의 거래로 계좌 잔액을 재구성한다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    const [, accountIds, balanceDate] = repo.getAccountBalanceDeltasUntil.mock.calls[0];
    expect(accountIds).toEqual([1n, 2n]);
    expect(balanceDate.toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(result.balance_date).toBe("2026-09-20");
    expect(result.accounts).toEqual([
      { account_id: 1, account_name: "생활비 통장", balance: 1300000 },
      { account_id: 2, account_name: "적금 통장", balance: 0 }
    ]);
  });

  it("이번 달 요청이면 base_date를 읽지 않는다", async () => {
    const result = await useCase.execute(1n, "2026-09", "2026-09-01");

    expect(result.balance_date).toBe("2026-09-20");
  });

  it("지난달이면 입력한 잔액 기준일까지의 거래로 잔액을 재구성한다", async () => {
    const result = await useCase.execute(1n, "2026-08", "2026-08-31");

    const [, , balanceDate] = repo.getAccountBalanceDeltasUntil.mock.calls[0];
    expect(balanceDate.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(result.balance_date).toBe("2026-08-31");
    expect(result.base_period).toEqual({ year: 2026, month: 8, start_date: "2026-08-01", end_date: "2026-08-31" });
    expect(result.next_period).toEqual({ year: 2026, month: 9, start_date: "2026-09-01", end_date: "2026-09-30" });
  });

  it("지난달의 잔액 기준일은 오늘까지 허용하고 범위 제한은 두지 않는다", async () => {
    await expect(useCase.execute(1n, "2026-08", "2026-09-20")).resolves.toBeDefined();
    await expect(useCase.execute(1n, "2026-08", "2025-01-15")).resolves.toBeDefined();
  });

  it.each([
    ["2026-08", undefined, "잔액 기준일을 입력해 주세요."],
    ["2026-08", "2026-02-30", "잔액 기준일 형식이 올바르지 않습니다."],
    ["2026-08", "2026-09-21", "오늘 이후 날짜는 잔액 기준일로 선택할 수 없습니다."],
    ["2026-07", "2026-07-31", "이번 달 또는 지난달만 선택할 수 있습니다."],
    ["2026-10", undefined, "이번 달 또는 지난달만 선택할 수 있습니다."]
  ])("base_month=%s, base_date=%s는 VALIDATION_001로 거부하고 원본을 조회하지 않는다", async (month, date, message) => {
    await expect(useCase.execute(1n, month, date)).rejects.toMatchObject({
      code: "VALIDATION_001",
      statusCode: 400,
      message
    });
    expect(repo.getAccounts).not.toHaveBeenCalled();
  });

  it("1월이면 지난달은 전년도 12월이다", async () => {
    jest.setSystemTime(new Date("2027-01-05T03:00:00.000Z"));

    await expect(useCase.execute(1n, "2026-12", "2026-12-31")).resolves.toBeDefined();
  });

  it("기준 월의 현금 동일 사용 지출(계좌이동 보내는 쪽 포함)을 기준 월 기간으로 조회해 항목 단위로 반환한다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    const [, startDate, endDate] = repo.getCashSameUseExpenses.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(result.cash_same_use_expenses).toEqual([
      {
        transaction_id: 100,
        account_id: 1,
        account_name: "생활비 통장",
        category_name: "생활",
        memo: "보험료",
        transaction_date: "2026-09-05",
        amount: 200000
      },
      {
        transaction_id: 101,
        account_id: 1,
        account_name: "생활비 통장",
        category_name: "계좌금액이동",
        memo: "적금",
        transaction_date: "2026-09-10",
        amount: 300000
      }
    ]);
  });

  it("카드 사용액·다음 달 할부·카드 고정지출은 amount + interest로 반환한다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    const [, nextStart, nextEnd] = repo.getCardInstallmentsInPeriod.mock.calls[0];
    expect(nextStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(nextEnd.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(result.base_period_card_expenses[0]).toMatchObject({
      card_id: 5,
      amount: 50000,
      interest: 1500,
      total_amount: 51500
    });
    expect(result.next_period_installments).toEqual([
      {
        item_id: "installment-20-4",
        card_id: 5,
        category_name: "생활",
        memo: "냉장고",
        transaction_date: "2026-10-10",
        installment_seq: 4,
        total_amount: 82000
      }
    ]);
    expect(result.card_fixed_expenses).toEqual([
      expect.objectContaining({ transaction_id: 400, card_id: 5, total_amount: 55000 })
    ]);
    expect(result.cards).toEqual([{ card_id: 5, card_name: "신한카드" }]);
  });

  it("응답에 계산 결과·반복 판별 항목을 포함하지 않는다", async () => {
    const result = await useCase.execute(1n, "2026-09");

    expect(Object.keys(result)).toEqual([
      "base_period",
      "next_period",
      "balance_date",
      "accounts",
      "cards",
      "cash_same_use_expenses",
      "base_period_card_expenses",
      "next_period_installments",
      "card_fixed_expenses"
    ]);
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

  it("YYYY-MM 형식은 통과하고 base_date는 선택 값이다", async () => {
    expect(await errorsOf({ base_month: "2026-09" })).toHaveLength(0);
    expect(await errorsOf({ base_month: "2026-08", base_date: "2026-08-31" })).toHaveLength(0);
  });
});
