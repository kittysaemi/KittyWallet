import type { ApiResponse } from "../../icon/model/icon.types";

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type SyncResult = "SUCCESS" | "FAILED" | "CONFLICT" | "DUPLICATE_IGNORED";

export interface SyncUploadItemRequest {
  client_temp_id: string;
  server_id?: number | null;
  sync_action: SyncAction;
  payload: Record<string, unknown>;
}

export interface SyncUploadRequest {
  client_id: string;
  device_name?: string;
  platform?: string;
  items: SyncUploadItemRequest[];
}

export interface SyncUploadItemResult {
  client_temp_id: string;
  server_id: number | null;
  sync_action: SyncAction;
  sync_result: SyncResult;
  error_code?: string;
  error_message?: string;
  synced_at?: string;
  updated_at?: string;
}

export interface SyncUploadData {
  last_synced_at: string;
  items: SyncUploadItemResult[];
}

export type SyncUploadResponse = ApiResponse<SyncUploadData>;
