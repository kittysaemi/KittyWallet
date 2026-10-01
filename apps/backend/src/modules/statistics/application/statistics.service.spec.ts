import { HttpStatus } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { StatisticsRepository } from "../infrastructure/statistics.repository";
import { StatisticsService } from "./statistics.service";

function makeDecimal(n: number): Decimal {
  return new Decimal(n);
}

function makeCategoryGroup(overrides: Partial<{
  categoryId: bigint;
  amount: Decimal | null;
  transactionCount: number;
  category: { categoryName: string; iconId: bigint } | null;
}> = {}) {
  return {
    categoryId: 1n,
    amount: makeDecimal(50000),
    transactionCount: 3,
    category: { categoryName: "식비", iconId: 5n },
    ...overrides
  };
}

const mockRepo = {
  groupAmountsByTransactionType: jest.fn(),
  groupDailyAmountsByTransactionType: jest.fn(),
  groupAmountsByCategory: jest.fn(),
  groupCategoryAmountsByInstallmentOrigin: jest.fn(),
  groupExpensesByWalletAndCategory: jest.fn(),
  groupIncomesByWalletAndCategory: jest.fn(),
  groupDailyExpenseAmountsByInstallmentOrigin: jest.fn(),
  getUserTimezoneSetting: jest.fn()
} as unknown as StatisticsRepository;

