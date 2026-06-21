import type { QueryClient } from "@tanstack/react-query";
import { syncApi } from "../../entities/sync/api/syncApi";
import type { SyncUploadItemRequest, SyncUploadItemResult } from "../../entities/sync/model/sync.types";
import { invalidateTransactionCaches } from "../cache/cacheInvalidation";
import { getOrCreateSyncClient, updateSyncClientLastSyncedAt } from "../indexed-db/repositories/syncClient.repository";
import { addSyncHistory } from "../indexed-db/repositories/syncHistory.repository";
import {
  getProcessableSyncItems,
  getSyncQueuePendingCount,
  removeSyncItem,
  updateSyncItemStatus
} from "../indexed-db/repositories/syncQueue.repository";
import {
  removeOfflineTransaction,
  updateOfflineSyncStatus
} from "../indexed-db/repositories/offlineTransaction.repository";
import { usePwaStore } from "../state/pwa.store";
import type { SyncQueueItem } from "../types/indexedDb.types";

const MAX_RETRY_COUNT = 5;
let isRunning = false;

function toUploadItem(item: SyncQueueItem): SyncUploadItemRequest {
  return {
    client_temp_id: item.client_temp_id,
    server_id: item.server_id ? Number(item.server_id) : null,
    sync_action: item.action,
    payload: item.payload
  };
}

function isSuccess(result: SyncUploadItemResult): boolean {
  return result.sync_result === "SUCCESS" || result.sync_result === "DUPLICATE_IGNORED";
}

export async function runSyncQueue(queryClient?: QueryClient): Promise<void> {
  if (isRunning || !navigator.onLine) {
    const pendingCount = await getSyncQueuePendingCount();
    if (pendingCount > 0) {
      usePwaStore.getState().setSyncStatus("pending_sync");
    }
    return;
  }

  const processable = await getProcessableSyncItems();

  // 최대 재시도 초과 항목은 복구 불가 → IndexedDB에서 자동 삭제
  const maxedOut = processable.filter((item) => item.retry_count >= MAX_RETRY_COUNT);
  await Promise.all(
    maxedOut.map(async (item) => {
      await removeOfflineTransaction(item.local_id);
      await removeSyncItem(item.queue_id);
    })
  );

  const queueItems = processable.filter((item) => item.retry_count < MAX_RETRY_COUNT);
  if (queueItems.length === 0) {
    usePwaStore.getState().setSyncStatus("synced");
    return;
  }

  isRunning = true;
  usePwaStore.getState().setSyncStatus("syncing");

  try {
    const client = await getOrCreateSyncClient();
    await Promise.all(
      queueItems.map(async (item) => {
        await updateSyncItemStatus(item.queue_id, "processing");
        await updateOfflineSyncStatus(item.local_id, "syncing");
      })
    );

    const response = await syncApi.upload({
      client_id: client.client_id,
      device_name: client.device_name,
      platform: client.platform,
      items: queueItems.map(toUploadItem)
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message ?? "동기화에 실패했습니다.");
    }

    const data = response.data;
    const resultMap = new Map(data.items.map((item) => [item.client_temp_id, item]));
    await Promise.all(
      queueItems.map(async (queueItem) => {
        const result = resultMap.get(queueItem.client_temp_id);
        if (result && isSuccess(result)) {
          await updateOfflineSyncStatus(
            queueItem.local_id,
            "synced",
            result.server_id !== null ? String(result.server_id) : undefined,
            result.synced_at ?? data.last_synced_at
          );
          await addSyncHistory({
            queue_id: queueItem.queue_id,
            action: queueItem.action,
            result: result.sync_result
          });
          await removeSyncItem(queueItem.queue_id);
          return;
        }

        await updateOfflineSyncStatus(queueItem.local_id, "sync_failed");
        await updateSyncItemStatus(queueItem.queue_id, "failed", true);
        await addSyncHistory({
          queue_id: queueItem.queue_id,
          action: queueItem.action,
          result: "FAILED",
          error_message: result?.error_message ?? "동기화에 실패했습니다."
        });
      })
    );

    await updateSyncClientLastSyncedAt(client.client_id, data.last_synced_at);
    void queryClient?.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient?.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient?.invalidateQueries({ queryKey: ["accounts"] });
    void invalidateTransactionCaches();

    const hasFailed = data.items.some((item) => !isSuccess(item));
    usePwaStore.getState().setSyncStatus(hasFailed ? "sync_failed" : "synced");
  } catch {
    await Promise.all(
      queueItems.map(async (item) => {
        await updateOfflineSyncStatus(item.local_id, "sync_failed");
        await updateSyncItemStatus(item.queue_id, "failed", true);
      })
    );
    usePwaStore.getState().setSyncStatus("sync_failed");
  } finally {
    isRunning = false;
  }
}

export function registerSyncQueueRunner(queryClient: QueryClient): () => void {
  const handleOnline = () => {
    usePwaStore.getState().setNetworkStatus("online");
    void runSyncQueue(queryClient);
  };
  const handleOffline = () => {
    usePwaStore.getState().setNetworkStatus("offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  void runSyncQueue(queryClient);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
