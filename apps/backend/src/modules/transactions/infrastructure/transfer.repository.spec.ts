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
