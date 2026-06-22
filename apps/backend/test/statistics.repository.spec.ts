import { TransactionType } from "@prisma/client";
import { PrismaService } from "../src/database/prisma.service";
import { StatisticsRepository } from "../src/modules/statistics/infrastructure/statistics.repository";

describe("StatisticsRepository", () => {
  const prisma = {
    transaction: {
      groupBy: jest.fn()
    },
    category: {
      findMany: jest.fn()
    },
    account: {
      findMany: jest.fn()
    },
    card: {
      findMany: jest.fn()
    }
  } as unknown as jest.Mocked<PrismaService>;

  const repository = new StatisticsRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("excludes categories disabled for statistics from transaction type aggregation", async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await repository.groupAmountsByTransactionType({
      userId: BigInt(1),
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z")
    });

    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
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
  });

  it("keeps show independent when applying category statistics exclusion", async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await repository.groupAmountsByCategory({
      userId: BigInt(1),
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      transactionType: TransactionType.EXPENSE
    });

    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          show: expect.anything()
        })
      })
    );
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: expect.objectContaining({
            categoryUserSettings: expect.any(Object)
          })
        })
      })
    );
  });

  it("지출 집계 시 interest를 amount에 합산한다", async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      {
        transactionType: TransactionType.EXPENSE,
        _sum: { amount: { toNumber: () => 10000 }, interest: 500 },
        _count: { transactionId: 1 }
      }
    ] as never);

    const result = await repository.groupAmountsByTransactionType({
      userId: BigInt(1),
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z")
    });

    const expense = result.find((r) => r.transactionType === TransactionType.EXPENSE);
    expect(expense?.amount.toNumber()).toBe(10500);
  });

  it("통계 집계는 Transaction.amount와 interest만 사용하며 CardInstallment.originalAmount를 직접 조회하지 않는다", async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await repository.groupAmountsByTransactionType({
      userId: BigInt(1),
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z")
    });

    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: expect.objectContaining({ amount: true, interest: true })
      })
    );
    expect(prisma.transaction.groupBy).not.toHaveBeenCalledWith(
      expect.objectContaining({ _sum: expect.objectContaining({ originalAmount: true }) })
    );
  });
});
