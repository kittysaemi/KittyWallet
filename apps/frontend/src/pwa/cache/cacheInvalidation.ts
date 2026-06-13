import { CACHE_NAMES } from "../workbox/cacheNames";
import { clearUserApiCaches, deleteNamedCache } from "./cacheStorage.service";

export async function invalidateTransactionCaches(): Promise<void> {
  await Promise.all([
    deleteNamedCache(CACHE_NAMES.ACCOUNTS),
    deleteNamedCache(CACHE_NAMES.CARDS),
    deleteNamedCache(CACHE_NAMES.DASHBOARD),
    deleteNamedCache(CACHE_NAMES.RECENT_TRANSACTIONS),
    deleteNamedCache(CACHE_NAMES.STATISTICS),
  ]);
}

export async function invalidateAccountCaches(): Promise<void> {
  await Promise.all([
    deleteNamedCache(CACHE_NAMES.ACCOUNTS),
    deleteNamedCache(CACHE_NAMES.DASHBOARD),
  ]);
}

export async function invalidateCardCaches(): Promise<void> {
  await Promise.all([
    deleteNamedCache(CACHE_NAMES.CARDS),
    deleteNamedCache(CACHE_NAMES.DASHBOARD),
  ]);
}

export async function invalidateCategoryCaches(): Promise<void> {
  await Promise.all([
    deleteNamedCache(CACHE_NAMES.CATEGORIES),
    deleteNamedCache(CACHE_NAMES.STATISTICS),
  ]);
}

export { clearUserApiCaches };
