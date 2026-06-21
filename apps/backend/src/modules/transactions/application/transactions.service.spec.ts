import { Decimal } from "@prisma/client/runtime/library";
import { TransactionsRepository } from "../infrastructure/transactions.repository";
import { TransactionsService } from "./transactions.service";

jest.mock("../../../common/utils/date.util", () => ({
  getTodayInTimezone: jest.fn(() => "2026-06-20")
}));

function makeDecimal(n: number): Decimal {
  return new Decimal(n);
}

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: 1n,
    userId: 1n,
    categoryId: 1n,
    walletId: 1n,
    syncClientId: null,
    clientTempId: null,
    transactionType: "EXPENSE",
    walletType: "CARD",
    amount: makeDecimal(40000),
    transactionDate: new Date("2026-06-20"),
    memo: null,
    installmentId: null,
    installmentSeq: null,
    installmentTotalCount: null,
    deletedYn: false,
    syncedAt: new Date("2026-06-20T03:00:00Z"),
    createdAt: new Date("2026-06-20T03:00:00Z"),
    updatedAt: new Date("2026-06-20T03:00:00Z"),
    category: { categoryId: 1n, categoryName: "식비", userId: 1n, iconId: 1n, show: true, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
    cardInstallment: null,
    syncHistories: [],
    ...overrides
  };
}

function makeInstallment(overrides: Record<string, unknown> = {}) {
  return {
    installmentId: 10n,
    userId: 1n,
    cardId: 1n,
    categoryId: 1n,
    originalAmount: makeDecimal(120000),
    installmentMonths: 3,
    purchaseDate: new Date("2026-06-20"),
    memo: null,
    deletedYn: false,
    createdAt: new Date("2026-06-20T03:00:00Z"),
    updatedAt: new Date("2026-06-20T03:00:00Z"),
    ...overrides
  };
}

const mockRepo = {
  findById: jest.fn(),
  findCard: jest.fn(),
  findAccount: jest.fn(),
  findOwnedAccount: jest.fn(),
  findOwnedCard: jest.fn(),
  findCategory: jest.fn(),
  create: jest.fn(),
  createWithAccountBalanceUpdate: jest.fn(),
  createInstallmentWithTransactions: jest.fn(),
  findInstallmentTransactions: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findRecent: jest.fn(),
  findAccountsByIds: jest.fn(),
  findCardsByIds: jest.fn(),
  findAccountTransactionsForBalance: jest.fn(),
  sumCardExpense: jest.fn(),
  updateWithBalances: jest.fn(),
  softDeleteWithBalance: jest.fn()
} as unknown as TransactionsRepository;

