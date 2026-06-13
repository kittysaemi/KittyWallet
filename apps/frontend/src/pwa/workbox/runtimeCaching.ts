import type { VitePWAOptions } from "vite-plugin-pwa";
import { CACHE_NAMES } from "./cacheNames";

type RuntimeCaching = NonNullable<VitePWAOptions["workbox"]>["runtimeCaching"];
type UrlPatternContext = { url: URL };
type RequestPatternContext = { request: Request };

const startsWithApiPath =
  (path: string) =>
  ({ url }: UrlPatternContext) =>
    url.pathname.startsWith(path);

const hasRequestDestination =
  (destination: RequestDestination) =>
  ({ request }: RequestPatternContext) =>
    request.destination === destination;

export const runtimeCaching: RuntimeCaching = [
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/dashboard"),
    handler: "NetworkFirst",
    options: {
      cacheName: CACHE_NAMES.DASHBOARD,
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 }
    }
  },
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/transactions/recent"),
    handler: "NetworkFirst",
    options: {
      cacheName: CACHE_NAMES.RECENT_TRANSACTIONS,
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 }
    }
  },
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/statistics"),
    handler: "NetworkFirst",
    options: {
      cacheName: CACHE_NAMES.STATISTICS,
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 }
    }
  },
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/accounts"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: CACHE_NAMES.ACCOUNTS,
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 }
    }
  },
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/cards"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: CACHE_NAMES.CARDS,
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 }
    }
  },
  {
    urlPattern: startsWithApiPath("/kittywallet/api/v1/categories"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: CACHE_NAMES.CATEGORIES,
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 }
    }
  },
  {
    urlPattern: hasRequestDestination("image"),
    handler: "CacheFirst",
    options: {
      cacheName: CACHE_NAMES.IMAGES,
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }
    }
  },
  {
    urlPattern: hasRequestDestination("font"),
    handler: "CacheFirst",
    options: {
      cacheName: CACHE_NAMES.FONTS,
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }
    }
  }
];
