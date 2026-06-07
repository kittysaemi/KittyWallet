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
    groupAmountsByCategory: jest.fn(),
    groupExpensesByWalletTypeAndCategory: jest.fn()
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

  it("returns summary statistics with top category", async () => {
    statisticsRepository.groupAmountsByTransactionType.mockResolvedValue([
      { transactionType: "INCOME", amount: decimal(500000), transactionCount: 2 },
      { transactionType: "EXPENSE", amount: decimal(200000), transactionCount: 5 }
    ]);
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([
      {
        categoryId: BigInt(1),
        amount: decimal(150000),
        transactionCount: 3,
        category: { categoryName: "식비", iconId: BigInt(3) }
      },
      {
        categoryId: BigInt(2),
        amount: decimal(50000),
        transactionCount: 2,
        category: { categoryName: "교통", iconId: BigInt(5) }
      }
    ]);

    const result = await service.getSummaryStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result).toMatchObject({
      month: "2026-06",
      income_amount: 500000,
      expense_amount: 200000,
      net_amount: 300000,
      transaction_count: 7,
      top_category: { category_id: 1, category_name: "식비", icon_id: 3, amount: 150000 }
    });
  });

  it("returns null top_category when no expense transactions", async () => {
    statisticsRepository.groupAmountsByTransactionType.mockResolvedValue([]);
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([]);

    const result = await service.getSummaryStatistics({ userId: BigInt(1), month: "2026-01" });

    expect(result.top_category).toBeNull();
    expect(result.expense_amount).toBe(0);
  });

  it("returns category-top with 기타 when more than 5 categories", async () => {
    const makeGroup = (id: number, amount: number) => ({
      categoryId: BigInt(id),
      amount: decimal(amount),
      transactionCount: 1,
      category: { categoryName: `Cat${id}`, iconId: BigInt(id) }
    });
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([
      makeGroup(1, 60000),
      makeGroup(2, 50000),
      makeGroup(3, 40000),
      makeGroup(4, 30000),
      makeGroup(5, 20000),
      makeGroup(6, 10000),
      makeGroup(7, 5000)
    ]);

    const result = await service.getCategoryTopStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.items).toHaveLength(6);
    expect(result.items[0].rank).toBe(1);
    expect(result.items[4].rank).toBe(5);
    const others = result.items[5];
    expect(others.category_name).toBe("기타");
    expect(others.rank).toBeNull();
    expect(others.amount).toBe(15000);
    expect(result.total_expense).toBe(215000);
  });

  it("returns category-top without 기타 when 5 or fewer categories", async () => {
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([
      { categoryId: BigInt(1), amount: decimal(30000), transactionCount: 1, category: { categoryName: "Cat1", iconId: BigInt(1) } }
    ]);

    const result = await service.getCategoryTopStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.items).toHaveLength(1);
    expect(result.items.some((i: { category_name: string }) => i.category_name === "기타")).toBe(false);
  });

  it("returns calendar statistics with max daily expense", async () => {
    statisticsRepository.groupDailyAmountsByTransactionType.mockResolvedValue([
      { transactionDate: new Date("2026-06-01T00:00:00.000Z"), transactionType: "EXPENSE", amount: decimal(30000), transactionCount: 1 },
      { transactionDate: new Date("2026-06-03T00:00:00.000Z"), transactionType: "EXPENSE", amount: decimal(80000), transactionCount: 2 }
    ]);

    const result = await service.getCalendarStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.month).toBe("2026-06");
    expect(result.max_daily_expense).toBe(80000);
    expect(result.daily_items).toEqual([
      { date: "2026-06-01", expense_amount: 30000 },
      { date: "2026-06-03", expense_amount: 80000 }
    ]);
  });

  it("returns empty calendar when no expense data", async () => {
    statisticsRepository.groupDailyAmountsByTransactionType.mockResolvedValue([]);

    const result = await service.getCalendarStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.max_daily_expense).toBe(0);
    expect(result.daily_items).toEqual([]);
  });

  it("returns sankey nodes and links for mixed wallet/category data", async () => {
    statisticsRepository.groupExpensesByWalletTypeAndCategory.mockResolvedValue([
      { walletType: "ACCOUNT", categoryId: BigInt(1), amount: decimal(100000), category: { categoryName: "식비", iconId: BigInt(3) } },
      { walletType: "CARD", categoryId: BigInt(1), amount: decimal(50000), category: { categoryName: "식비", iconId: BigInt(3) } },
      { walletType: "CARD", categoryId: BigInt(2), amount: decimal(30000), category: { categoryName: "교통", iconId: BigInt(5) } }
    ]);
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([
      { categoryId: BigInt(1), amount: decimal(150000), transactionCount: 2, category: { categoryName: "식비", iconId: BigInt(3) } },
      { categoryId: BigInt(2), amount: decimal(30000), transactionCount: 1, category: { categoryName: "교통", iconId: BigInt(5) } }
    ]);

    const result = await service.getSankeyStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.total_expense).toBe(180000);
    expect(result.nodes.find((n: { id: string }) => n.id === "total")?.value).toBe(180000);
    expect(result.nodes.find((n: { id: string }) => n.id === "account")?.value).toBe(100000);
    expect(result.nodes.find((n: { id: string }) => n.id === "card")?.value).toBe(80000);
    expect(result.links.some((l: { source: string; target: string }) => l.source === "total" && l.target === "account")).toBe(true);
    expect(result.links.some((l: { source: string; target: string }) => l.source === "account" && l.target === "cat_1")).toBe(true);
  });

  it("returns empty sankey when no expense data", async () => {
    statisticsRepository.groupExpensesByWalletTypeAndCategory.mockResolvedValue([]);
    statisticsRepository.groupAmountsByCategory.mockResolvedValue([]);

    const result = await service.getSankeyStatistics({ userId: BigInt(1), month: "2026-06" });

    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
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
