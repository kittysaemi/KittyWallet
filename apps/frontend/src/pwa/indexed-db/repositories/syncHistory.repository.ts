import type { SyncHistoryItem } from "../../types/indexedDb.types";
import { STORE_NAMES } from "../indexedDb.config";
import { withReadStore, withWriteStore } from "../indexedDb.client";

export async function addSyncHistory(
  data: Omit<SyncHistoryItem, "history_id" | "synced_at">
): Promise<SyncHistoryItem> {
  const record: SyncHistoryItem = {
    ...data,
    history_id: crypto.randomUUID(),
    synced_at: new Date().toISOString(),
  };
  await withWriteStore(STORE_NAMES.SYNC_HISTORY, (store) => store.add(record));
  return record;
}

export async function getAllSyncHistory(): Promise<SyncHistoryItem[]> {
  return withReadStore(STORE_NAMES.SYNC_HISTORY, (store) =>
    store.getAll() as IDBRequest<SyncHistoryItem[]>
  );
}
