export type InstallStatus =
  | "installable"
  | "installed"
  | "dismissed"
  | "unsupported";

export type NetworkStatus = "online" | "offline";

export type CacheStatus = "cache_loading" | "cache_ready" | "cache_error";

export type SyncStatus =
  | "pending_sync"
  | "syncing"
  | "synced"
  | "sync_failed";

export type UpdateStatus =
  | "update_available"
  | "updating"
  | "update_completed"
  | "update_failed";

export interface PwaState {
  installStatus: InstallStatus;
  networkStatus: NetworkStatus;
  cacheStatus: CacheStatus;
  syncStatus: SyncStatus;
  updateStatus: UpdateStatus | null;
}
