import { PrismaService } from "../src/database/prisma.service";
import {
  CreateInstallmentInput,
  FindTransactionsCondition,
  TransactionsRepository
} from "../src/modules/transactions/infrastructure/transactions.repository";

// 거래내역 목록 필터 조립(#353). buildWhere는 private이라 findMany를 통해 실제로 Prisma에
// 전달되는 where 절을 검증한다.
describe("TransactionsRepository.findMany where clause", () => {
  const findManyMock = jest.fn().mockResolvedValue([]);
  const prisma = {
    transaction: { findMany: findManyMock }
  } as unknown as PrismaService;
  const repository = new TransactionsRepository(prisma);

  const baseCondition: FindTransactionsCondition = { userId: BigInt(1) };

  const whereOf = async (condition: FindTransactionsCondition) => {
    await repository.findMany(condition, 1, 20, [{ transactionDate: "desc" }]);
    return findManyMock.mock.calls.at(-1)![0].where;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters by an IN clause when multiple category ids are given", async () => {
    const where = await whereOf({
      ...baseCondition,
      categoryIds: [BigInt(1), BigInt(2)]
    });

    expect(where.categoryId).toEqual({ in: [BigInt(1), BigInt(2)] });
  });

  it("prefers the multi-select category ids over the single category id", async () => {
    const where = await whereOf({
      ...baseCondition,
      categoryId: BigInt(9),
      categoryIds: [BigInt(1)]
    });

    expect(where.categoryId).toEqual({ in: [BigInt(1)] });
  });

  it("keeps the single category id filter working for callers that send only that", async () => {
    const where = await whereOf({ ...baseCondition, categoryId: BigInt(9) });

    expect(where.categoryId).toBe(BigInt(9));
  });

  it("matches multi-selected wallets as (type, id) pairs so ACCOUNT:1 and CARD:1 stay distinct", async () => {
    const where = await whereOf({
      ...baseCondition,
      walletRefs: [
        { walletType: "ACCOUNT", walletId: BigInt(1) },
        { walletType: "CARD", walletId: BigInt(1) }
      ]
    });

    expect(where.OR).toEqual([
      { walletType: "ACCOUNT", walletId: BigInt(1) },
      { walletType: "CARD", walletId: BigInt(1) }
    ]);
    expect(where.walletType).toBeUndefined();
    expect(where.walletId).toBeUndefined();
  });

  it("keeps the single wallet_type/wallet_id filter working for callers that send only those", async () => {
    const where = await whereOf({
      ...baseCondition,
      walletType: "CARD",
      walletId: BigInt(3)
    });

    expect(where).toMatchObject({ walletType: "CARD", walletId: BigInt(3) });
    expect(where.OR).toBeUndefined();
  });

  it("excludes installment transactions when excludeInstallment is set", async () => {
    const where = await whereOf({ ...baseCondition, excludeInstallment: true });

    expect(where.installmentId).toBeNull();
  });

  it("does not touch installmentId when excludeInstallment is not set", async () => {
    const where = await whereOf(baseCondition);

    expect("installmentId" in where).toBe(false);
  });

  // 키워드 검색(#353): 메모만이 아니라 카테고리명·계좌명·카드명도 검색한다.
  it("matches the keyword against memo, category name and name-matched wallets", async () => {
    const where = await whereOf({
      ...baseCondition,
      keyword: "마운자로",
      keywordWalletRefs: [
        { walletType: "ACCOUNT", walletId: BigInt(3) },
        { walletType: "CARD", walletId: BigInt(4) }
      ]
    });

    expect(where.AND).toEqual([
      {
        OR: [
          { memo: { contains: "마운자로", mode: "insensitive" } },
          { category: { categoryName: { contains: "마운자로", mode: "insensitive" } } },
          { walletType: "ACCOUNT", walletId: BigInt(3) },
          { walletType: "CARD", walletId: BigInt(4) }
        ]
      }
    ]);
    expect("memo" in where).toBe(false);
  });

  it("keeps the keyword OR separate from the multi-selected wallet OR", async () => {
    const where = await whereOf({
      ...baseCondition,
      keyword: "식비",
      walletRefs: [{ walletType: "CARD", walletId: BigInt(1) }]
    });

    expect(where.OR).toEqual([{ walletType: "CARD", walletId: BigInt(1) }]);
    expect(where.AND[0].OR).toHaveLength(2);
  });

  it("adds no keyword condition when keyword is not given", async () => {
    const where = await whereOf(baseCondition);

    expect("AND" in where).toBe(false);
  });
});

