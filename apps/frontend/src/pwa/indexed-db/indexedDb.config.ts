export const DB_CONFIG = {
  name: "kittywallet-db",
  version: 1,
} as const;

export const STORE_NAMES = {
  OFFLINE_TRANSACTIONS: "offline_transactions",
  SYNC_QUEUE: "sync_queue",
  SYNC_HISTORY: "sync_history",
  SYNC_CLIENT: "sync_client",
  APP_SETTINGS: "app_settings",
} as const;
