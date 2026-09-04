import { Decimal } from "@prisma/client/runtime/library";
import { TransferRepository } from "../infrastructure/transfer.repository";
import { TransferService } from "./transfer.service";

jest.mock("../../../common/utils/date.util", () => ({
  getTodayInTimezone: jest.fn(() => "2026-06-20")
}));

function makeDecimal(n: number): Decimal {
  return new Decimal(n);
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 1n,
    userId: 1n,
    iconId: 1n,
    accountName: "저축계좌",
    initialBalance: makeDecimal(0),
    currentBalance: makeDecimal(0),
    allowNegativeBalance: false,
    negativeBalanceLimit: makeDecimal(0),
    deletedYn: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides
  };
}

function makeTransferTx(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: 100n,
    userId: 1n,
    categoryId: 9n,
    walletId: 1n,
    syncClientId: null,
    clientTempId: null,
    transactionType: "EXPENSE",
    walletType: "ACCOUNT",
    amount: makeDecimal(10000),
    transactionDate: new Date("2026-06-20"),
    memo: null,
    installmentId: null,
    installmentSeq: null,
    installmentTotalCount: null,
    interest: 0,
    transferGroupId: "group-1",
    deletedYn: false,
    syncedAt: new Date("2026-06-20T03:00:00Z"),
    createdAt: new Date("2026-06-20T03:00:00Z"),
    updatedAt: new Date("2026-06-20T03:00:00Z"),
    ...overrides
  };
}

const mockRepo = {
  runInTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
  lockAccounts: jest.fn(),
  lockTransactions: jest.fn(),
  findAccountsByIds: jest.fn(),
  findAccountsByIdsReadOnly: jest.fn(),
  findAccountLedger: jest.fn(),
  findTransferPair: jest.fn(),
  findTransferPairReadOnly: jest.fn(),
  findOrCreateTransferCategory: jest.fn(),
  createTransferPair: jest.fn(),
  updateTransferPair: jest.fn(),
  deleteTransferPair: jest.fn()
} as unknown as TransferRepository;

