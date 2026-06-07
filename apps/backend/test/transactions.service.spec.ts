import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import { TransactionsService } from "../src/modules/transactions/application/transactions.service";
import { TransactionsRepository } from "../src/modules/transactions/infrastructure/transactions.repository";

describe("TransactionsService", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");

  const makeAccount = (overrides = {}) => ({
    accountId: BigInt(1),
    userId: BigInt(1),
    iconId: BigInt(10),
    accountName: "생활비 통장",
    initialBalance: { toNumber: () => 500000 },
    currentBalance: { toNumber: () => 500000 },
    allowNegativeBalance: false,
    negativeBalanceLimit: { toNumber: () => 0 },
    useYn: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  });

  const makeCard = (overrides = {}) => ({
    cardId: BigInt(2),
    userId: BigInt(1),
    iconId: BigInt(11),
    cardName: "신한카드",
    useYn: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  });

  const makeCategory = (overrides = {}) => ({
    categoryId: BigInt(3),
    userId: null,
    iconId: BigInt(12),
    categoryName: "식비",
    show: true,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  });

  const makeTransaction = (overrides = {}) => ({
    transactionId: BigInt(100),
    userId: BigInt(1),
    categoryId: BigInt(3),
    walletId: BigInt(1),
    syncClientId: null,
    clientTempId: null,
    transactionType: "EXPENSE",
    walletType: "ACCOUNT",
    amount: { toNumber: () => 15000 },
    transactionDate: new Date("2026-05-29"),
    memo: "점심 식사",
    deletedYn: false,
    syncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides
  });

  const transactionsRepository = {
    findAccount: jest.fn(),
    findOwnedAccount: jest.fn(),
    findOwnedCard: jest.fn(),
    findAccountTransactionsForBalance: jest.fn(),
    findCard: jest.fn(),
    findCategory: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    createWithAccountBalanceUpdate: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    softDeleteWithBalance: jest.fn()
  } as unknown as jest.Mocked<TransactionsRepository>;

  const service = new TransactionsService(transactionsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseCommand = {
    userId: BigInt(1),
    walletType: "ACCOUNT" as const,
    walletId: BigInt(1),
    categoryId: BigInt(3),
    transactionType: "EXPENSE" as const,
    amount: 15000,
    transactionDate: "2026-05-29"
  };

  it("rejects INCOME + CARD combination", async () => {
    await expect(
      service.createTransaction({
        ...baseCommand,
        walletType: "CARD",
        transactionType: "INCOME"
      })
    ).rejects.toMatchObject({
      code: "TX_007",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects future date", async () => {
    await expect(
      service.createTransaction({ ...baseCommand, transactionDate: "2026-06-02" })
    ).rejects.toMatchObject({
      code: "TX_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects non-existent category", async () => {
    transactionsRepository.findCategory.mockResolvedValue(null);

    await expect(service.createTransaction(baseCommand)).rejects.toMatchObject({
      code: "CATEGORY_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("rejects non-existent account", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(null);

    await expect(service.createTransaction(baseCommand)).rejects.toMatchObject({
      code: "TX_003",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("rejects when account balance is insufficient for EXPENSE", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 5000 },
        currentBalance: { toNumber: () => 5000 }
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 5000 },
        currentBalance: { toNumber: () => 5000 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);

    await expect(
      service.createTransaction({ ...baseCommand, amount: 10000 })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("allows account EXPENSE within negative balance limit", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 0 },
        currentBalance: { toNumber: () => 0 },
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 }
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 0 },
        currentBalance: { toNumber: () => 0 },
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);
    transactionsRepository.createWithAccountBalanceUpdate.mockResolvedValue(
      makeTransaction({ amount: { toNumber: () => 100000 } }) as any
    );

    await expect(
      service.createTransaction({ ...baseCommand, amount: 100000 })
    ).resolves.toMatchObject({ transaction_id: 100 });
  });

  it("rejects account EXPENSE over negative balance limit", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 0 },
        currentBalance: { toNumber: () => 0 },
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 }
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 0 },
        currentBalance: { toNumber: () => 0 },
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);

    await expect(
      service.createTransaction({ ...baseCommand, amount: 300001 })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("creates account EXPENSE transaction and returns result", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.findOwnedAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);
    transactionsRepository.createWithAccountBalanceUpdate.mockResolvedValue(
      makeTransaction() as any
    );

    const result = await service.createTransaction(baseCommand);

    expect(result).toMatchObject({ transaction_id: 100 });
    expect(transactionsRepository.createWithAccountBalanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionType: "EXPENSE", walletType: "ACCOUNT" }),
      BigInt(1),
      -15000
    );
  });

  it("creates account INCOME transaction with positive balance delta", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.findOwnedAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);
    transactionsRepository.createWithAccountBalanceUpdate.mockResolvedValue(
      makeTransaction({ transactionType: "INCOME" }) as any
    );

    await service.createTransaction({ ...baseCommand, transactionType: "INCOME" });

    expect(transactionsRepository.createWithAccountBalanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionType: "INCOME" }),
      BigInt(1),
      15000
    );
  });

  it("allows account EXPENSE after same-day account INCOME keeps balance non-negative", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 100 },
        currentBalance: { toNumber: () => 1100 }
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 100 },
        currentBalance: { toNumber: () => 1100 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([
      makeTransaction({
        transactionId: BigInt(101),
        transactionType: "INCOME",
        amount: { toNumber: () => 1000 },
        transactionDate: new Date("2026-05-29")
      })
    ] as any);
    transactionsRepository.createWithAccountBalanceUpdate.mockResolvedValue(
      makeTransaction({ amount: { toNumber: () => 1000 } }) as any
    );

    await expect(
      service.createTransaction({ ...baseCommand, amount: 1000 })
    ).resolves.toMatchObject({ transaction_id: 100 });
  });

  it("rejects update when account is archived (WALLET_001)", async () => {
    transactionsRepository.findById.mockResolvedValue(
      makeTransaction({ walletType: "ACCOUNT" }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({ deletedYn: true }) as any
    );

    await expect(
      service.updateTransaction({ transactionId: BigInt(100), userId: BigInt(1), amount: 9000 })
    ).rejects.toMatchObject({
      code: "WALLET_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when card is archived (WALLET_001)", async () => {
    transactionsRepository.findById.mockResolvedValue(
      makeTransaction({ walletType: "CARD", walletId: BigInt(2) }) as any
    );
    transactionsRepository.findOwnedCard.mockResolvedValue(
      makeCard({ deletedYn: true }) as any
    );

    await expect(
      service.updateTransaction({ transactionId: BigInt(100), userId: BigInt(1), amount: 9000 })
    ).rejects.toMatchObject({
      code: "WALLET_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when moving transaction to past date breaks daily balance", async () => {
    transactionsRepository.findById = jest.fn().mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        amount: { toNumber: () => 15000 },
        transactionDate: new Date("2026-05-03")
      }) as any
    );
    transactionsRepository.findAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        initialBalance: { toNumber: () => 10000 },
        currentBalance: { toNumber: () => 22000 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([
      makeTransaction({
        transactionId: BigInt(101),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 8000 },
        transactionDate: new Date("2026-05-01")
      }),
      makeTransaction({
        transactionId: BigInt(100),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 15000 },
        transactionDate: new Date("2026-05-03")
      }),
      makeTransaction({
        transactionId: BigInt(102),
        transactionType: "INCOME",
        amount: { toNumber: () => 20000 },
        transactionDate: new Date("2026-05-04")
      })
    ] as any);

    await expect(
      service.updateTransaction({
        transactionId: BigInt(100),
        userId: BigInt(1),
        transactionDate: "2026-05-02"
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when date change exceeds negative balance limit", async () => {
    transactionsRepository.findById = jest.fn().mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 150000 },
        transactionDate: new Date("2026-05-03")
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 },
        initialBalance: { toNumber: () => 0 },
        currentBalance: { toNumber: () => -350000 }
      }) as any
    );
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 },
        initialBalance: { toNumber: () => 0 }
      }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([
      makeTransaction({
        transactionId: BigInt(101),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 200000 },
        transactionDate: new Date("2026-05-01")
      }),
      makeTransaction({
        transactionId: BigInt(100),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 150000 },
        transactionDate: new Date("2026-05-03")
      })
    ] as any);

    await expect(
      service.updateTransaction({
        transactionId: BigInt(100),
        userId: BigInt(1),
        transactionDate: "2026-05-01"
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when amount increase exceeds account balance", async () => {
    transactionsRepository.findById = jest.fn().mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 100000 },
        transactionDate: new Date("2026-05-01")
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        allowNegativeBalance: false,
        initialBalance: { toNumber: () => 150000 },
        currentBalance: { toNumber: () => 50000 }
      }) as any
    );
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({ initialBalance: { toNumber: () => 150000 } }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([
      makeTransaction({
        transactionId: BigInt(100),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 100000 },
        transactionDate: new Date("2026-05-01")
      })
    ] as any);

    await expect(
      service.updateTransaction({
        transactionId: BigInt(100),
        userId: BigInt(1),
        amount: 200000
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when type change from INCOME to EXPENSE causes balance violation", async () => {
    transactionsRepository.findById = jest.fn().mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "INCOME",
        amount: { toNumber: () => 100000 },
        transactionDate: new Date("2026-05-01")
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({
        allowNegativeBalance: false,
        initialBalance: { toNumber: () => 50000 },
        currentBalance: { toNumber: () => 150000 }
      }) as any
    );
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({ initialBalance: { toNumber: () => 50000 } }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);

    await expect(
      service.updateTransaction({
        transactionId: BigInt(100),
        userId: BigInt(1),
        transactionType: "EXPENSE"
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects update when wallet change would overdraw destination account", async () => {
    transactionsRepository.findById = jest.fn().mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 200000 },
        transactionDate: new Date("2026-05-01")
      }) as any
    );
    transactionsRepository.findOwnedAccount
      .mockResolvedValueOnce(makeAccount({ accountId: BigInt(1), initialBalance: { toNumber: () => 500000 } }) as any)
      .mockResolvedValueOnce(makeAccount({ accountId: BigInt(1), initialBalance: { toNumber: () => 500000 } }) as any)
      .mockResolvedValueOnce(makeAccount({ accountId: BigInt(2), allowNegativeBalance: false, initialBalance: { toNumber: () => 100000 } }) as any);
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({ accountId: BigInt(2), initialBalance: { toNumber: () => 100000 } }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([]);

    await expect(
      service.updateTransaction({
        transactionId: BigInt(100),
        userId: BigInt(1),
        walletId: BigInt(2)
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects non-existent card", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findCard.mockResolvedValue(null);

    await expect(
      service.createTransaction({
        ...baseCommand,
        walletType: "CARD",
        transactionType: "EXPENSE"
      })
    ).rejects.toMatchObject({
      code: "TX_004",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("creates card EXPENSE transaction without account balance update", async () => {
    transactionsRepository.findCategory.mockResolvedValue(makeCategory() as any);
    transactionsRepository.findCard.mockResolvedValue(makeCard() as any);
    transactionsRepository.create.mockResolvedValue(makeTransaction({ walletType: "CARD" }) as any);

    const result = await service.createTransaction({
      ...baseCommand,
      walletType: "CARD",
      transactionType: "EXPENSE"
    });

    expect(result.transaction_id).toBe(100);
    expect(transactionsRepository.create).toHaveBeenCalled();
    expect(transactionsRepository.createWithAccountBalanceUpdate).not.toHaveBeenCalled();
  });

  it("deletes EXPENSE transaction and restores account balance with positive delta", async () => {
    transactionsRepository.findById.mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 15000 }
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(makeAccount() as any);
    transactionsRepository.softDeleteWithBalance.mockResolvedValue(
      makeTransaction({ deletedYn: true }) as any
    );

    await service.deleteTransaction(BigInt(100), BigInt(1));

    expect(transactionsRepository.softDeleteWithBalance).toHaveBeenCalledWith(
      BigInt(100),
      expect.objectContaining({ accountId: BigInt(1), delta: 15000 })
    );
  });

  it("rejects INCOME transaction deletion when removal would cause balance violation", async () => {
    transactionsRepository.findById.mockResolvedValue(
      makeTransaction({
        transactionId: BigInt(100),
        walletType: "ACCOUNT",
        walletId: BigInt(1),
        transactionType: "INCOME",
        amount: { toNumber: () => 50000 },
        transactionDate: new Date("2026-05-01")
      }) as any
    );
    transactionsRepository.findOwnedAccount.mockResolvedValue(
      makeAccount({ allowNegativeBalance: false, initialBalance: { toNumber: () => 0 } }) as any
    );
    transactionsRepository.findAccount.mockResolvedValue(
      makeAccount({ allowNegativeBalance: false, initialBalance: { toNumber: () => 0 } }) as any
    );
    transactionsRepository.findAccountTransactionsForBalance.mockResolvedValue([
      makeTransaction({
        transactionId: BigInt(101),
        transactionType: "EXPENSE",
        amount: { toNumber: () => 30000 },
        transactionDate: new Date("2026-05-02")
      })
    ] as any);

    await expect(
      service.deleteTransaction(BigInt(100), BigInt(1))
    ).rejects.toMatchObject({
      code: "ACCOUNT_004",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });
});
