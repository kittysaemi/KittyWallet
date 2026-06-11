import type { OfflineTransaction, OfflineSyncStatus } from "../../types/indexedDb.types";
import { STORE_NAMES } from "../indexedDb.config";
import { withReadStore, withWriteStore } from "../indexedDb.client";

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export async function addOfflineTransaction(
  data: Omit<OfflineTransaction, "local_id" | "client_temp_id" | "created_at" | "updated_at" | "sync_status" | "deleted_yn">
): Promise<OfflineTransaction> {
  const record: OfflineTransaction = {
    ...data,
    local_id: newId(),
    client_temp_id: newId(),
    deleted_yn: false,
    sync_status: "pending_sync",
    created_at: now(),
    updated_at: now(),
  };
  await withWriteStore(STORE_NAMES.OFFLINE_TRANSACTIONS, (store) => store.add(record));
  return record;
}

export async function getAllOfflineTransactions(): Promise<OfflineTransaction[]> {
  return withReadStore(STORE_NAMES.OFFLINE_TRANSACTIONS, (store) =>
    store.getAll() as IDBRequest<OfflineTransaction[]>
  );
}

export async function getOfflineTransactionById(
  localId: string
): Promise<OfflineTransaction | undefined> {
  return withReadStore(STORE_NAMES.OFFLINE_TRANSACTIONS, (store) =>
    store.get(localId) as IDBRequest<OfflineTransaction | undefined>
  );
}

export async function getOfflineTransactionByServerId(
  serverId: string
): Promise<OfflineTransaction | undefined> {
  const db = await import("../indexedDb.client").then((m) => m.getDb());
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.OFFLINE_TRANSACTIONS, "readonly");
    const req = tx.objectStore(STORE_NAMES.OFFLINE_TRANSACTIONS)
      .index("server_id")
      .get(serverId);
    req.onsuccess = () => resolve(req.result as OfflineTransaction | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingOfflineTransactions(): Promise<OfflineTransaction[]> {
  const db = await import("../indexedDb.client").then((m) => m.getDb());
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.OFFLINE_TRANSACTIONS, "readonly");
    const req = tx.objectStore(STORE_NAMES.OFFLINE_TRANSACTIONS)
      .index("sync_status")
      .getAll(IDBKeyRange.only("pending_sync")) as IDBRequest<OfflineTransaction[]>;
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateOfflineTransaction(
  localId: string,
  changes: Partial<Omit<OfflineTransaction, "local_id" | "created_at">>
): Promise<void> {
  const db = await import("../indexedDb.client").then((m) => m.getDb());
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.OFFLINE_TRANSACTIONS, "readwrite");
    const store = tx.objectStore(STORE_NAMES.OFFLINE_TRANSACTIONS);
    const getReq = store.get(localId) as IDBRequest<OfflineTransaction | undefined>;
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        reject(new Error(`OfflineTransaction not found: ${localId}`));
        return;
      }
      const updated: OfflineTransaction = { ...existing, ...changes, updated_at: now() };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function updateOfflineSyncStatus(
  localId: string,
  status: OfflineSyncStatus,
  serverId?: string,
  syncedAt?: string
): Promise<void> {
  return updateOfflineTransaction(localId, {
    sync_status: status,
    ...(serverId !== undefined && { server_id: serverId }),
    ...(syncedAt !== undefined && { synced_at: syncedAt }),
  });
}

export async function removeOfflineTransaction(localId: string): Promise<void> {
  await withWriteStore(STORE_NAMES.OFFLINE_TRANSACTIONS, (store) => store.delete(localId));
}