describe("TransactionsRepository.findWalletRefsByName", () => {
  it("finds the user accounts and cards whose name contains the keyword as wallet refs", async () => {
    const accountFindMany = jest.fn().mockResolvedValue([{ accountId: BigInt(3) }]);
    const cardFindMany = jest.fn().mockResolvedValue([{ cardId: BigInt(4) }]);
    const repository = new TransactionsRepository({
      account: { findMany: accountFindMany },
      card: { findMany: cardFindMany }
    } as unknown as PrismaService);

    const refs = await repository.findWalletRefsByName(BigInt(1), "생활");

    expect(refs).toEqual([
      { walletType: "ACCOUNT", walletId: BigInt(3) },
      { walletType: "CARD", walletId: BigInt(4) }
    ]);
    expect(accountFindMany.mock.calls[0][0].where).toEqual({
      userId: BigInt(1),
      accountName: { contains: "생활", mode: "insensitive" }
    });
    expect(cardFindMany.mock.calls[0][0].where).toEqual({
      userId: BigInt(1),
      cardName: { contains: "생활", mode: "insensitive" }
    });
  });
});

describe("TransactionsRepository.createInstallmentWithTransactions", () => {
  const tx = {
    cardInstallment: { create: jest.fn() },
    transaction: { create: jest.fn() }
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx))
  } as unknown as PrismaService;
  const repository = new TransactionsRepository(prisma);

  const baseInput: CreateInstallmentInput = {
    userId: BigInt(1),
    cardId: BigInt(1),
    categoryId: BigInt(1),
    originalAmount: 300000,
    installmentMonths: 3,
    purchaseDate: new Date("2026-08-01"),
    memo: null
  };

  let originalTz: string | undefined;

  beforeAll(() => {
    originalTz = process.env.TZ;
    // 서버 프로세스가 UTC보다 서쪽 시간대로 실행되는 경우를 재현한다. 로컬 타임존 getter로
    // 계산하면 이 경우 날짜가 하루 앞으로(예: 08-01 -> 07-31) 밀린다.
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tx.cardInstallment.create.mockResolvedValue({ installmentId: BigInt(1) });
    tx.transaction.create.mockImplementation(({ data }: { data: { transactionDate: Date } }) =>
      Promise.resolve({ transactionId: BigInt(1), ...data })
    );
  });

  it("keeps the purchase date as-is for the first installment regardless of server-local timezone", async () => {
    await repository.createInstallmentWithTransactions(baseInput, new Date());

    const firstCallData = tx.transaction.create.mock.calls[0][0].data;
    expect(firstCallData.transactionDate.toISOString().split("T")[0]).toBe("2026-08-01");
  });

  it("advances each subsequent installment by one calendar month in UTC", async () => {
    await repository.createInstallmentWithTransactions(baseInput, new Date());

    const dates = tx.transaction.create.mock.calls.map(
      ([{ data }]: [{ data: { transactionDate: Date } }]) => data.transactionDate.toISOString().split("T")[0]
    );
    expect(dates).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });

  it("clamps to the last day of a shorter target month", async () => {
    await repository.createInstallmentWithTransactions(
      { ...baseInput, purchaseDate: new Date("2026-01-31"), installmentMonths: 2 },
      new Date()
    );

    const dates = tx.transaction.create.mock.calls.map(
      ([{ data }]: [{ data: { transactionDate: Date } }]) => data.transactionDate.toISOString().split("T")[0]
    );
    // 1월 31일 + 1개월 -> 2월은 31일이 없으므로 2월 28일(2026년은 평년)로 보정
    expect(dates).toEqual(["2026-01-31", "2026-02-28"]);
  });
});
