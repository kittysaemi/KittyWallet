import { describe, expect, it } from "vitest";
import type { FavoriteTransactionItem } from "../model/favoriteTransaction.types";
import {
  getFavoriteUnusableReasons,
  isFavoriteUsable,
  selectFavoritesForQuickEntry,
  sortFavorites
} from "./favoriteTransactionList";

const makeItem = (overrides: Partial<FavoriteTransactionItem> = {}): FavoriteTransactionItem => ({
  favorite_transaction_id: 1,
  transaction_type: "EXPENSE",
  wallet_type: "ACCOUNT",
  wallet_id: 1,
  wallet_name: "우리은행",
  wallet_use_yn: true,
  wallet_deleted: false,
  category_id: 1,
  category_name: "식비",
  category_show: true,
  amount: 9000,
  memo: null,
  balance_insufficient: false,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  ...overrides
});

describe("isFavoriteUsable / getFavoriteUnusableReasons", () => {
  it("usable when wallet active and category shown", () => {
    expect(isFavoriteUsable(makeItem())).toBe(true);
    expect(getFavoriteUnusableReasons(makeItem())).toEqual([]);
  });

  it("reports deleted wallet, inactive card and hidden category", () => {
    expect(getFavoriteUnusableReasons(makeItem({ wallet_deleted: true }))).toEqual(["계좌 삭제됨"]);
    expect(
      getFavoriteUnusableReasons(makeItem({ wallet_type: "CARD", wallet_use_yn: false }))
    ).toEqual(["카드 사용 안 함"]);
    expect(
      getFavoriteUnusableReasons(makeItem({ wallet_deleted: true, category_show: false }))
    ).toEqual(["계좌 삭제됨", "카테고리 숨김"]);
    expect(isFavoriteUsable(makeItem({ category_show: false }))).toBe(false);
  });
});

describe("selectFavoritesForQuickEntry", () => {
  const items = [
    makeItem({ favorite_transaction_id: 1 }),
    makeItem({ favorite_transaction_id: 2, balance_insufficient: true }),
    makeItem({ favorite_transaction_id: 3, wallet_deleted: true }),
    makeItem({ favorite_transaction_id: 4, category_show: false }),
    makeItem({ favorite_transaction_id: 5, wallet_type: "CARD", wallet_id: 7 }),
    makeItem({ favorite_transaction_id: 6, wallet_type: "CARD", wallet_id: 8, wallet_use_yn: false }),
    makeItem({ favorite_transaction_id: 7, transaction_type: "INCOME", wallet_id: 2 })
  ];

  it("excludes unusable and balance-short items", () => {
    expect(selectFavoritesForQuickEntry(items).map((i) => i.favorite_transaction_id)).toEqual([
      1, 5, 7
    ]);
  });

  it("keeps only the given wallet's items", () => {
    expect(
      selectFavoritesForQuickEntry(items, { walletType: "CARD", walletId: 7 }).map(
        (i) => i.favorite_transaction_id
      )
    ).toEqual([5]);
    expect(
      selectFavoritesForQuickEntry(items, { walletType: "ACCOUNT", walletId: 7 })
    ).toEqual([]);
  });
});

describe("sortFavorites", () => {
  const items = [
    makeItem({ favorite_transaction_id: 1, category_name: "카페", created_at: "2026-10-01T00:00:00.000Z" }),
    makeItem({ favorite_transaction_id: 2, category_name: "교통", created_at: "2026-10-02T00:00:00.000Z" }),
    makeItem({ favorite_transaction_id: 3, category_name: "카페", created_at: "2026-10-03T00:00:00.000Z" }),
    makeItem({ favorite_transaction_id: 4, category_name: "교통", created_at: "2026-10-02T00:00:00.000Z" })
  ];

  it("latest: newest created first, ties by id desc", () => {
    expect(sortFavorites(items, "latest").map((i) => i.favorite_transaction_id)).toEqual([
      3, 4, 2, 1
    ]);
  });

  it("category: Korean name order, latest within same category", () => {
    expect(sortFavorites(items, "category").map((i) => i.favorite_transaction_id)).toEqual([
      4, 2, 3, 1
    ]);
  });

  it("does not mutate input", () => {
    const copy = [...items];
    sortFavorites(items, "category");
    expect(items).toEqual(copy);
  });
});
