import { TransactionType } from "@prisma/client";
import { PrismaService } from "../src/database/prisma.service";
import { StatisticsRepository } from "../src/modules/statistics/infrastructure/statistics.repository";

describe("StatisticsRepository", () => {
  const prisma = {
    transaction: {
      groupBy: jest.fn()
    },
    cardInstallment: {
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

  describe("groupDailyExpenseAmountsByInstallmentOrigin", () => {
    const condition = {
      userId: BigInt(1),
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      transactionType: TransactionType.EXPENSE
    };

    it("할부가 아닌 거래만 transactionDate 기준으로 합산한다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.cardInstallment.groupBy.mockResolvedValue([]);

      await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["transactionDate"],
          where: expect.objectContaining({
            transactionType: TransactionType.EXPENSE,
            installmentId: null
          })
        })
      );
    });

    it("할부는 purchaseDate 기준으로 originalAmount를 합산한다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.cardInstallment.groupBy.mockResolvedValue([]);

      await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(prisma.cardInstallment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["purchaseDate"],
          _sum: { originalAmount: true },
          where: expect.objectContaining({
            deletedYn: false,
            purchaseDate: { gte: condition.startDate, lte: condition.endDate }
          })
        })
      );
    });

    it("같은 날짜의 일반 지출과 할부 원금을 합산해 하나의 항목으로 만든다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([
        {
          transactionDate: new Date("2026-06-01T00:00:00.000Z"),
          _sum: { amount: { toNumber: () => 30000 }, interest: 0 }
        }
      ] as never);
      prisma.cardInstallment.groupBy.mockResolvedValue([
        {
          purchaseDate: new Date("2026-06-01T00:00:00.000Z"),
          _sum: { originalAmount: { toNumber: () => 300000 } }
        }
      ] as never);

      const result = await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(result).toHaveLength(1);
      expect(result[0].transactionDate.toISOString()).toBe("2026-06-01T00:00:00.000Z");
      expect(result[0].amount?.toNumber()).toBe(330000);
    });

    it("할부 원금은 구매일 하루에만 반영되고 회차 날짜에는 반영되지 않는다", async () => {
      // 6/1 구매한 3개월 할부 300,000원. 회차 거래(6/1, 7/1, 8/1)는 installmentId가 있어
      // 첫 번째 pass에서 제외되고, 구매일인 6/1에만 원금이 1회 잡힌다.
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.cardInstallment.groupBy.mockResolvedValue([
        {
          purchaseDate: new Date("2026-06-01T00:00:00.000Z"),
          _sum: { originalAmount: { toNumber: () => 300000 } }
        }
      ] as never);

      const result = await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(result).toEqual([
        expect.objectContaining({ transactionDate: new Date("2026-06-01T00:00:00.000Z") })
      ]);
      expect(result[0].amount?.toNumber()).toBe(300000);
    });

    it("날짜 오름차순으로 정렬해 반환한다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([
        {
          transactionDate: new Date("2026-06-10T00:00:00.000Z"),
          _sum: { amount: { toNumber: () => 10000 }, interest: 0 }
        }
      ] as never);
      prisma.cardInstallment.groupBy.mockResolvedValue([
        {
          purchaseDate: new Date("2026-06-02T00:00:00.000Z"),
          _sum: { originalAmount: { toNumber: () => 50000 } }
        }
      ] as never);

      const result = await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(result.map((r) => r.transactionDate.toISOString())).toEqual([
        "2026-06-02T00:00:00.000Z",
        "2026-06-10T00:00:00.000Z"
      ]);
    });

    it("계좌로 필터링한 경우 할부 pass를 실행하지 않는다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);

      await repository.groupDailyExpenseAmountsByInstallmentOrigin({
        ...condition,
        walletType: "ACCOUNT"
      });

      expect(prisma.cardInstallment.groupBy).not.toHaveBeenCalled();
    });

    it("카드로 필터링한 경우 해당 카드의 할부만 집계한다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.cardInstallment.groupBy.mockResolvedValue([]);

      await repository.groupDailyExpenseAmountsByInstallmentOrigin({
        ...condition,
        walletType: "CARD",
        walletId: BigInt(7)
      });

      expect(prisma.cardInstallment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cardId: BigInt(7) })
        })
      );
    });

    it("통계 제외 카테고리는 할부 집계에서도 제외한다", async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.cardInstallment.groupBy.mockResolvedValue([]);

      await repository.groupDailyExpenseAmountsByInstallmentOrigin(condition);

      expect(prisma.cardInstallment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: {
              categoryUserSettings: {
                none: { userId: BigInt(1), includeInStatistics: false }
              }
            }
          })
        })
      );
    });
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
