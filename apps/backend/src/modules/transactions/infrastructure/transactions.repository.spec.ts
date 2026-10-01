import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { TransactionsRepository } from "./transactions.repository";

// 미래 날짜 거래 제외(#443): 오늘 이후 날짜의 할부가 아닌 거래만 빠지고 할부 회차는 남아야 한다.
describe("TransactionsRepository - 미래 날짜 거래 제외 (#443)", () => {
  const visibleUntil = new Date("2026-10-25T00:00:00.000Z");
  const visibleFilter = {
    OR: [{ transactionDate: { lte: visibleUntil } }, { installmentId: { not: null } }]
  };

  let prisma: {
    transaction: { findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock };
  };
  let repository: TransactionsRepository;

  beforeEach(() => {
    prisma = {
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } })
      }
    };
    repository = new TransactionsRepository(prisma as unknown as PrismaService);
  });

  function whereOf(mock: jest.Mock): Prisma.TransactionWhereInput {
    return mock.mock.calls[0][0].where;
  }

  it("목록·건수 조회는 오늘까지의 거래 또는 할부 회차만 조회한다", async () => {
    const condition = {
      userId: 1n,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-31"),
      visibleUntil
    };

    await repository.findMany(condition, 1, 20, [{ transactionDate: "desc" }]);
    await repository.count(condition);

    for (const mock of [prisma.transaction.findMany, prisma.transaction.count]) {
      const where = whereOf(mock);
      expect(where.AND).toEqual([visibleFilter]);
      // 기간 조건은 그대로 유지된다(end_date가 오늘 이후여도 위 조건으로 걸러진다).
      expect(where.transactionDate).toEqual({
        gte: new Date("2026-10-01"),
        lte: new Date("2026-10-31")
      });
    }
  });

  it("키워드 조건과 지갑 다중 선택(OR)이 있어도 미래 날짜 조건과 함께 적용된다", async () => {
    await repository.count({
      userId: 1n,
      keyword: "넷플릭스",
      walletRefs: [
        { walletType: "CARD", walletId: 1n },
        { walletType: "CARD", walletId: 2n }
      ],
      visibleUntil
    });

    const where = whereOf(prisma.transaction.count);
    expect(where.AND).toHaveLength(2);
    expect((where.AND as Prisma.TransactionWhereInput[])[1]).toEqual(visibleFilter);
    expect((where.AND as Prisma.TransactionWhereInput[])[0]).toHaveProperty("OR");
    expect(where.OR).toEqual([
      { walletType: "CARD", walletId: 1n },
      { walletType: "CARD", walletId: 2n }
    ]);
  });

  it("visibleUntil이 없으면 기존 조회 조건을 바꾸지 않는다", async () => {
    await repository.count({ userId: 1n });

    expect(whereOf(prisma.transaction.count)).not.toHaveProperty("AND");
  });

  it("카드 기간 사용액도 같은 기준으로 미래 날짜의 할부가 아닌 거래를 제외한다", async () => {
    await repository.sumCardExpense(
      1n,
      3n,
      new Date("2026-10-01"),
      new Date("2026-10-31"),
      visibleUntil
    );

    const where = whereOf(prisma.transaction.aggregate);
    expect(where).toMatchObject({
      userId: 1n,
      walletType: "CARD",
      walletId: 3n,
      transactionType: "EXPENSE",
      deletedYn: false,
      ...visibleFilter
    });
  });
});
