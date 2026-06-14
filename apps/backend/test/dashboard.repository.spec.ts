import { TransactionType } from "@prisma/client";
import { PrismaService } from "../src/database/prisma.service";
import { DashboardRepository } from "../src/modules/dashboard/infrastructure/dashboard.repository";

describe("DashboardRepository", () => {
  const prisma = {
    transaction: {
      aggregate: jest.fn()
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
});
