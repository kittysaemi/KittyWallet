import { describe, it, expect, beforeEach } from "vitest";
import { DB_CONFIG } from "./indexedDb.config";
import { closeDb } from "./indexedDb.client";

async function dropDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_CONFIG.name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
import {
  addOfflineTransaction,
  getAllOfflineTransactions,
  getOfflineTransactionById,
  getPendingOfflineTransactions,
  updateOfflineSyncStatus,
  removeOfflineTransaction,
} from "./repositories/offlineTransaction.repository";
import {
  enqueueSyncItem,
  getWaitingSyncItems,
  getSyncQueuePendingCount,
  removeSyncItem,
} from "./repositories/syncQueue.repository";
import { addSyncHistory, getAllSyncHistory } from "./repositories/syncHistory.repository";
import { getAppSetting, setAppSetting, removeAppSetting } from "./repositories/appSettings.repository";

beforeEach(async () => {
  closeDb();
  await dropDb();
});

const baseTx = {
  transaction_type: "EXPENSE" as const,
  wallet_type: "ACCOUNT" as const,
  wallet_id: 1,
  category_id: 2,
  amount: 10000,
  transaction_date: "2026-06-11",
};

describe("offlineTransaction.repository", () => {
  it("오프라인 거래를 저장하고 조회한다", async () => {
    const saved = await addOfflineTransaction(baseTx);

    expect(saved.local_id).toBeTruthy();
    expect(saved.client_temp_id).toBeTruthy();
    expect(saved.sync_status).toBe("pending_sync");
    expect(saved.deleted_yn).toBe(false);
    expect(saved.amount).toBe(10000);

    const all = await getAllOfflineTransactions();
    expect(all).toHaveLength(1);
    expect(all[0].local_id).toBe(saved.local_id);
  });

  it("local_id로 단건 조회한다", async () => {
    const saved = await addOfflineTransaction(baseTx);
    const found = await getOfflineTransactionById(saved.local_id);
    expect(found?.local_id).toBe(saved.local_id);
  });

  it("존재하지 않는 local_id 조회 시 undefined를 반환한다", async () => {
    const found = await getOfflineTransactionById("nonexistent-id");
    expect(found).toBeUndefined();
  });

  it("pending_sync 상태 거래만 필터링한다", async () => {
    const tx1 = await addOfflineTransaction(baseTx);
    const tx2 = await addOfflineTransaction({ ...baseTx, amount: 5000 });
    await updateOfflineSyncStatus(tx2.local_id, "synced", "server-123", new Date().toISOString());

    const pending = await getPendingOfflineTransactions();
    expect(pending).toHaveLength(1);
    expect(pending[0].local_id).toBe(tx1.local_id);
  });

  it("sync_status를 synced로 업데이트하고 server_id를 저장한다", async () => {
    const saved = await addOfflineTransaction(baseTx);
    await updateOfflineSyncStatus(saved.local_id, "synced", "srv-999");

    const updated = await getOfflineTransactionById(saved.local_id);
    expect(updated?.sync_status).toBe("synced");
    expect(updated?.server_id).toBe("srv-999");
  });

  it("거래를 삭제한다", async () => {
    const saved = await addOfflineTransaction(baseTx);
    await removeOfflineTransaction(saved.local_id);

    const all = await getAllOfflineTransactions();
    expect(all).toHaveLength(0);
  });
});

describe("syncQueue.repository", () => {
  it("큐 항목을 enqueue하고 waiting 목록을 조회한다", async () => {
    const item = await enqueueSyncItem({
      local_id: "local-1",
      client_temp_id: "temp-1",
      action: "CREATE",
      payload: { amount: 10000 },
    });

    expect(item.queue_id).toBeTruthy();
    expect(item.status).toBe("waiting");

    const waiting = await getWaitingSyncItems();
    expect(waiting).toHaveLength(1);
  });

  it("pending count를 반환한다 (waiting + failed)", async () => {
    await enqueueSyncItem({
      local_id: "local-1",
      client_temp_id: "temp-1",
      action: "CREATE",
      payload: {},
    });
    const item2 = await enqueueSyncItem({
      local_id: "local-2",
      client_temp_id: "temp-2",
      action: "UPDATE",
      payload: {},
    });

    // item2를 failed로 직접 상태 변경 후 대기
    const { updateSyncItemStatus } = await import("./repositories/syncQueue.repository");
    await updateSyncItemStatus(item2.queue_id, "failed");

    const count = await getSyncQueuePendingCount();
    expect(count).toBe(2); // 1 waiting + 1 failed
  });

  it("큐 항목을 삭제한다", async () => {
    const item = await enqueueSyncItem({
      local_id: "local-1",
      client_temp_id: "temp-1",
      action: "DELETE",
      payload: {},
    });
    await removeSyncItem(item.queue_id);

    const waiting = await getWaitingSyncItems();
    expect(waiting).toHaveLength(0);
  });
});

describe("syncHistory.repository", () => {
  it("동기화 이력을 저장하고 조회한다", async () => {
    const record = await addSyncHistory({
      queue_id: "q-1",
      action: "CREATE",
      result: "completed",
    });

    expect(record.history_id).toBeTruthy();
    expect(record.synced_at).toBeTruthy();

    const all = await getAllSyncHistory();
    expect(all).toHaveLength(1);
    expect(all[0].queue_id).toBe("q-1");
  });
});

describe("appSettings.repository", () => {
  it("설정값을 저장하고 조회한다", async () => {
    await setAppSetting("theme", "dark");
    const val = await getAppSetting("theme");
    expect(val).toBe("dark");
  });

  it("설정값을 삭제한다", async () => {
    await setAppSetting("theme", "dark");
    await removeAppSetting("theme");
    const val = await getAppSetting("theme");
    expect(val).toBeUndefined();
  });

  it("존재하지 않는 키는 undefined를 반환한다", async () => {
    const val = await getAppSetting("nonexistent");
    expect(val).toBeUndefined();
  });
});
