export type TransactionType = "INCOME" | "EXPENSE";
export type WalletType = "ACCOUNT" | "CARD";
export type OfflineSyncStatus = "pending_sync" | "syncing" | "synced" | "sync_failed";
export type QueueStatus = "waiting" | "processing" | "completed" | "failed";
export type QueueAction = "CREATE" | "UPDATE" | "DELETE";
export type PlatformType = "WEB" | "PWA" | "IOS" | "ANDROID";

export interface OfflineTransaction {
  local_id: string;
  server_id?: string;
  client_temp_id: string;
  transaction_type: TransactionType;
  wallet_type: WalletType;
  wallet_id: number;
  category_id: number;
  amount: number;
  memo?: string;
  transaction_date: string;
  deleted_yn: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: OfflineSyncStatus;
}

export interface SyncQueueItem {
  queue_id: string;
  local_id: string;
  client_temp_id: string;
  server_id?: string;
  action: QueueAction;
  payload: Record<string, unknown>;
  status: QueueStatus;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface SyncHistoryItem {
  history_id: string;
  queue_id: string;
  action: string;
  result: string;
  error_message?: string;
  synced_at: string;
}

export interface SyncClientItem {
  client_id: string;
  device_name?: string;
  platform: PlatformType;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  setting_key: string;
  setting_value: string;
}
