import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { TransferRepository } from "./transfer.repository";

function makeTx() {
  return {
    category: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    icon: {
      findFirst: jest.fn()
    },
    categoryUserSetting: {
      upsert: jest.fn()
    }
  } as unknown as Prisma.TransactionClient;
}

describe("TransferRepository - findOrCreateTransferCategory (#389 후속)", () => {
  let repository: TransferRepository;

  beforeEach(() => {
    repository = new TransferRepository({} as unknown as PrismaService);
  });

  it("계좌이동 카테고리를 처음 생성할 때 통계 제외(includeInStatistics: false) 설정도 함께 만든다", async () => {
    const tx = makeTx();
    (tx.category.findFirst as jest.Mock)
      .mockResolvedValueOnce(null) // 사용자 소유 카테고리 없음
      .mockResolvedValueOnce(null); // 기본 카테고리도 없음
    (tx.icon.findFirst as jest.Mock).mockResolvedValueOnce({ iconId: 5n });
    (tx.category.create as jest.Mock).mockResolvedValue({
      categoryId: 99n,
      userId: 1n,
      categoryName: "계좌금액이동"
    });
    (tx.categoryUserSetting.upsert as jest.Mock).mockResolvedValue({});

    const category = await repository.findOrCreateTransferCategory(tx, 1n);

    expect(category.categoryId).toBe(99n);
    expect(tx.categoryUserSetting.upsert).toHaveBeenCalledTimes(1);
    const callArg = (tx.categoryUserSetting.upsert as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toEqual({ userId_categoryId: { userId: 1n, categoryId: 99n } });
    expect(callArg.create).toMatchObject({ show: true, includeInStatistics: false });
  });

  it("이미 사용자 소유의 계좌이동 카테고리가 있으면 재사용하고 새로 설정을 만들지 않는다", async () => {
    const tx = makeTx();
    (tx.category.findFirst as jest.Mock).mockResolvedValueOnce({
      categoryId: 42n,
      userId: 1n,
      categoryName: "계좌금액이동"
    });

    const category = await repository.findOrCreateTransferCategory(tx, 1n);

    expect(category.categoryId).toBe(42n);
    expect(tx.category.create).not.toHaveBeenCalled();
    expect(tx.categoryUserSetting.upsert).not.toHaveBeenCalled();
  });
});

describe("TransferRepository - findAccountsByIds / findAccountsByIdsReadOnly", () => {
  let repository: TransferRepository;
  let prisma: { account: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { account: { findMany: jest.fn() } };
    repository = new TransferRepository(prisma as unknown as PrismaService);
  });

  it("deletedYn 필터 없이 계좌를 조회한다(삭제된 계좌도 포함해 이름을 표시하기 위함)", async () => {
    prisma.account.findMany.mockResolvedValue([]);

    await repository.findAccountsByIds(prisma as unknown as PrismaService, [1n, 2n], 1n);

    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { accountId: { in: [1n, 2n] }, userId: 1n }
    });
  });

  it("findAccountsByIdsReadOnly는 트랜잭션 없이 findAccountsByIds를 위임 호출한다", async () => {
    const accounts = [{ accountId: 2n, accountName: "삭제된계좌", deletedYn: true }];
    prisma.account.findMany.mockResolvedValue(accounts);

    const result = await repository.findAccountsByIdsReadOnly([2n], 1n);

    expect(result).toBe(accounts);
    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { accountId: { in: [2n] }, userId: 1n }
    });
  });
});

describe("TransferRepository - n월 현금 동일 사용 (next_month_cash_yn, #426 리오픈)", () => {
  let repository: TransferRepository;
  let tx: Prisma.TransactionClient;

  beforeEach(() => {
    repository = new TransferRepository({} as unknown as PrismaService);
    tx = {
      transaction: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
      account: { update: jest.fn().mockResolvedValue({}) }
    } as unknown as Prisma.TransactionClient;
  });

  it("생성 시 체크 값은 보내는 쪽(EXPENSE) 거래에만 저장하고 받는 쪽에는 넣지 않는다", async () => {
    await repository.createTransferPair(tx, {
      userId: 1n,
      categoryId: 9n,
      fromAccountId: 1n,
      toAccountId: 2n,
      amount: 10000,
      transactionDate: new Date("2026-06-20"),
      transferGroupId: "group-1",
      nextMonthCashYn: true,
      now: new Date("2026-06-20T03:00:00Z")
    });

    const [[fromArgs], [toArgs]] = (tx.transaction.create as jest.Mock).mock.calls;
    expect(fromArgs.data).toMatchObject({ transactionType: "EXPENSE", nextMonthCashYn: true });
    expect(toArgs.data.transactionType).toBe("INCOME");
    expect(toArgs.data).not.toHaveProperty("nextMonthCashYn");
  });

  it("수정 시 체크 값은 보내는 쪽 거래에만 반영하고, 미전달이면 어느 쪽도 건드리지 않는다", async () => {
    const baseInput = {
      fromTransactionId: 101n,
      toTransactionId: 102n,
      fromAccountId: 1n,
      toAccountId: 2n,
      amount: 10000,
      transactionDate: new Date("2026-06-20"),
      hasMemoUpdate: false
    };

    await repository.updateTransferPair(tx, { ...baseInput, nextMonthCashYn: true }, []);
    const [[fromArgs], [toArgs]] = (tx.transaction.update as jest.Mock).mock.calls;
    expect(fromArgs).toMatchObject({ where: { transactionId: 101n }, data: { nextMonthCashYn: true } });
    expect(toArgs.data).not.toHaveProperty("nextMonthCashYn");

    (tx.transaction.update as jest.Mock).mockClear();
    await repository.updateTransferPair(tx, baseInput, []);
    for (const [args] of (tx.transaction.update as jest.Mock).mock.calls) {
      expect(args.data).not.toHaveProperty("nextMonthCashYn");
    }
  });
});
