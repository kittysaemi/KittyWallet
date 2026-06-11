import { USER_API_CACHE_NAMES } from "../workbox/cacheNames";

export async function deleteNamedCache(cacheName: string): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete(cacheName);
}

export async function clearUserApiCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  await Promise.all(USER_API_CACHE_NAMES.map((name) => caches.delete(name)));
}
