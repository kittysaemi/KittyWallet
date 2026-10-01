import { PrismaService } from "../../../database/prisma.service";
import { StatisticsRepository } from "./statistics.repository";

// 미래 날짜 거래 제외(#443): 오늘 이후 날짜의 할부가 아닌 거래만 빠지고, 할부는 기존 집계 기준을 따른다.
describe("StatisticsRepository - 미래 날짜 거래 제외 (#443)", () => {
  const visibleUntil = new Date("2026-10-25T00:00:00.000Z");
  const visibleOr = [{ transactionDate: { lte: visibleUntil } }, { installmentId: { not: null } }];
  const condition = {
    userId: 1n,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-31"),
    visibleUntil
  };

  let prisma: {
    transaction: { groupBy: jest.Mock };
    cardInstallment: { groupBy: jest.Mock };
    category: { findMany: jest.Mock };
  };
  let repository: StatisticsRepository;

  beforeEach(() => {
    prisma = {
      transaction: { groupBy: jest.fn().mockResolvedValue([]) },
      cardInstallment: { groupBy: jest.fn().mockResolvedValue([]) },
      category: { findMany: jest.fn().mockResolvedValue([]) }
    };
    repository = new StatisticsRepository(prisma as unknown as PrismaService);
  });

  it.each([
    ["groupAmountsByTransactionType"],
    ["groupDailyAmountsByTransactionType"],
    ["groupAmountsByCategory"],
    ["groupExpensesByWalletAndCategory"],
    ["groupIncomesByWalletAndCategory"],
    ["groupDailyExpenseAmountsByInstallmentOrigin"],
    ["groupCategoryAmountsByInstallmentOrigin"]
  ] as const)("%s는 오늘까지의 거래 또는 할부 회차만 집계한다", async (method) => {
    await repository[method](condition);

    const where = prisma.transaction.groupBy.mock.calls[0][0].where;
    expect(where.OR).toEqual(visibleOr);
    expect(where.transactionDate).toEqual({
      gte: new Date("2026-10-01"),
      lte: new Date("2026-10-31")
    });
  });

  it("할부 원금 집계(구매일 기준)는 미래 날짜 조건을 적용하지 않는다", async () => {
    await repository.groupCategoryAmountsByInstallmentOrigin(condition);

    const installmentWhere = prisma.cardInstallment.groupBy.mock.calls[0][0].where;
    expect(installmentWhere).not.toHaveProperty("OR");
    expect(installmentWhere).not.toHaveProperty("transactionDate");
  });

  it("visibleUntil이 없으면 기존 집계 조건을 바꾸지 않는다", async () => {
    await repository.groupAmountsByTransactionType({ userId: 1n });

    expect(prisma.transaction.groupBy.mock.calls[0][0].where).not.toHaveProperty("OR");
  });
});