describe("TransferService", () => {
  let service: TransferService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockRepo.runInTransaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) => fn({}));
    (mockRepo.findAccountLedger as jest.Mock).mockResolvedValue([]);
    service = new TransferService(mockRepo);
  });

  describe("createTransfer", () => {
    const baseCommand = {
      userId: 1n,
      fromAccountId: 1n,
      toAccountId: 2n,
      amount: 10000,
      transactionDate: "2026-06-20"
    };

    it("계좌이동 짝 거래를 생성하고 결과를 반환한다(계좌명 포함, 삭제여부는 항상 false)", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, accountName: "월급통장", initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n, accountName: "비상금통장" })
      ]);
      (mockRepo.findOrCreateTransferCategory as jest.Mock).mockResolvedValue({
        categoryId: 9n,
        categoryName: "계좌금액이동"
      });
      (mockRepo.createTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({
          transactionId: 101n,
          walletId: 1n,
          transactionType: "EXPENSE",
          transferGroupId: "uuid-1"
        }),
        toTransaction: makeTransferTx({
          transactionId: 102n,
          walletId: 2n,
          transactionType: "INCOME",
          transferGroupId: "uuid-1"
        })
      });

      const result = await service.createTransfer(baseCommand);

      expect(result).toMatchObject({
        transfer_group_id: "uuid-1",
        from_transaction_id: 101,
        to_transaction_id: 102,
        from_account_id: 1,
        from_account_name: "월급통장",
        from_account_deleted: false,
        to_account_id: 2,
        to_account_name: "비상금통장",
        to_account_deleted: false,
        amount: 10000
      });
      expect(mockRepo.createTransferPair).toHaveBeenCalledTimes(1);
    });

    it("동일 계좌를 선택하면 TRANSFER_001 에러를 반환한다", async () => {
      await expect(
        service.createTransfer({ ...baseCommand, toAccountId: baseCommand.fromAccountId })
      ).rejects.toMatchObject({ code: "TRANSFER_001" });
      expect(mockRepo.runInTransaction).not.toHaveBeenCalled();
    });

    it("금액이 0 이하면 TRANSFER_002 에러를 반환한다", async () => {
      await expect(service.createTransfer({ ...baseCommand, amount: 0 })).rejects.toMatchObject({
        code: "TRANSFER_002"
      });
    });

    it("미래 날짜는 TX_001 에러를 반환한다", async () => {
      await expect(
        service.createTransfer({ ...baseCommand, transactionDate: "2099-12-31" })
      ).rejects.toMatchObject({ code: "TX_001" });
    });

    it("보내는/받는 계좌 중 하나라도 없거나 카드/삭제된 계좌면 TX_003 에러를 반환한다", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(50000) })
      ]);

      await expect(service.createTransfer(baseCommand)).rejects.toMatchObject({ code: "TX_003" });
    });

    it("삭제된 계좌를 선택하면 TX_003 에러를 반환한다", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n, deletedYn: true })
      ]);

      await expect(service.createTransfer(baseCommand)).rejects.toMatchObject({ code: "TX_003" });
    });

    it("시점 기준 잔액이 마이너스 한도를 초과하면 ACCOUNT_004 에러와 예상 잔액을 반환한다", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(5000) }),
        makeAccount({ accountId: 2n })
      ]);
      (mockRepo.findOrCreateTransferCategory as jest.Mock).mockResolvedValue({ categoryId: 9n });

      await expect(service.createTransfer(baseCommand)).rejects.toMatchObject({
        code: "ACCOUNT_004",
        details: { projected_balance: -5000 }
      });
      expect(mockRepo.createTransferPair).not.toHaveBeenCalled();
    });

    it("asOfDate 이후 거래는 무시하고 그 날짜까지의 누적 잔액만으로 검증한다", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(0) }),
        makeAccount({ accountId: 2n })
      ]);
      (mockRepo.findOrCreateTransferCategory as jest.Mock).mockResolvedValue({ categoryId: 9n });
      (mockRepo.findAccountLedger as jest.Mock).mockResolvedValue([
        { transactionId: 1n, transactionType: "INCOME", amount: makeDecimal(20000), transactionDate: new Date("2026-06-20") },
        { transactionId: 2n, transactionType: "EXPENSE", amount: makeDecimal(100000), transactionDate: new Date("2026-06-25") }
      ]);
      (mockRepo.createTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({ transactionId: 101n }),
        toTransaction: makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      });

      await expect(service.createTransfer(baseCommand)).resolves.toBeDefined();
      expect(mockRepo.createTransferPair).toHaveBeenCalledTimes(1);
    });

    it("계좌 row와 트랜잭션 row를 SELECT FOR UPDATE로 잠근다", async () => {
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n })
      ]);
      (mockRepo.findOrCreateTransferCategory as jest.Mock).mockResolvedValue({ categoryId: 9n });
      (mockRepo.createTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({ transactionId: 101n }),
        toTransaction: makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      });

      await service.createTransfer(baseCommand);

      expect(mockRepo.lockAccounts).toHaveBeenCalledWith(expect.anything(), [1n, 2n]);
    });
  });

  describe("updateTransfer", () => {
    const baseCommand = {
      userId: 1n,
      transferGroupId: "group-1"
    };

    it("수정 가능한 필드가 없으면 VALIDATION_001 에러를 반환한다", async () => {
      await expect(service.updateTransfer(baseCommand)).rejects.toMatchObject({ code: "VALIDATION_001" });
    });

    it("짝 거래를 찾을 수 없으면 TRANSFER_003 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([]);

      await expect(service.updateTransfer({ ...baseCommand, amount: 20000 })).rejects.toMatchObject({
        code: "TRANSFER_003"
      });
    });

    it("짝 거래가 1건만 존재하면(정합성 깨짐) TRANSFER_004 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([makeTransferTx()]);

      await expect(service.updateTransfer({ ...baseCommand, amount: 20000 })).rejects.toMatchObject({
        code: "TRANSFER_004"
      });
    });

    it("짝 거래의 금액이 서로 다르면(정합성 깨짐) TRANSFER_004 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, transactionType: "EXPENSE", amount: makeDecimal(10000) }),
        makeTransferTx({ transactionId: 102n, transactionType: "INCOME", amount: makeDecimal(9000) })
      ]);

      await expect(service.updateTransfer({ ...baseCommand, amount: 20000 })).rejects.toMatchObject({
        code: "TRANSFER_004"
      });
    });

    it("금액을 변경하면 두 계좌의 잔액 변동분을 정확히 계산해 반영한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n })
      ]);
      (mockRepo.updateTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({ transactionId: 101n, amount: makeDecimal(20000) }),
        toTransaction: makeTransferTx({
          transactionId: 102n,
          walletId: 2n,
          transactionType: "INCOME",
          amount: makeDecimal(20000)
        })
      });

      const result = await service.updateTransfer({ ...baseCommand, amount: 20000 });

      expect(result.amount).toBe(20000);
      expect(mockRepo.updateTransferPair).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ amount: 20000 }),
        expect.arrayContaining([
          { accountId: 1n, delta: -10000 },
          { accountId: 2n, delta: 10000 }
        ])
      );
    });

    it("계좌명을 함께 반환하고, 활성 계좌 검증을 통과했으므로 삭제여부는 항상 false다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, accountName: "월급통장", initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n, accountName: "비상금통장" })
      ]);
      (mockRepo.updateTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({ transactionId: 101n, amount: makeDecimal(20000) }),
        toTransaction: makeTransferTx({
          transactionId: 102n,
          walletId: 2n,
          transactionType: "INCOME",
          amount: makeDecimal(20000)
        })
      });

      const result = await service.updateTransfer({ ...baseCommand, amount: 20000 });

      expect(result).toMatchObject({
        from_account_name: "월급통장",
        from_account_deleted: false,
        to_account_name: "비상금통장",
        to_account_deleted: false
      });
    });

    it("받는 계좌를 다른 계좌로 바꾸면 기존 받는 계좌도 과거 날짜 기준으로 재검증한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(50000) }),
        makeAccount({ accountId: 2n, initialBalance: makeDecimal(0) }),
        makeAccount({ accountId: 3n })
      ]);
      (mockRepo.updateTransferPair as jest.Mock).mockResolvedValue({
        fromTransaction: makeTransferTx({ transactionId: 101n }),
        toTransaction: makeTransferTx({ transactionId: 102n, walletId: 3n, transactionType: "INCOME" })
      });

      await service.updateTransfer({ ...baseCommand, toAccountId: 3 });

      // 새 보내는 계좌(1n)와 기존 받는 계좌(2n) 모두 잔액 검증을 위해 원장을 조회한다.
      expect(mockRepo.findAccountLedger).toHaveBeenCalledWith(expect.anything(), 1n, 1n);
      expect(mockRepo.findAccountLedger).toHaveBeenCalledWith(expect.anything(), 2n, 1n);
    });

    it("변경 후에도 시점 기준 잔액이 마이너스 한도를 초과하면 ACCOUNT_004 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, initialBalance: makeDecimal(5000) }),
        makeAccount({ accountId: 2n })
      ]);

      await expect(service.updateTransfer({ ...baseCommand, amount: 100000 })).rejects.toMatchObject({
        code: "ACCOUNT_004"
      });
      expect(mockRepo.updateTransferPair).not.toHaveBeenCalled();
    });

    it("보내는/받는 계좌가 같아지면 TRANSFER_001 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);

      await expect(service.updateTransfer({ ...baseCommand, toAccountId: 1 })).rejects.toMatchObject({
        code: "TRANSFER_001"
      });
    });
  });

  describe("deleteTransfer", () => {
    it("짝 거래를 찾을 수 없으면 TRANSFER_003 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([]);

      await expect(service.deleteTransfer(1n, "group-1")).rejects.toMatchObject({ code: "TRANSFER_003" });
    });

    it("삭제 시 받는 계좌의 시점 기준 잔액이 마이너스가 되면 ACCOUNT_004 에러를 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n }),
        makeAccount({ accountId: 2n, initialBalance: makeDecimal(0) })
      ]);
      // 받는 계좌(2n)에는 이체로 들어온 수입(102n) 외에, 같은 날짜에 발생한 별도 지출(999n)이 있다.
      // 이체를 삭제해 수입이 사라지면 그 지출만 남아 잔액이 마이너스가 된다.
      (mockRepo.findAccountLedger as jest.Mock).mockResolvedValue([
        { transactionId: 102n, transactionType: "INCOME", amount: makeDecimal(10000), transactionDate: new Date("2026-06-20") },
        { transactionId: 999n, transactionType: "EXPENSE", amount: makeDecimal(6000), transactionDate: new Date("2026-06-20") }
      ]);

      await expect(service.deleteTransfer(1n, "group-1")).rejects.toMatchObject({
        code: "ACCOUNT_004",
        details: { projected_balance: -6000 }
      });
      expect(mockRepo.deleteTransferPair).not.toHaveBeenCalled();
    });

    it("정상 삭제 시 두 계좌의 잔액을 원복하고 null을 반환한다", async () => {
      (mockRepo.findTransferPair as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n }),
        makeAccount({ accountId: 2n, initialBalance: makeDecimal(50000) })
      ]);

      const result = await service.deleteTransfer(1n, "group-1");

      expect(result).toBeNull();
      expect(mockRepo.deleteTransferPair).toHaveBeenCalledWith(
        expect.anything(),
        101n,
        102n,
        expect.arrayContaining([
          { accountId: 1n, delta: 10000 },
          { accountId: 2n, delta: -10000 }
        ])
      );
    });
  });

  describe("getTransfer", () => {
    it("짝 거래를 조회해 TransferResult 형태로 반환한다(계좌명 포함, 삭제 안 됨)", async () => {
      (mockRepo.findTransferPairReadOnly as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIdsReadOnly as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, accountName: "월급통장" }),
        makeAccount({ accountId: 2n, accountName: "비상금통장" })
      ]);

      const result = await service.getTransfer(1n, "group-1");

      expect(result).toMatchObject({
        transfer_group_id: "group-1",
        from_account_id: 1,
        from_account_name: "월급통장",
        from_account_deleted: false,
        to_account_id: 2,
        to_account_name: "비상금통장",
        to_account_deleted: false,
        amount: 10000
      });
      expect(mockRepo.findAccountsByIdsReadOnly).toHaveBeenCalledWith([1n, 2n], 1n);
    });

    it("삭제된 계좌를 참조하는 경우에도 계좌명을 함께 반환하고 삭제여부를 true로 표시한다", async () => {
      (mockRepo.findTransferPairReadOnly as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIdsReadOnly as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, accountName: "월급통장" }),
        makeAccount({ accountId: 2n, accountName: "삭제된계좌", deletedYn: true })
      ]);

      const result = await service.getTransfer(1n, "group-1");

      expect(result).toMatchObject({
        from_account_name: "월급통장",
        from_account_deleted: false,
        to_account_name: "삭제된계좌",
        to_account_deleted: true
      });
    });

    it("계좌 조회 결과에 없는 계좌(레코드 자체가 없는 경우)는 빈 이름과 삭제됨으로 처리한다", async () => {
      (mockRepo.findTransferPairReadOnly as jest.Mock).mockResolvedValue([
        makeTransferTx({ transactionId: 101n, walletId: 1n, transactionType: "EXPENSE" }),
        makeTransferTx({ transactionId: 102n, walletId: 2n, transactionType: "INCOME" })
      ]);
      (mockRepo.findAccountsByIdsReadOnly as jest.Mock).mockResolvedValue([
        makeAccount({ accountId: 1n, accountName: "월급통장" })
      ]);

      const result = await service.getTransfer(1n, "group-1");

      expect(result).toMatchObject({
        to_account_name: "",
        to_account_deleted: true
      });
    });

    it("짝 거래가 없으면 TRANSFER_003 에러를 반환한다", async () => {
      (mockRepo.findTransferPairReadOnly as jest.Mock).mockResolvedValue([]);

      await expect(service.getTransfer(1n, "group-1")).rejects.toMatchObject({ code: "TRANSFER_003" });
    });
  });
});
