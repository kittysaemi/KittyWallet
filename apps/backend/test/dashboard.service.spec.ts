import { DashboardService } from "../src/modules/dashboard/application/dashboard.service";
import { DashboardRepository } from "../src/modules/dashboard/infrastructure/dashboard.repository";

describe("DashboardService.getDashboard — 기간 계산 (calcPeriod)", () => {
  const repo = {
    getUser: jest.fn(),
    getAssetSummary: jest.fn(),
    getSpendingSummary: jest.fn(),
    getRecentTransactions: jest.fn(),
    getLastSyncedAt: jest.fn(),
    getCashExpenseForecastAmounts: jest.fn()
  } as unknown as jest.Mocked<DashboardRepository>;
  const service = new DashboardService(repo);

  let originalTz: string | undefined;

  beforeAll(() => {
    originalTz = process.env.TZ;
    // 서버 프로세스가 UTC보다 서쪽 시간대로 동작하는 경우를 재현한다.
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.getUser.mockResolvedValue({ userId: BigInt(1), nickname: "tester" });
    repo.getAssetSummary.mockResolvedValue({
      total_asset_amount: 0,
      account_count: 0,
      card_count: 0,
      active_card_count: 0
    });
    repo.getSpendingSummary.mockResolvedValue({
      income_amount: 0,
      expense_amount: 0,
      card_expense_amount: 0,
      net_amount: 0,
      transaction_count: 0
    });
    repo.getRecentTransactions.mockResolvedValue([]);
    repo.getLastSyncedAt.mockResolvedValue(null);
    repo.getCashExpenseForecastAmounts.mockResolvedValue({
      account_checked_expense_amount: 0,
      card_expense_amount: 0
    });
  });

  it("MONTH 기간은 base_date가 속한 달의 1일부터 base_date까지다", async () => {
    await service.getDashboard(BigInt(1), { base_date: "2026-08-01", summary_period: "MONTH" });

    const [, startDate, endDate] = repo.getSpendingSummary.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-08-01T23:59:59.999Z");
  });

  it("WEEK 기간은 base_date로부터 6일 전까지다", async () => {
    await service.getDashboard(BigInt(1), { base_date: "2026-08-10", summary_period: "WEEK" });

    const [, startDate, endDate] = repo.getSpendingSummary.mock.calls[0];
    expect(startDate.toISOString().split("T")[0]).toBe("2026-08-04");
    expect(endDate.toISOString().split("T")[0]).toBe("2026-08-10");
  });

  it("TODAY 기간은 base_date 하루로 고정된다", async () => {
    await service.getDashboard(BigInt(1), { base_date: "2026-08-01", summary_period: "TODAY" });

    const [, startDate, endDate] = repo.getSpendingSummary.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-08-01T23:59:59.999Z");
  });

  it("월 경계를 넘는 MONTH 기간도 서버 로컬 시간대와 무관하게 정확하다", async () => {
    await service.getDashboard(BigInt(1), { base_date: "2026-03-01", summary_period: "MONTH" });

    const [, startDate] = repo.getSpendingSummary.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("DashboardService.getDashboard — 현금 지출 예상 (cash_expense_forecast)", () => {
  const repo = {
    getUser: jest.fn(),
    getAssetSummary: jest.fn(),
    getSpendingSummary: jest.fn(),
    getRecentTransactions: jest.fn(),
    getLastSyncedAt: jest.fn(),
    getCashExpenseForecastAmounts: jest.fn()
  } as unknown as jest.Mocked<DashboardRepository>;
  const service = new DashboardService(repo);

  let originalTz: string | undefined;

  beforeAll(() => {
    originalTz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.getUser.mockResolvedValue({ userId: BigInt(1), nickname: "tester" });
    repo.getAssetSummary.mockResolvedValue({
      total_asset_amount: 0,
      account_count: 0,
      card_count: 0,
      active_card_count: 0
    });
    repo.getSpendingSummary.mockResolvedValue({
      income_amount: 0,
      expense_amount: 0,
      card_expense_amount: 0,
      net_amount: 0,
      transaction_count: 0
    });
    repo.getRecentTransactions.mockResolvedValue([]);
    repo.getLastSyncedAt.mockResolvedValue(null);
    repo.getCashExpenseForecastAmounts.mockResolvedValue({
      account_checked_expense_amount: 120000,
      card_expense_amount: 80000
    });
  });

  it("base_date가 속한 달의 1일~말일을 집계하고 대상 월은 다음 달이다", async () => {
    const result = await service.getDashboard(BigInt(1), {
      base_date: "2026-09-15",
      summary_period: "WEEK"
    });

    const [, startDate, endDate] = repo.getCashExpenseForecastAmounts.mock.calls[0];
    expect(startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(result.cash_expense_forecast).toEqual({
      target_year: 2026,
      target_month: 10,
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      account_checked_expense_amount: 120000,
      card_expense_amount: 80000,
      total_amount: 200000
    });
  });

  it("12월 기준이면 대상은 다음 해 1월이다", async () => {
    const result = await service.getDashboard(BigInt(1), { base_date: "2026-12-03" });

    expect(result.cash_expense_forecast.target_year).toBe(2027);
    expect(result.cash_expense_forecast.target_month).toBe(1);
    expect(result.cash_expense_forecast.end_date).toBe("2026-12-31");
  });

  it("윤년 2월의 말일을 정확히 계산한다", async () => {
    const result = await service.getDashboard(BigInt(1), { base_date: "2028-02-10" });

    expect(result.cash_expense_forecast.start_date).toBe("2028-02-01");
    expect(result.cash_expense_forecast.end_date).toBe("2028-02-29");
    expect(result.cash_expense_forecast.target_month).toBe(3);
  });

  it("대상 거래가 없으면 0원이다", async () => {
    repo.getCashExpenseForecastAmounts.mockResolvedValue({
      account_checked_expense_amount: 0,
      card_expense_amount: 0
    });

    const result = await service.getDashboard(BigInt(1), { base_date: "2026-09-15" });

    expect(result.cash_expense_forecast.total_amount).toBe(0);
  });
});
