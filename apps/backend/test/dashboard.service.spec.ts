import { DashboardService } from "../src/modules/dashboard/application/dashboard.service";
import { DashboardRepository } from "../src/modules/dashboard/infrastructure/dashboard.repository";

describe("DashboardService.getDashboard — 기간 계산 (calcPeriod)", () => {
  const repo = {
    getUser: jest.fn(),
    getAssetSummary: jest.fn(),
    getSpendingSummary: jest.fn(),
    getRecentTransactions: jest.fn(),
    getLastSyncedAt: jest.fn()
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
