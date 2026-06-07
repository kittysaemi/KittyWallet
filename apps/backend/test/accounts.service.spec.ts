import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import { AccountsService } from "../src/modules/accounts/application/accounts.service";
import { AccountsRepository } from "../src/modules/accounts/infrastructure/accounts.repository";

describe("AccountsService", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

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

  const accountsRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findDuplicateName: jest.fn(),
    findAvailableIcon: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn()
  } as unknown as jest.Mocked<AccountsRepository>;

  const service = new AccountsService(accountsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns account list with balance", async () => {
    accountsRepository.findMany.mockResolvedValue([makeAccount() as any]);

    await expect(service.getAccounts(BigInt(1))).resolves.toEqual({
      items: [
        {
          account_id: 1,
          account_name: "생활비 통장",
          icon_id: 10,
          initial_balance: 500000,
          current_balance: 500000,
          allow_negative_balance: false,
          negative_balance_limit: 0,
          use_yn: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("returns null current_balance when include_balance is false", async () => {
    accountsRepository.findMany.mockResolvedValue([makeAccount() as any]);

    const result = await service.getAccounts(BigInt(1), undefined, false);
    expect(result.items[0].current_balance).toBeNull();
  });

  it("rejects duplicate account name on create", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(makeAccount() as any);

    await expect(
      service.createAccount({
        userId: BigInt(1),
        accountName: "생활비 통장",
        initialBalance: 100000,
        iconId: BigInt(10)
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_001",
      statusCode: HttpStatus.CONFLICT
    } satisfies Partial<AppException>);
  });

  it("rejects negative initial_balance on create", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(10),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    } as any);

    await expect(
      service.createAccount({
        userId: BigInt(1),
        accountName: "새 통장",
        initialBalance: -1,
        iconId: BigInt(10)
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects negative negative_balance_limit on create", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(10),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    } as any);

    await expect(
      service.createAccount({
        userId: BigInt(1),
        accountName: "마이너스 통장",
        initialBalance: 0,
        iconId: BigInt(10),
        allowNegativeBalance: true,
        negativeBalanceLimit: -1
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("defaults to allowNegativeBalance=false and negativeBalanceLimit=0 when not specified", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(10),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    } as any);
    accountsRepository.create.mockResolvedValue(makeAccount() as any);

    await service.createAccount({
      userId: BigInt(1),
      accountName: "기본 통장",
      initialBalance: 0,
      iconId: BigInt(10)
    });

    expect(accountsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        allowNegativeBalance: false,
        negativeBalanceLimit: 0
      })
    );
  });

  it("sets current_balance equal to initial_balance on create", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(10),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    } as any);
    accountsRepository.create.mockResolvedValue(makeAccount() as any);

    await service.createAccount({
      userId: BigInt(1),
      accountName: "생활비 통장",
      initialBalance: 500000,
      iconId: BigInt(10)
    });

    expect(accountsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initialBalance: 500000,
        currentBalance: 500000,
        allowNegativeBalance: false,
        negativeBalanceLimit: 0
      })
    );
  });

  it("creates account with negative balance setting", async () => {
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(10),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    } as any);
    accountsRepository.create.mockResolvedValue(
      makeAccount({
        allowNegativeBalance: true,
        negativeBalanceLimit: { toNumber: () => 300000 }
      }) as any
    );

    await service.createAccount({
      userId: BigInt(1),
      accountName: "마이너스 통장",
      initialBalance: 0,
      iconId: BigInt(10),
      allowNegativeBalance: true,
      negativeBalanceLimit: 300000
    });

    expect(accountsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        allowNegativeBalance: true,
        negativeBalanceLimit: 300000
      })
    );
  });

  it("updates account name successfully", async () => {
    accountsRepository.findById.mockResolvedValue(makeAccount() as any);
    accountsRepository.findDuplicateName.mockResolvedValue(null);
    accountsRepository.update.mockResolvedValue(makeAccount({ accountName: "새 통장" }) as any);

    await service.updateAccount({
      accountId: BigInt(1),
      userId: BigInt(1),
      accountName: "새 통장"
    });

    expect(accountsRepository.update).toHaveBeenCalledWith(
      BigInt(1),
      expect.objectContaining({ accountName: "새 통장" })
    );
  });

  it("returns 404 when updating non-existent account", async () => {
    accountsRepository.findById.mockResolvedValue(null);

    await expect(
      service.updateAccount({
        accountId: BigInt(99),
        userId: BigInt(1),
        useYn: false
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("deactivates account with use_yn=false", async () => {
    accountsRepository.findById.mockResolvedValue(makeAccount() as any);
    accountsRepository.update.mockResolvedValue(makeAccount({ useYn: false }) as any);

    await expect(
      service.updateAccount({
        accountId: BigInt(1),
        userId: BigInt(1),
        useYn: false
      })
    ).resolves.toEqual({ account_id: 1, use_yn: false });
  });

  it("archives account successfully", async () => {
    accountsRepository.findById.mockResolvedValue(makeAccount() as any);
    accountsRepository.archive.mockResolvedValue(undefined);

    await expect(
      service.archiveAccount({ accountId: BigInt(1), userId: BigInt(1), deleteTransactions: false })
    ).resolves.toBeUndefined();

    expect(accountsRepository.archive).toHaveBeenCalledWith(BigInt(1), BigInt(1), false);
  });

  it("archives account and deletes transactions when delete_transactions=true", async () => {
    accountsRepository.findById.mockResolvedValue(makeAccount() as any);
    accountsRepository.archive.mockResolvedValue(undefined);

    await service.archiveAccount({ accountId: BigInt(1), userId: BigInt(1), deleteTransactions: true });

    expect(accountsRepository.archive).toHaveBeenCalledWith(BigInt(1), BigInt(1), true);
  });

  it("returns 404 when archiving non-existent account", async () => {
    accountsRepository.findById.mockResolvedValue(null);

    await expect(
      service.archiveAccount({ accountId: BigInt(99), userId: BigInt(1), deleteTransactions: false })
    ).rejects.toMatchObject({
      code: "ACCOUNT_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("returns 404 when archiving already-archived account", async () => {
    accountsRepository.findById.mockResolvedValue(makeAccount({ deletedYn: true }) as any);

    await expect(
      service.archiveAccount({ accountId: BigInt(1), userId: BigInt(1), deleteTransactions: false })
    ).rejects.toMatchObject({
      code: "ACCOUNT_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });
});
