import { TransactionType } from "@prisma/client";
import { PrismaService } from "../src/database/prisma.service";
import { DashboardRepository } from "../src/modules/dashboard/infrastructure/dashboard.repository";

describe("DashboardRepository", () => {
  const prisma = {
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn()
    },
    account: {
      findMany: jest.fn().mockResolvedValue([])
    },
    card: {
      findMany: jest.fn().mockResolvedValue([])
    }
  } as unknown as jest.Mocked<PrismaService>;

  const repository = new DashboardRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies category statistics exclusion only to spending summary aggregates", async () => {
    prisma.transaction.aggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: { transactionId: 0 }
    });

    await repository.getSpendingSummary(
      BigInt(1),
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z")
    );

    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: TransactionType.INCOME,
          category: {
            categoryUserSettings: {
              none: {
                userId: BigInt(1),
                includeInStatistics: false
              }
            }
          }
        })
      })
    );
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: TransactionType.EXPENSE,
          category: expect.any(Object)
        })
      })
    );
  });

  describe("getCashExpenseForecastAmounts", () => {
    const startDate = new Date("2026-09-01T00:00:00.000Z");
    const endDate = new Date("2026-09-30T00:00:00.000Z");

    it("계좌는 체크된 지출만(체크된 계좌이동 보내는 쪽 포함), 카드는 할부 회차 포함 지출 전체를 통계 제외 설정 없이 집계한다", async () => {
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null, interest: null } });

      await repository.getCashExpenseForecastAmounts(BigInt(1), startDate, endDate);

      const baseWhere = {
        userId: BigInt(1),
        deletedYn: false,
        transactionType: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate }
      };
      // 계좌 집계에는 계좌이동 제외 조건이 없어야 체크된 계좌이동 보내는 쪽 거래가 포함된다(#426 리오픈).
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: { ...baseWhere, walletType: "ACCOUNT", nextMonthCashYn: true },
        _sum: { amount: true }
      });
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          ...baseWhere,
          walletType: "CARD",
          transferGroupId: null,
          category: { categoryName: { not: "계좌금액이동" } }
        },
        _sum: { amount: true, interest: true }
      });
    });

    it("카드 금액에는 할부 이자를 더하고, 결과가 없으면 0을 반환한다", async () => {
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 50000 } } })
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 30000 }, interest: 1200 } });

      await expect(
        repository.getCashExpenseForecastAmounts(BigInt(1), startDate, endDate)
      ).resolves.toEqual({ account_checked_expense_amount: 50000, card_expense_amount: 31200 });

      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null, interest: null } });
      await expect(
        repository.getCashExpenseForecastAmounts(BigInt(1), startDate, endDate)
      ).resolves.toEqual({ account_checked_expense_amount: 0, card_expense_amount: 0 });
    });
  });

  describe("getRecentTransactions", () => {
    it("includes the first installment leg but excludes later legs, and does not restrict the date range to the current month", async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      await repository.getRecentTransactions(BigInt(1), 5);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: BigInt(1),
            deletedYn: false,
            OR: [{ installmentId: null }, { installmentSeq: 1 }],
            transferGroupId: null,
            category: { categoryName: { not: "계좌금액이동" } }
          },
          orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
          take: 5
        })
      );
    });

    it("excludes account-transfer transactions at the query level so the requested limit is always filled — both transferGroupId-tagged transfers and legacy category-name-only transfers (created before the transferGroupId column existed)", async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      await repository.getRecentTransactions(BigInt(1), 6);

      const [args] = prisma.transaction.findMany.mock.calls[0];
      expect(args.where.transferGroupId).toBe(null);
      expect(args.where.category).toEqual({ categoryName: { not: "계좌금액이동" } });
      expect(args.take).toBe(6);
    });

    it("returns installment details for the first installment leg", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          transactionId: BigInt(10),
          walletType: "CARD",
          walletId: BigInt(1),
          categoryId: BigInt(1),
          category: { categoryName: "쇼핑" },
          transactionType: "EXPENSE",
          amount: { toNumber: () => 100000 },
          interest: 0,
          memo: null,
          transactionDate: new Date("2026-08-01T00:00:00.000Z"),
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          updatedAt: new Date("2026-08-01T00:00:00.000Z"),
          installmentSeq: 1,
          installmentTotalCount: 3,
          cardInstallment: { originalAmount: { toNumber: () => 300000 } }
        }
      ] as unknown as never);

      const [item] = await repository.getRecentTransactions(BigInt(1), 5);

      expect(item.installment_seq).toBe(1);
      expect(item.installment_total_count).toBe(3);
      expect(item.installment_original_amount).toBe(300000);
    });
  });
});