const service = new StatisticsService(mockRepo);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("StatisticsService.getCategoryExpenseStatistics", () => {
  describe("period_type=all", () => {
    it("날짜 범위 없이 EXPENSE 지출을 카테고리별로 집계한다", async () => {
      (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([
        makeCategoryGroup({ categoryId: 1n, amount: makeDecimal(90000), transactionCount: 5 }),
        makeCategoryGroup({ categoryId: 2n, amount: makeDecimal(30000), transactionCount: 2, category: { categoryName: "교통", iconId: 7n } })
      ]);

      const result = await service.getCategoryExpenseStatistics({
        userId: 1n,
        periodType: "all"
      });

      const call = (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mock.calls[0][0];
      expect(call.transactionType).toBe("EXPENSE");
      expect(call.startDate).toBeUndefined();
      expect(call.endDate).toBeUndefined();

      expect(result.period_type).toBe("all");
      expect(result.total_amount).toBe(120000);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].category_name).toBe("식비");
      expect(result.items[0].amount).toBe(90000);
      expect(result.items[0].ratio).toBe(75);
      expect(result.items[1].category_name).toBe("교통");
      expect(result.items[1].ratio).toBe(25);
    });

    it("데이터가 없을 때 빈 items를 반환한다", async () => {
      (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([]);

      const result = await service.getCategoryExpenseStatistics({
        userId: 1n,
        periodType: "all"
      });

      expect(result.total_amount).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("period_type=year", () => {
    it("해당 연도의 1월 1일 ~ 12월 31일 범위로 집계한다", async () => {
      (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([
        makeCategoryGroup()
      ]);

      await service.getCategoryExpenseStatistics({
        userId: 1n,
        periodType: "year",
        year: "2025"
      });

      const call = (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mock.calls[0][0];
      expect(call.startDate).toEqual(new Date(Date.UTC(2025, 0, 1)));
      expect(call.endDate).toEqual(new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)));
      expect(call.transactionType).toBe("EXPENSE");
    });

    it("year 파라미터 없이 year 타입 요청 시 예외를 던진다", async () => {
      await expect(
        service.getCategoryExpenseStatistics({ userId: 1n, periodType: "year" })
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  describe("period_type=month", () => {
    it("해당 월의 첫날 ~ 마지막날 범위로 집계한다", async () => {
      (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([
        makeCategoryGroup()
      ]);

      await service.getCategoryExpenseStatistics({
        userId: 1n,
        periodType: "month",
        month: "2026-03"
      });

      const call = (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mock.calls[0][0];
      expect(call.startDate).toEqual(new Date(Date.UTC(2026, 2, 1)));
      expect(call.endDate).toEqual(new Date(Date.UTC(2026, 3, 0)));
    });

    it("month 파라미터 없이 month 타입 요청 시 예외를 던진다", async () => {
      await expect(
        service.getCategoryExpenseStatistics({ userId: 1n, periodType: "month" })
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it("잘못된 month 포맷 요청 시 예외를 던진다", async () => {
      await expect(
        service.getCategoryExpenseStatistics({ userId: 1n, periodType: "month", month: "2026-13" })
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  describe("ratio 계산", () => {
    it("카테고리 비율이 소수점 2자리로 반올림된다", async () => {
      (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([
        makeCategoryGroup({ categoryId: 1n, amount: makeDecimal(10000), transactionCount: 1 }),
        makeCategoryGroup({ categoryId: 2n, amount: makeDecimal(20000), transactionCount: 1, category: { categoryName: "교통", iconId: 7n } })
      ]);

      const result = await service.getCategoryExpenseStatistics({
        userId: 1n,
        periodType: "all"
      });

      expect(result.items[0].ratio).toBe(33.33);
      expect(result.items[1].ratio).toBe(66.67);
    });
  });
});

describe("StatisticsService - 미래 날짜 거래 제외 (#443)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // 2026-10-24 15:30 UTC = 2026-10-25 00:30 Asia/Seoul
    jest.setSystemTime(new Date("2026-10-24T15:30:00Z"));
    (mockRepo.getUserTimezoneSetting as jest.Mock).mockResolvedValue("Asia/Seoul");
    (mockRepo.groupAmountsByTransactionType as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupDailyAmountsByTransactionType as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupAmountsByCategory as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupCategoryAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupExpensesByWalletAndCategory as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupIncomesByWalletAndCategory as jest.Mock).mockResolvedValue([]);
    (mockRepo.groupDailyExpenseAmountsByInstallmentOrigin as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const visibleUntil = new Date("2026-10-25T00:00:00.000Z");
  const repoMethods = [
    "groupAmountsByTransactionType",
    "groupDailyAmountsByTransactionType",
    "groupAmountsByCategory",
    "groupCategoryAmountsByInstallmentOrigin",
    "groupExpensesByWalletAndCategory",
    "groupIncomesByWalletAndCategory",
    "groupDailyExpenseAmountsByInstallmentOrigin"
  ] as const;

  function expectAllCallsUseVisibleUntil() {
    let callCount = 0;
    for (const method of repoMethods) {
      for (const [condition] of (mockRepo[method] as jest.Mock).mock.calls) {
        expect(condition.visibleUntil).toEqual(visibleUntil);
        callCount++;
      }
    }
    expect(callCount).toBeGreaterThan(0);
  }

  it.each([
    ["월별", () => service.getMonthlyStatistics({ userId: 1n, month: "2026-10" })],
    [
      "카테고리별",
      () =>
        service.getCategoryStatistics({
          userId: 1n,
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          limit: 10
        })
    ],
    [
      "기간별",
      () =>
        service.getPeriodStatistics({ userId: 1n, startDate: "2026-10-01", endDate: "2026-10-31" })
    ],
    ["요약", () => service.getSummaryStatistics({ userId: 1n, month: "2026-10" })],
    ["Top 5", () => service.getCategoryTopStatistics({ userId: 1n, month: "2026-10" })],
    ["히트맵", () => service.getCalendarStatistics({ userId: 1n, month: "2026-10" })],
    ["지출 Sankey", () => service.getSankeyStatistics({ userId: 1n, month: "2026-10" })],
    ["수입 Sankey", () => service.getSankeyIncomeStatistics({ userId: 1n, month: "2026-10" })],
    [
      "카테고리별 지출합계",
      () => service.getCategoryExpenseStatistics({ userId: 1n, periodType: "all" })
    ]
  ])("%s 통계는 사용자 설정 timezone 기준 오늘을 집계 조건에 전달한다", async (_name, run) => {
    await run();
    expect(mockRepo.getUserTimezoneSetting).toHaveBeenCalledWith(1n);
    expectAllCallsUseVisibleUntil();
  });
});
