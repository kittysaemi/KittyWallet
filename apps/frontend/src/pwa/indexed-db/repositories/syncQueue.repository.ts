import type { SyncQueueItem, QueueStatus } from "../../types/indexedDb.types";
import { STORE_NAMES } from "../indexedDb.config";
import { withReadStore, withWriteStore, getDb } from "../indexedDb.client";

function now(): string {
  return new Date().toISOString();
}

export async function enqueueSyncItem(
  data: Omit<SyncQueueItem, "queue_id" | "status" | "retry_count" | "created_at" | "updated_at">
): Promise<SyncQueueItem> {
  const record: SyncQueueItem = {
    ...data,
    queue_id: crypto.randomUUID(),
    status: "waiting",
    retry_count: 0,
    created_at: now(),
    updated_at: now(),
  };
  await withWriteStore(STORE_NAMES.SYNC_QUEUE, (store) => store.add(record));
  return record;
}

export async function getWaitingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, "readonly");
    const req = tx.objectStore(STORE_NAMES.SYNC_QUEUE)
      .index("status")
      .getAll(IDBKeyRange.only("waiting")) as IDBRequest<SyncQueueItem[]>;
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getProcessableSyncItems(): Promise<SyncQueueItem[]> {
  const items = await getAllSyncItems();
  return items
    .filter((item) => item.status === "waiting" || item.status === "failed")
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export async function updateSyncItemStatus(
  queueId: string,
  status: QueueStatus,
  incrementRetry = false
): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE);
    const getReq = store.get(queueId) as IDBRequest<SyncQueueItem | undefined>;
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) { resolve(); return; }
      const updated: SyncQueueItem = {
        ...item,
        status,
        retry_count: incrementRetry ? item.retry_count + 1 : item.retry_count,
        updated_at: now(),
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeSyncItem(queueId: string): Promise<void> {
  await withWriteStore(STORE_NAMES.SYNC_QUEUE, (store) => store.delete(queueId));
}

export async function getSyncQueuePendingCount(): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, "readonly");
    const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE).index("status");
    let total = 0;
    let done = 0;

    const finish = () => {
      done++;
      if (done === 2) resolve(total);
    };

    const waitingReq = store.count(IDBKeyRange.only("waiting"));
    waitingReq.onsuccess = () => { total += waitingReq.result; finish(); };
    waitingReq.onerror = finish;

    const failedReq = store.count(IDBKeyRange.only("failed"));
    failedReq.onsuccess = () => { total += failedReq.result; finish(); };
    failedReq.onerror = finish;

    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSyncItems(): Promise<SyncQueueItem[]> {
  return withReadStore(STORE_NAMES.SYNC_QUEUE, (store) =>
    store.getAll() as IDBRequest<SyncQueueItem[]>
  );
}

export async function removeSyncItemByLocalId(localId: string): Promise<void> {
  const all = await getAllSyncItems();
  const item = all.find((i) => i.local_id === localId);
  if (item) {
    await removeSyncItem(item.queue_id);
  }
}
