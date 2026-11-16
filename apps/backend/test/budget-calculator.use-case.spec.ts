import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AppException } from "../src/common/exceptions/app.exception";
import { GetBudgetCalculatorSourceUseCase } from "../src/modules/dashboard/application/use-cases/get-budget-calculator-source.use-case";
import { BudgetCalculatorRepository } from "../src/modules/dashboard/infrastructure/budget-calculator.repository";
import { BudgetCalculatorSourceQueryDto } from "../src/modules/dashboard/presentation/dto/request/budget-calculator-source-query.dto";

describe("GetBudgetCalculatorSourceUseCase", () => {
  const repo = {
    getUserTimezoneSetting: jest.fn(),
    getAccounts: jest.fn(),
    getAccountBalanceDeltasUntil: jest.fn(),
    getCardTotalInPeriod: jest.fn()
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
    repo.getAccountBalanceDeltasUntil.mockResolvedValue(new Map([["1", 300000]]));
    repo.getCardTotalInPeriod.mockResolvedValue({ totalAmount: 232000, transactionCount: 3 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("기준 잔액은 계산 기간과 무관하게 오늘(사용자 시간대)까지의 거래로 재구성한다", async () => {
    const result = await useCase.execute(1n, "2026-08-01", "2026-08-31");

    const [, accountIds, balanceDate] = repo.getAccountBalanceDeltasUntil.mock.calls[0];
    expect(accountIds).toEqual([1n, 2n]);
    expect(balanceDate.toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(result.balance_date).toBe("2026-09-20");
    expect(result.accounts).toEqual([
      { account_id: 1, account_name: "생활비 통장", balance: 1300000 },
      { account_id: 2, account_name: "적금 통장", balance: 0 }
    ]);
  });

  it("사용자 시간대의 오늘을 기준으로 한다", async () => {
    // UTC 2026-09-20 16:00은 Asia/Seoul로 2026-09-21 01:00이다.
    jest.setSystemTime(new Date("2026-09-20T16:00:00.000Z"));

    const result = await useCase.execute(1n, "2026-09-21", "2026-09-30");

    expect(result.balance_date).toBe("2026-09-21");
  });

  it("계산 기간(양 끝 포함)의 카드 사용액 합계와 거래 건수를 반환한다", async () => {
    const result = await useCase.execute(1n, "2026-09-01", "2026-09-30");

    const [, startDate, endDate] = repo.getCardTotalInPeriod.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(result.period).toEqual({ start_date: "2026-09-01", end_date: "2026-09-30" });
    expect(result.card_total_amount).toBe(232000);
    expect(result.card_transaction_count).toBe(3);
  });

  it("시작일은 오늘까지 허용하고 종료일의 미래 날짜와 오래된 시작일도 허용한다", async () => {
    await expect(useCase.execute(1n, "2026-09-20", "2026-09-20")).resolves.toBeDefined();
    await expect(useCase.execute(1n, "2026-09-01", "2027-12-31")).resolves.toBeDefined();
    await expect(useCase.execute(1n, "2020-01-01", "2026-09-30")).resolves.toBeDefined();
  });

  it.each([
    ["2026-09-1", "2026-09-30", "계산 기간 형식이 올바르지 않습니다."],
    ["2026-09-01", "2026-02-30", "계산 기간 형식이 올바르지 않습니다."],
    ["2026-09-21", "2026-09-30", "시작일은 오늘 이후 날짜로 선택할 수 없습니다."],
    ["2026-09-15", "2026-09-10", "시작일은 종료일보다 늦을 수 없습니다."]
  ])(
    "start_date=%s, end_date=%s는 VALIDATION_001로 거부하고 원본을 조회하지 않는다",
    async (start, end, message) => {
      await expect(useCase.execute(1n, start, end)).rejects.toMatchObject({
        code: "VALIDATION_001",
        statusCode: 400,
        message
      });
      expect(repo.getAccounts).not.toHaveBeenCalled();
      expect(repo.getCardTotalInPeriod).not.toHaveBeenCalled();
    }
  );

  it("응답에 계산 결과·현금 고정지출·최소 유지금액·거래 항목 목록을 포함하지 않는다", async () => {
    const result = await useCase.execute(1n, "2026-09-01", "2026-09-30");

    expect(Object.keys(result)).toEqual([
      "period",
      "balance_date",
      "accounts",
      "card_total_amount",
      "card_transaction_count"
    ]);
  });

  it("원본 조회 중 오류가 나면 DASHBOARD_002를 반환한다", async () => {
    repo.getAccounts.mockRejectedValue(new Error("db down"));

    const error = await useCase.execute(1n, "2026-09-01", "2026-09-30").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "DASHBOARD_002", statusCode: 500 });
  });
});

describe("BudgetCalculatorSourceQueryDto", () => {
  async function errorsOf(query: Record<string, unknown>) {
    return validate(plainToInstance(BudgetCalculatorSourceQueryDto, query));
  }

  it("start_date·end_date가 없거나 형식이 틀리면 검증 오류다", async () => {
    expect(await errorsOf({})).not.toHaveLength(0);
    expect(await errorsOf({ start_date: "2026-09-01" })).not.toHaveLength(0);
    expect(await errorsOf({ end_date: "2026-09-30" })).not.toHaveLength(0);
    expect(await errorsOf({ start_date: "2026-9-1", end_date: "2026-09-30" })).not.toHaveLength(0);
    expect(await errorsOf({ start_date: "2026-13-01", end_date: "2026-09-30" })).not.toHaveLength(0);
  });

  it("YYYY-MM-DD 형식의 두 날짜는 통과한다", async () => {
    expect(await errorsOf({ start_date: "2026-09-01", end_date: "2026-09-30" })).toHaveLength(0);
  });
});
