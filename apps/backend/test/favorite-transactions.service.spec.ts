import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AppException } from "../src/common/exceptions/app.exception";
import { FavoriteTransactionsService } from "../src/modules/favorite-transactions/application/favorite-transactions.service";
import { FavoriteTransactionsRepository } from "../src/modules/favorite-transactions/infrastructure/favorite-transactions.repository";

describe("FavoriteTransactionsService", () => {
  const created = new Date("2026-10-01T03:20:00.000Z");
  const updated = new Date("2026-10-02T01:00:00.000Z");
  const userId = BigInt(1);

  const makeCategory = (overrides = {}) => ({
    categoryId: BigInt(3),
    userId: null,
    iconId: BigInt(1),
    categoryName: "식비",
    show: true,
    isDefault: true,
    createdAt: created,
    updatedAt: created,
    categoryUserSettings: [] as { show: boolean }[],
    ...overrides
  });

  const makeFavorite = (overrides = {}) => ({
    favoriteTransactionId: BigInt(10),
    userId,
    categoryId: BigInt(3),
    walletId: BigInt(1),
    transactionType: "EXPENSE" as const,
    walletType: "ACCOUNT" as const,
    amount: new Prisma.Decimal(9000),
    memo: "점심",
    deletedYn: false,
    createdAt: created,
    updatedAt: created,
    category: makeCategory(),
    ...overrides
  });

  const makeAccount = (overrides = {}) => ({
    accountId: BigInt(1),
    userId,
    iconId: BigInt(1),
    accountName: "우리은행",
    initialBalance: new Prisma.Decimal(0),
    currentBalance: new Prisma.Decimal(10000),
    allowNegativeBalance: false,
    negativeBalanceLimit: new Prisma.Decimal(0),
    deletedYn: false,
    createdAt: created,
    updatedAt: created,
    ...overrides
  });

  const makeCard = (overrides = {}) => ({
    cardId: BigInt(2),
    userId,
    iconId: BigInt(1),
    cardName: "신한카드",
    useYn: true,
    deletedYn: false,
    createdAt: created,
    updatedAt: created,
    ...overrides
  });

  const repository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findAccountsByIds: jest.fn(),
    findCardsByIds: jest.fn(),
    findActiveAccount: jest.fn(),
    findActiveCard: jest.fn(),
    findCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  } as unknown as jest.Mocked<FavoriteTransactionsRepository>;

  const service = new FavoriteTransactionsService(repository);

  const baseCommand = {
    userId,
    transactionType: "EXPENSE" as const,
    walletType: "ACCOUNT" as const,
    walletId: BigInt(1),
    categoryId: BigInt(3),
    amount: 9000,
    memo: "점심"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findAccountsByIds.mockResolvedValue([]);
    repository.findCardsByIds.mockResolvedValue([]);
  });

  describe("getFavoriteTransactions", () => {
    it("returns items with wallet/category status in repository order", async () => {
      repository.findMany.mockResolvedValue([
        makeFavorite() as any,
        makeFavorite({
          favoriteTransactionId: BigInt(11),
          walletType: "CARD",
          walletId: BigInt(2),
          memo: null
        }) as any
      ]);
      repository.findAccountsByIds.mockResolvedValue([makeAccount() as any]);
      repository.findCardsByIds.mockResolvedValue([makeCard({ useYn: false }) as any]);

      const result = await service.getFavoriteTransactions(userId);

      expect(repository.findAccountsByIds).toHaveBeenCalledWith(userId, [BigInt(1)]);
      expect(repository.findCardsByIds).toHaveBeenCalledWith(userId, [BigInt(2)]);
      expect(result.items).toEqual([
        {
          favorite_transaction_id: 10,
          transaction_type: "EXPENSE",
          wallet_type: "ACCOUNT",
          wallet_id: 1,
          wallet_name: "우리은행",
          wallet_use_yn: true,
          wallet_deleted: false,
          category_id: 3,
          category_name: "식비",
          category_show: true,
          amount: 9000,
          memo: "점심",
          balance_insufficient: false,
          created_at: "2026-10-01T03:20:00.000Z",
          updated_at: "2026-10-01T03:20:00.000Z"
        },
        expect.objectContaining({
          favorite_transaction_id: 11,
          wallet_type: "CARD",
          wallet_name: "신한카드",
          wallet_use_yn: false,
          wallet_deleted: false,
          memo: null,
          balance_insufficient: false
        })
      ]);
    });

    it("marks archived wallets as deleted", async () => {
      repository.findMany.mockResolvedValue([
        makeFavorite() as any,
        makeFavorite({ favoriteTransactionId: BigInt(11), walletType: "CARD", walletId: BigInt(2) }) as any
      ]);
      repository.findAccountsByIds.mockResolvedValue([makeAccount({ deletedYn: true }) as any]);
      repository.findCardsByIds.mockResolvedValue([makeCard({ deletedYn: true }) as any]);

      const { items } = await service.getFavoriteTransactions(userId);

      expect(items.map((item) => item.wallet_deleted)).toEqual([true, true]);
    });

    it("uses the user's hidden setting for default categories", async () => {
      repository.findMany.mockResolvedValue([
        makeFavorite({ category: makeCategory({ categoryUserSettings: [{ show: false }] }) }) as any,
        makeFavorite({
          favoriteTransactionId: BigInt(11),
          category: makeCategory({ isDefault: false, userId, show: false })
        }) as any
      ]);
      repository.findAccountsByIds.mockResolvedValue([makeAccount() as any]);

      const { items } = await service.getFavoriteTransactions(userId);

      expect(items.map((item) => item.category_show)).toEqual([false, false]);
    });

    it.each([
      // [현재 잔액, 마이너스 허용, 한도, 금액, 기대값]
      [10000, false, 0, 10000, false],
      [10000, false, 0, 10001, true],
      [10000, true, 5000, 15000, false],
      [10000, true, 5000, 15001, true]
    ])(
      "balance_insufficient for balance %d (negative %s, limit %d) and amount %d is %s",
      async (balance, allowNegative, limit, amount, expected) => {
        repository.findMany.mockResolvedValue([
          makeFavorite({ amount: new Prisma.Decimal(amount) }) as any
        ]);
        repository.findAccountsByIds.mockResolvedValue([
          makeAccount({
            currentBalance: new Prisma.Decimal(balance),
            allowNegativeBalance: allowNegative,
            negativeBalanceLimit: new Prisma.Decimal(limit)
          }) as any
        ]);

        const { items } = await service.getFavoriteTransactions(userId);

        expect(items[0].balance_insufficient).toBe(expected);
      }
    );

    it("never marks income items as balance insufficient", async () => {
      repository.findMany.mockResolvedValue([
        makeFavorite({ transactionType: "INCOME", amount: new Prisma.Decimal(999999) }) as any
      ]);
      repository.findAccountsByIds.mockResolvedValue([
        makeAccount({ currentBalance: new Prisma.Decimal(0) }) as any
      ]);

      const { items } = await service.getFavoriteTransactions(userId);

      expect(items[0].balance_insufficient).toBe(false);
    });
  });

  describe("createFavoriteTransaction", () => {
    it("saves validated values without date or flags", async () => {
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveAccount.mockResolvedValue(makeAccount() as any);
      repository.create.mockResolvedValue(makeFavorite() as any);

      await expect(service.createFavoriteTransaction(baseCommand)).resolves.toEqual({
        favorite_transaction_id: 10,
        created_at: "2026-10-01T03:20:00.000Z",
        updated_at: "2026-10-01T03:20:00.000Z"
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId,
        transactionType: "EXPENSE",
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        categoryId: BigInt(3),
        amount: 9000,
        memo: "점심"
      });
    });

    it("stores empty memo as null", async () => {
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveAccount.mockResolvedValue(makeAccount() as any);
      repository.create.mockResolvedValue(makeFavorite() as any);

      await service.createFavoriteTransaction({ ...baseCommand, memo: "" });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ memo: null }));
    });

    it("rejects card income", async () => {
      await expect(
        service.createFavoriteTransaction({
          ...baseCommand,
          transactionType: "INCOME",
          walletType: "CARD"
        })
      ).rejects.toMatchObject({
        code: "TX_007",
        statusCode: HttpStatus.BAD_REQUEST
      } satisfies Partial<AppException>);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("rejects non-positive amount", async () => {
      await expect(
        service.createFavoriteTransaction({ ...baseCommand, amount: 0 })
      ).rejects.toMatchObject({ code: "TX_002" });
    });

    it("rejects missing category", async () => {
      repository.findCategory.mockResolvedValue(null);
      await expect(service.createFavoriteTransaction(baseCommand)).rejects.toMatchObject({
        code: "CATEGORY_002",
        statusCode: HttpStatus.NOT_FOUND
      });
    });

    it("rejects missing or archived account", async () => {
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveAccount.mockResolvedValue(null);
      await expect(service.createFavoriteTransaction(baseCommand)).rejects.toMatchObject({
        code: "TX_003"
      });
    });

    it("rejects missing, inactive or archived card", async () => {
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveCard.mockResolvedValue(null);
      await expect(
        service.createFavoriteTransaction({
          ...baseCommand,
          walletType: "CARD",
          walletId: BigInt(2)
        })
      ).rejects.toMatchObject({ code: "TX_004" });
    });

    it("does not check balance on save", async () => {
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveAccount.mockResolvedValue(
        makeAccount({ currentBalance: new Prisma.Decimal(0) }) as any
      );
      repository.create.mockResolvedValue(makeFavorite() as any);

      await expect(
        service.createFavoriteTransaction({ ...baseCommand, amount: 1000000 })
      ).resolves.toMatchObject({ favorite_transaction_id: 10 });
    });
  });

  describe("updateFavoriteTransaction", () => {
    it("updates values without touching created_at", async () => {
      repository.findById.mockResolvedValue(makeFavorite() as any);
      repository.findCategory.mockResolvedValue(makeCategory() as any);
      repository.findActiveCard.mockResolvedValue(makeCard() as any);
      repository.update.mockResolvedValue(makeFavorite({ updatedAt: updated }) as any);

      await expect(
        service.updateFavoriteTransaction(BigInt(10), {
          ...baseCommand,
          walletType: "CARD",
          walletId: BigInt(2),
          memo: undefined
        })
      ).resolves.toEqual({
        favorite_transaction_id: 10,
        created_at: "2026-10-01T03:20:00.000Z",
        updated_at: "2026-10-02T01:00:00.000Z"
      });
      expect(repository.update).toHaveBeenCalledWith(BigInt(10), {
        transactionType: "EXPENSE",
        walletType: "CARD",
        walletId: BigInt(2),
        categoryId: BigInt(3),
        amount: 9000,
        memo: null
      });
    });

    it("rejects missing or deleted item", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.updateFavoriteTransaction(BigInt(99), baseCommand)
      ).rejects.toMatchObject({ code: "FAVORITE_001", statusCode: HttpStatus.NOT_FOUND });
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteFavoriteTransaction", () => {
    it("soft deletes the item", async () => {
      repository.findById.mockResolvedValue(makeFavorite() as any);
      repository.update.mockResolvedValue(makeFavorite({ deletedYn: true }) as any);

      await expect(service.deleteFavoriteTransaction(BigInt(10), userId)).resolves.toEqual({
        favorite_transaction_id: 10
      });
      expect(repository.update).toHaveBeenCalledWith(BigInt(10), { deletedYn: true });
    });

    it("rejects missing or deleted item", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.deleteFavoriteTransaction(BigInt(99), userId)).rejects.toMatchObject({
        code: "FAVORITE_001"
      });
    });
  });
});
