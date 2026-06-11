import { STORE_NAMES } from "./indexedDb.config";

export function applySchema(event: IDBVersionChangeEvent): void {
  const db = (event.target as IDBOpenDBRequest).result;

  if (!db.objectStoreNames.contains(STORE_NAMES.OFFLINE_TRANSACTIONS)) {
    const txStore = db.createObjectStore(STORE_NAMES.OFFLINE_TRANSACTIONS, {
      keyPath: "local_id",
    });
    txStore.createIndex("sync_status", "sync_status", { unique: false });
    txStore.createIndex("transaction_date", "transaction_date", { unique: false });
    txStore.createIndex("updated_at", "updated_at", { unique: false });
    txStore.createIndex("client_temp_id", "client_temp_id", { unique: true });
    txStore.createIndex("server_id", "server_id", { unique: false });
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_QUEUE)) {
    const qStore = db.createObjectStore(STORE_NAMES.SYNC_QUEUE, { keyPath: "queue_id" });
    qStore.createIndex("status", "status", { unique: false });
    qStore.createIndex("created_at", "created_at", { unique: false });
    qStore.createIndex("updated_at", "updated_at", { unique: false });
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_HISTORY)) {
    const hStore = db.createObjectStore(STORE_NAMES.SYNC_HISTORY, { keyPath: "history_id" });
    hStore.createIndex("synced_at", "synced_at", { unique: false });
    hStore.createIndex("result", "result", { unique: false });
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_CLIENT)) {
    const cStore = db.createObjectStore(STORE_NAMES.SYNC_CLIENT, { keyPath: "client_id" });
    cStore.createIndex("last_synced_at", "last_synced_at", { unique: false });
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.APP_SETTINGS)) {
    db.createObjectStore(STORE_NAMES.APP_SETTINGS, { keyPath: "setting_key" });
  }
}
