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
});
