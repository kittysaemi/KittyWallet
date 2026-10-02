import type { FavoriteTransactionItem } from "../model/favoriteTransaction.types";

export type FavoriteSortOrder = "latest" | "category";

/** 지갑이 삭제·사용 안 함이거나 카테고리가 숨김이면 사용할 수 없다(거래정책.md 11.1). */
export function isFavoriteUsable(item: FavoriteTransactionItem): boolean {
  return !item.wallet_deleted && item.wallet_use_yn && item.category_show;
}

/** 관리 탭에 표시할 사용 불가 원인. 사용 가능하면 빈 배열. */
export function getFavoriteUnusableReasons(item: FavoriteTransactionItem): string[] {
  const reasons: string[] = [];
  if (item.wallet_deleted) reasons.push(`${walletLabel(item)} 삭제됨`);
  else if (!item.wallet_use_yn) reasons.push(`${walletLabel(item)} 사용 안 함`);
  if (!item.category_show) reasons.push("카테고리 숨김");
  return reasons;
}

function walletLabel(item: FavoriteTransactionItem): string {
  return item.wallet_type === "ACCOUNT" ? "계좌" : "카드";
}

/**
 * 바로 등록 선택 목록 대상(거래정책.md 11.2): 사용 불가 항목과 잔액 부족 항목을 제외하고,
 * 지갑 화면에서 연 경우에는 해당 지갑 항목만 남긴다.
 */
export function selectFavoritesForQuickEntry(
  items: readonly FavoriteTransactionItem[],
  wallet?: { walletType: "ACCOUNT" | "CARD"; walletId: number }
): FavoriteTransactionItem[] {
  return items.filter(
    (item) =>
      isFavoriteUsable(item) &&
      !item.balance_insufficient &&
      (!wallet || (item.wallet_type === wallet.walletType && item.wallet_id === wallet.walletId))
  );
}

/** 최신순: 처음 추가한 시각 기준 최근 항목이 위(API 응답 순서와 같다). */
function compareLatest(left: FavoriteTransactionItem, right: FavoriteTransactionItem): number {
  if (left.created_at !== right.created_at) return left.created_at < right.created_at ? 1 : -1;
  return right.favorite_transaction_id - left.favorite_transaction_id;
}

/** 카테고리 가나다순(한국어 로캘), 같은 카테고리 안에서는 최신순. */
export function sortFavorites(
  items: readonly FavoriteTransactionItem[],
  order: FavoriteSortOrder
): FavoriteTransactionItem[] {
  return [...items].sort((left, right) => {
    if (order === "category") {
      const byName = left.category_name.localeCompare(right.category_name, "ko", { numeric: true });
      if (byName !== 0) return byName;
    }
    return compareLatest(left, right);
  });
}
