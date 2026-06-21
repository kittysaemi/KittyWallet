import { SyncService } from "../src/modules/sync/application/sync.service";
import { TransactionsService } from "../src/modules/transactions/application/transactions.service";
import { PrismaService } from "../src/database/prisma.service";

jest.mock("../src/common/utils/date.util", () => ({
  getTodayInTimezone: jest.fn(() => "2026-06-20")
}));

const mockPrisma = {
  syncClient: {
    upsert: jest.fn(),
    update: jest.fn()
  },
  transaction: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  syncHistory: {
    create: jest.fn()
  }
} as unknown as PrismaService;

const mockTransactionsService = {
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn()
} as unknown as TransactionsService;

const BASE_CLIENT = {
  syncClientId: 1n,
  clientId: "client-1",
  userId: 1n,
  deviceName: "test",
  platform: "WEB",
  lastSyncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const NOW_ISO = new Date("2026-06-20T10:00:00Z").toISOString();

describe("SyncService - 카드할부 동기화", () => {
  let service: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncService(mockPrisma, mockTransactionsService);
    (mockPrisma.syncClient.upsert as jest.Mock).mockResolvedValue(BASE_CLIENT);
    (mockPrisma.syncClient.update as jest.Mock).mockResolvedValue(BASE_CLIENT);
    (mockPrisma.syncHistory.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.transaction.update as jest.Mock).mockResolvedValue({});
  });

  describe("CREATE - 카드할부 payload 처리", () => {
    it("installment 포함 payload 전달 시 installmentMonths와 함께 createTransaction 호출된다", async () => {
      (mockTransactionsService.createTransaction as jest.Mock).mockResolvedValue({
        transaction_id: 101,
        updated_at: NOW_ISO,
        synced_at: null,
        installment_id: 10,
        transactions: [
          { transaction_id: 101, installment_seq: 1, amount: 40000, transaction_date: "2026-06-20" },
          { transaction_id: 102, installment_seq: 2, amount: 40000, transaction_date: "2026-07-20" },
          { transaction_id: 103, installment_seq: 3, amount: 40000, transaction_date: "2026-08-20" }
        ]
      });

      await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-001",
            server_id: null,
            sync_action: "CREATE",
            payload: {
              wallet_type: "CARD",
              wallet_id: 1,
              category_id: 2,
              transaction_type: "EXPENSE",
              amount: 120000,
              transaction_date: "2026-06-20",
              memo: "냉장고 구매",
              installment: { installment_months: 3 }
            }
          }
        ]
      });

      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ installmentMonths: 3 })
      );
    });

    it("할부 CREATE 성공 시 syncClientId/clientTempId를 createTransaction에 직접 전달해 원자적으로 설정한다", async () => {
      (mockTransactionsService.createTransaction as jest.Mock).mockResolvedValue({
        transaction_id: 101,
        updated_at: NOW_ISO,
        synced_at: null,
        installment_id: 10,
        transactions: [
          { transaction_id: 101, installment_seq: 1, amount: 40000, transaction_date: "2026-06-20" },
          { transaction_id: 102, installment_seq: 2, amount: 40000, transaction_date: "2026-07-20" },
          { transaction_id: 103, installment_seq: 3, amount: 40000, transaction_date: "2026-08-20" }
        ]
      });

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-001",
            server_id: null,
            sync_action: "CREATE",
            payload: {
              wallet_type: "CARD",
              wallet_id: 1,
              category_id: 2,
              transaction_type: "EXPENSE",
              amount: 120000,
              transaction_date: "2026-06-20",
              installment: { installment_months: 3 }
            }
          }
        ]
      });

      // 원자적 설정: createTransaction에 syncClientId/clientTempId 직접 전달
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          syncClientId: BASE_CLIENT.syncClientId,
          clientTempId: "temp-001"
        })
      );
      // 별도 update/updateMany 호출 없음
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
      expect(result.items[0].sync_result).toBe("SUCCESS");
      expect(result.items[0].server_id).toBe(101);
    });

    it("할부 CREATE 동일 client_temp_id 재전송 시 DUPLICATE_IGNORED를 반환한다", async () => {
      (mockPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        transactionId: 101n,
        syncedAt: new Date("2026-06-20T10:00:00Z"),
        updatedAt: new Date("2026-06-20T10:00:00Z")
      });

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-001",
            server_id: null,
            sync_action: "CREATE",
            payload: {
              wallet_type: "CARD",
              wallet_id: 1,
              category_id: 2,
              transaction_type: "EXPENSE",
              amount: 120000,
              transaction_date: "2026-06-20",
              installment: { installment_months: 3 }
            }
          }
        ]
      });

      expect(mockTransactionsService.createTransaction).not.toHaveBeenCalled();
      expect(result.items[0].sync_result).toBe("DUPLICATE_IGNORED");
      expect(result.items[0].server_id).toBe(101);
    });

    it("installment 없는 일반 거래 CREATE는 syncClientId/clientTempId를 createTransaction에 직접 전달한다", async () => {
      (mockTransactionsService.createTransaction as jest.Mock).mockResolvedValue({
        transaction_id: 200,
        updated_at: NOW_ISO,
        synced_at: null
      });

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-002",
            server_id: null,
            sync_action: "CREATE",
            payload: {
              wallet_type: "ACCOUNT",
              wallet_id: 1,
              category_id: 2,
              transaction_type: "EXPENSE",
              amount: 50000,
              transaction_date: "2026-06-20"
            }
          }
        ]
      });

      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          syncClientId: BASE_CLIENT.syncClientId,
          clientTempId: "temp-002"
        })
      );
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.not.objectContaining({ installmentMonths: expect.anything() })
      );
      // CREATE는 별도 update 없음 (원자적으로 처리됨)
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
      expect(result.items[0].sync_result).toBe("SUCCESS");
    });
  });

  describe("UPDATE/DELETE 회귀 확인", () => {
    it("UPDATE sync_action은 updateTransaction을 호출한다", async () => {
      (mockTransactionsService.updateTransaction as jest.Mock).mockResolvedValue({
        transaction_id: 200,
        wallet_type: "ACCOUNT",
        wallet_id: 1,
        transaction_type: "EXPENSE",
        amount: 60000,
        transaction_date: "2026-06-20",
        updated_at: NOW_ISO
      });

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-003",
            server_id: 200,
            sync_action: "UPDATE",
            payload: { amount: 60000, transaction_date: "2026-06-20" }
          }
        ]
      });

      expect(mockTransactionsService.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: 200n, userId: 1n })
      );
      expect(result.items[0].sync_result).toBe("SUCCESS");
    });

    it("DELETE sync_action은 deleteTransaction을 호출한다", async () => {
      (mockTransactionsService.deleteTransaction as jest.Mock).mockResolvedValue({
        transaction_id: 200,
        deleted_yn: true,
        updated_at: NOW_ISO
      });

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-004",
            server_id: 200,
            sync_action: "DELETE",
            payload: {}
          }
        ]
      });

      expect(mockTransactionsService.deleteTransaction).toHaveBeenCalledWith(200n, 1n);
      expect(result.items[0].sync_result).toBe("SUCCESS");
    });

    it("createTransaction 실패 시 FAILED를 반환하고 Queue 항목을 유지한다", async () => {
      (mockTransactionsService.createTransaction as jest.Mock).mockRejectedValue(
        new Error("TX_004")
      );

      const result = await service.upload({
        userId: 1n,
        clientId: "client-1",
        items: [
          {
            client_temp_id: "temp-005",
            server_id: null,
            sync_action: "CREATE",
            payload: {
              wallet_type: "CARD",
              wallet_id: 999,
              category_id: 2,
              transaction_type: "EXPENSE",
              amount: 50000,
              transaction_date: "2026-06-20"
            }
          }
        ]
      });

      expect(result.items[0].sync_result).toBe("FAILED");
    });
  });
});
