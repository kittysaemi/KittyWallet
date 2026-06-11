import type { SyncClientItem } from "../../types/indexedDb.types";
import { STORE_NAMES } from "../indexedDb.config";

function now(): string {
  return new Date().toISOString();
}

export async function getOrCreateSyncClient(): Promise<SyncClientItem> {
  const db = await import("../indexedDb.client").then((m) => m.getDb());
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.SYNC_CLIENT, "readwrite");
    const store = tx.objectStore(STORE_NAMES.SYNC_CLIENT);
    const getAllReq = store.getAll() as IDBRequest<SyncClientItem[]>;
    getAllReq.onsuccess = () => {
      const existing = getAllReq.result[0];
      if (existing) {
        resolve(existing);
        return;
      }
      const record: SyncClientItem = {
        client_id: crypto.randomUUID(),
        device_name: navigator.userAgent,
        platform: "PWA",
        created_at: now(),
        updated_at: now()
      };
      const addReq = store.add(record);
      addReq.onsuccess = () => resolve(record);
      addReq.onerror = () => reject(addReq.error);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function updateSyncClientLastSyncedAt(
  clientId: string,
  lastSyncedAt: string
): Promise<void> {
  const db = await import("../indexedDb.client").then((m) => m.getDb());
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAMES.SYNC_CLIENT, "readwrite");
    const store = tx.objectStore(STORE_NAMES.SYNC_CLIENT);
    const req = store.get(clientId) as IDBRequest<SyncClientItem | undefined>;
    req.onsuccess = () => {
      const existing = req.result;
      if (!existing) {
        resolve();
        return;
      }
      const putReq = store.put({
        ...existing,
        last_synced_at: lastSyncedAt,
        updated_at: now()
      });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
