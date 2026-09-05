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
