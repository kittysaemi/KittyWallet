export const CACHE_NAMES = {
  DASHBOARD: "kittywallet-dashboard-api",
  RECENT_TRANSACTIONS: "kittywallet-recent-transactions-api",
  STATISTICS: "kittywallet-statistics-api",
  ACCOUNTS: "kittywallet-accounts-api",
  CARDS: "kittywallet-cards-api",
  CATEGORIES: "kittywallet-categories-api",
  IMAGES: "kittywallet-images",
  FONTS: "kittywallet-fonts",
} as const;

export const USER_API_CACHE_NAMES: readonly string[] = [
  CACHE_NAMES.DASHBOARD,
  CACHE_NAMES.RECENT_TRANSACTIONS,
  CACHE_NAMES.STATISTICS,
  CACHE_NAMES.ACCOUNTS,
  CACHE_NAMES.CARDS,
  CACHE_NAMES.CATEGORIES,
];
