import { HttpStatus } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AppException } from "../src/common/exceptions/app.exception";
import { StatisticsService } from "../src/modules/statistics/application/statistics.service";
import { StatisticsRepository } from "../src/modules/statistics/infrastructure/statistics.repository";

const decimal = (value: number) => ({ toNumber: () => value }) as Prisma.Decimal;

describe("StatisticsService", () => {
  const statisticsRepository = {
    groupAmountsByTransactionType: jest.fn(),
    groupDailyAmountsByTransactionType: jest.fn(),
    groupAmountsByCategory: jest.fn()
  } as unknown as jest.Mocked<StatisticsRepository>;

  const service = new StatisticsService(statisticsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns monthly income and expense totals with daily items", async () => {
    statisticsRepository.groupAmountsByTransactionType.mockResolvedValue([
      { transactionType: "INCOME", amount: decimal(300000), transactionCount: 1 },
      { transactionType: "EXPENSE", amount: decimal(50000), transactionCount: 2 }
    ]);
    statisticsRepository.groupDailyAmountsByTransactionType.mockResolvedValue([
      {
        transactionDate: new Date("2026-06-01T00:00:00.000Z"),
        transactionType: "INCOME",
        amount: decimal(300000),
        transactionCount: 1
      },
      {
        transactionDate: new Date("2026-06-02T00:00:00.000Z"),
        transactionType: "EXPENSE",
        amount: decimal(50000),
        transactionCount: 2
      }
    ]);

    const result = await service.getMonthlyStatistics({
      userId: BigInt(1),
      month: "2026-06"
    });

    expect(result).toMatchObject({
      month: "2026-06",
      wallet_type: null,
      income_amount: 300000,
      expense_amount: 50000,
      net_amount: 250000,
      transaction_count: 3,
      daily_items: [
        {
          date: "2026-06-01",
          income_amount: 300000,
          expense_amount: 0,
          transaction_count: 1
        },
        {
          date: "2026-06-02",
          income_amount: 0,
          expense_amount: 50000,
          transaction_count: 2
        }
      ]
    });
    expect(statisticsRepository.groupAmountsByTransactionType).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z")
      })
    );
  });

  it("returns category statistics with rounded ratios and limit", async () => {
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([
      {
        categoryId: BigInt(1),
        amount: decimal(20000),
        transactionCount: 2,
        category: { categoryName: "Food", iconId: BigInt(11) }
      },
      {
        categoryId: BigInt(2),
        amount: decimal(10000),
        transactionCount: 1,
        category: { categoryName: "Cafe", iconId: BigInt(12) }
      }
    ]);

    const result = await service.getCategoryStatistics({
      userId: BigInt(1),
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      limit: 1
    });

    expect(result).toMatchObject({
      start_date: "2026-06-01",
      end_date: "2026-06-30",
      total_amount: 30000,
      items: [
        {
          category_id: 1,
          category_name: "Food",
          icon_id: 11,
          amount: 20000,
          transaction_count: 2,
          ratio: 66.67
        }
      ]
    });
    expect(statisticsRepository.groupAmountsByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ transactionType: "EXPENSE" })
    );
  });

  it("groups period statistics by month", async () => {
    statisticsRepository.groupDailyAmountsByTransactionType.mockResolvedValue([
      {
        transactionDate: new Date("2026-05-31T00:00:00.000Z"),
        transactionType: "EXPENSE",
        amount: decimal(10000),
        transactionCount: 1
      },
      {
        transactionDate: new Date("2026-06-01T00:00:00.000Z"),
        transactionType: "INCOME",
        amount: decimal(50000),
        transactionCount: 1
      },
      {
        transactionDate: new Date("2026-06-02T00:00:00.000Z"),
        transactionType: "EXPENSE",
        amount: decimal(7000),
        transactionCount: 1
      }
    ]);

    const result = await service.getPeriodStatistics({
      userId: BigInt(1),
      startDate: "2026-05-01",
      endDate: "2026-06-30",
      groupBy: "MONTH"
    });

    expect(result).toMatchObject({
      income_amount: 50000,
      expense_amount: 17000,
      net_amount: 33000,
      items: [
        {
          period: "2026-05",
          income_amount: 0,
          expense_amount: 10000,
          transaction_count: 1
        },
        {
          period: "2026-06",
          income_amount: 50000,
          expense_amount: 7000,
          transaction_count: 2
        }
      ]
    });
  });

  it("rejects invalid date range", async () => {
    await expect(
      service.getPeriodStatistics({
        userId: BigInt(1),
        startDate: "2026-07-01",
        endDate: "2026-06-30"
      })
    ).rejects.toMatchObject({
      code: "STAT_002",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects card income category statistics", async () => {
    await expect(
      service.getCategoryStatistics({
        userId: BigInt(1),
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        transactionType: "INCOME",
        walletType: "CARD",
        limit: 10
      })
    ).rejects.toMatchObject({
      code: "STAT_002",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });
});