describe("TransactionsService - 카드할부", () => {
  let service: TransactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionsService(mockRepo);
  });

  describe("createTransaction - 할부 생성", () => {
    const baseCommand = {
      userId: 1n,
      walletType: "CARD" as const,
      walletId: 1n,
      categoryId: 1n,
      transactionType: "EXPENSE" as const,
      amount: 120000,
      transactionDate: "2026-06-20",
      memo: "냉장고 구매",
      installmentMonths: 3
    };

    it("카드 지출 + installmentMonths 전달 시 부모 할부와 월별 거래를 생성한다", async () => {
      const installment = makeInstallment();
      const txs = [
        { ...makeTx({ transactionId: 101n, amount: makeDecimal(40000), installmentSeq: 1, installmentTotalCount: 3, installmentId: 10n }), cardInstallment: installment },
        { ...makeTx({ transactionId: 102n, amount: makeDecimal(40000), transactionDate: new Date("2026-07-20"), installmentSeq: 2, installmentTotalCount: 3, installmentId: 10n }), cardInstallment: installment },
        { ...makeTx({ transactionId: 103n, amount: makeDecimal(40000), transactionDate: new Date("2026-08-20"), installmentSeq: 3, installmentTotalCount: 3, installmentId: 10n }), cardInstallment: installment }
      ];

      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n, categoryName: "식비" });
      (mockRepo.findCard as jest.Mock).mockResolvedValue({ cardId: 1n, cardName: "KB카드", deletedYn: false, useYn: true });
      (mockRepo.createInstallmentWithTransactions as jest.Mock).mockResolvedValue({ installment, transactions: txs });

      const result = await service.createTransaction(baseCommand);

      expect(mockRepo.createInstallmentWithTransactions).toHaveBeenCalledTimes(1);
      expect(result.installment_id).toBe(10);
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions![0]).toMatchObject({ installment_seq: 1, amount: 40000 });
    });

    it("카드 수입 거래는 TX_007 에러를 반환한다", async () => {
      await expect(
        service.createTransaction({ ...baseCommand, transactionType: "INCOME", installmentMonths: undefined })
      ).rejects.toMatchObject({ code: "TX_007" });
    });

    it("미래 날짜 거래는 TX_001 에러를 반환한다", async () => {
      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n });
      await expect(
        service.createTransaction({ ...baseCommand, transactionDate: "2099-12-31" })
      ).rejects.toMatchObject({ code: "TX_001" });
    });

    it("installmentMonths 없이 카드 지출 등록 시 일반 거래로 생성한다", async () => {
      const tx = makeTx({ transactionId: 200n });
      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n });
      (mockRepo.findCard as jest.Mock).mockResolvedValue({ cardId: 1n, useYn: true, deletedYn: false });
      (mockRepo.create as jest.Mock).mockResolvedValue(tx);

      const result = await service.createTransaction({ ...baseCommand, installmentMonths: undefined });

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.createInstallmentWithTransactions).not.toHaveBeenCalled();
      expect(result.transaction_id).toBe(200);
      expect(result.installment_id).toBeUndefined();
    });

    it("존재하지 않는 카드는 TX_004 에러를 반환한다", async () => {
      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n });
      (mockRepo.findCard as jest.Mock).mockResolvedValue(null);

      await expect(service.createTransaction(baseCommand)).rejects.toMatchObject({ code: "TX_004" });
    });

    it("금액이 3개월 할부일 때 나머지는 1회차에 합산한다", async () => {
      const installment = makeInstallment({ originalAmount: makeDecimal(100001) });
      const txs = [
        makeTx({ transactionId: 101n, amount: makeDecimal(33335), installmentSeq: 1, installmentTotalCount: 3, installmentId: 10n }),
        makeTx({ transactionId: 102n, amount: makeDecimal(33333), transactionDate: new Date("2026-07-20"), installmentSeq: 2, installmentTotalCount: 3, installmentId: 10n }),
        makeTx({ transactionId: 103n, amount: makeDecimal(33333), transactionDate: new Date("2026-08-20"), installmentSeq: 3, installmentTotalCount: 3, installmentId: 10n })
      ];

      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n });
      (mockRepo.findCard as jest.Mock).mockResolvedValue({ cardId: 1n, useYn: true, deletedYn: false });
      (mockRepo.createInstallmentWithTransactions as jest.Mock).mockResolvedValue({ installment, transactions: txs });

      const result = await service.createTransaction({ ...baseCommand, amount: 100001 });

      expect(result.transactions![0].amount).toBe(33335);
      expect(result.transactions![1].amount).toBe(33333);
    });
  });

  describe("getTransaction - 할부 상세 조회", () => {
    it("할부 회차 거래 조회 시 installment_info를 반환한다", async () => {
      const installment = makeInstallment();
      const tx = makeTx({
        transactionId: 101n,
        installmentId: 10n,
        installmentSeq: 1,
        installmentTotalCount: 3,
        cardInstallment: installment
      });

      const pastDate = new Date("2026-06-20");
      const future1 = new Date("2026-07-20");
      const future2 = new Date("2026-08-20");

      const installmentTxs = [
        { transactionId: 101n, installmentSeq: 1, amount: makeDecimal(40000), transactionDate: pastDate, deletedYn: false },
        { transactionId: 102n, installmentSeq: 2, amount: makeDecimal(40000), transactionDate: future1, deletedYn: false },
        { transactionId: 103n, installmentSeq: 3, amount: makeDecimal(40000), transactionDate: future2, deletedYn: false }
      ];

      (mockRepo.findById as jest.Mock).mockResolvedValue(tx);
      (mockRepo.findInstallmentTransactions as jest.Mock).mockResolvedValue(installmentTxs);
      (mockRepo.findCardsByIds as jest.Mock).mockResolvedValue([{ cardId: 1n, cardName: "KB카드", deletedYn: false, useYn: true }]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getTransaction(101n, 1n);

      expect(result.installment_id).toBe(10);
      expect(result.installment_info).toBeDefined();
      expect(result.installment_info!.original_amount).toBe(120000);
      // today="2026-06-20" 기준: pastDate(06-20)만 current, future1·2는 remaining
      expect(result.installment_info!.current_total_amount).toBe(40000);
      expect(result.installment_info!.installment_months).toBe(3);
      expect(result.installment_info!.installment_items).toHaveLength(3);
      expect(result.installment_info!.installment_items[0]).toMatchObject({
        transaction_id: 101,
        installment_seq: 1,
        amount: 40000
      });
    });

    it("remaining_amount는 오늘 이후 회차 합계로 계산된다", async () => {
      const installment = makeInstallment();
      const tx = makeTx({ transactionId: 101n, installmentId: 10n, installmentSeq: 1, installmentTotalCount: 3, cardInstallment: installment });

      // getTodayInTimezone이 "2026-06-20"으로 고정되므로 하드코딩 날짜 사용 (타임존 오차 방지)
      const yesterday = new Date("2026-06-19");
      const tomorrow = new Date("2026-06-21");
      const dayAfterTomorrow = new Date("2026-06-22");

      const installmentTxs = [
        { transactionId: 100n, installmentSeq: 1, amount: makeDecimal(30000), transactionDate: yesterday, deletedYn: false },
        { transactionId: 101n, installmentSeq: 2, amount: makeDecimal(35000), transactionDate: tomorrow, deletedYn: false },
        { transactionId: 102n, installmentSeq: 3, amount: makeDecimal(35000), transactionDate: dayAfterTomorrow, deletedYn: false }
      ];

      (mockRepo.findById as jest.Mock).mockResolvedValue(tx);
      (mockRepo.findInstallmentTransactions as jest.Mock).mockResolvedValue(installmentTxs);
      (mockRepo.findCardsByIds as jest.Mock).mockResolvedValue([{ cardId: 1n, cardName: "KB카드", deletedYn: false, useYn: true }]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getTransaction(101n, 1n);

      // today="2026-06-20" 기준: yesterday(06-19)만 current, tomorrow·dayAfterTomorrow는 remaining
      expect(result.installment_info!.current_total_amount).toBe(30000);
      expect(result.installment_info!.remaining_amount).toBe(70000);
    });

    it("일반 거래 조회 시 installment_info는 undefined다", async () => {
      const tx = makeTx({ transactionId: 200n });
      (mockRepo.findById as jest.Mock).mockResolvedValue(tx);
      (mockRepo.findCardsByIds as jest.Mock).mockResolvedValue([{ cardId: 1n, cardName: "KB카드", deletedYn: false, useYn: true }]);
      (mockRepo.findAccountsByIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getTransaction(200n, 1n);

      expect(result.installment_id).toBeUndefined();
      expect(result.installment_info).toBeUndefined();
      expect(mockRepo.findInstallmentTransactions).not.toHaveBeenCalled();
    });

    it("존재하지 않는 거래 조회 시 TX_005 에러를 반환한다", async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getTransaction(999n, 1n)).rejects.toMatchObject({ code: "TX_005" });
    });
  });

  describe("createInstallmentWithTransactions - repository 동작 검증", () => {
    it("할부 생성 시 repository에 올바른 input이 전달된다", async () => {
      const installment = makeInstallment();
      const txs = [
        makeTx({ transactionId: 101n, installmentSeq: 1, installmentTotalCount: 3, installmentId: 10n }),
        makeTx({ transactionId: 102n, transactionDate: new Date("2026-07-20"), installmentSeq: 2, installmentTotalCount: 3, installmentId: 10n }),
        makeTx({ transactionId: 103n, transactionDate: new Date("2026-08-20"), installmentSeq: 3, installmentTotalCount: 3, installmentId: 10n })
      ];

      (mockRepo.findCategory as jest.Mock).mockResolvedValue({ categoryId: 1n });
      (mockRepo.findCard as jest.Mock).mockResolvedValue({ cardId: 1n, useYn: true, deletedYn: false });
      (mockRepo.createInstallmentWithTransactions as jest.Mock).mockResolvedValue({ installment, transactions: txs });

      await service.createTransaction({
        userId: 1n,
        walletType: "CARD",
        walletId: 1n,
        categoryId: 2n,
        transactionType: "EXPENSE",
        amount: 120000,
        transactionDate: "2026-06-20",
        memo: "냉장고 구매",
        installmentMonths: 3
      });

      const callArg = (mockRepo.createInstallmentWithTransactions as jest.Mock).mock.calls[0][0];
      expect(callArg.userId).toBe(1n);
      expect(callArg.cardId).toBe(1n);
      expect(callArg.categoryId).toBe(2n);
      expect(callArg.originalAmount).toBe(120000);
      expect(callArg.installmentMonths).toBe(3);
      expect(callArg.purchaseDate).toEqual(new Date("2026-06-20"));
    });
  });
});
