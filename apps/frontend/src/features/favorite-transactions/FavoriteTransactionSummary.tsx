import React from "react";
import type { FavoriteTransactionItem } from "../../entities/favorite-transaction/model/favoriteTransaction.types";

/**
 * 자주 쓰는 거래 한 줄 표시: 수입/지출 구분, 금액, 지갑, 카테고리, 메모(거래정책.md 11.2).
 * 메모가 없으면 메모 자리는 비워 둔다. 좁은 화면에서는 지갑·카테고리·메모를 말줄임한다.
 */
export const FavoriteTransactionSummary: React.FC<{ item: FavoriteTransactionItem }> = ({ item }) => {
  const isIncome = item.transaction_type === "INCOME";
  return (
    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm">
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
          isIncome
            ? "bg-[var(--color-bg-secondary)] text-[var(--color-income)]"
            : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
        }`}
      >
        {isIncome ? "수입" : "지출"}
      </span>
      <span className="shrink-0 font-semibold text-[var(--color-text-primary)]">
        {item.amount.toLocaleString("ko-KR")}원
      </span>
      <span className="min-w-0 max-w-[30%] truncate text-[var(--color-text-secondary)]">
        {item.wallet_name}
      </span>
      <span className="min-w-0 max-w-[25%] shrink-0 truncate text-[var(--color-text-secondary)]">
        {item.category_name}
      </span>
      <span className="min-w-0 flex-1 truncate text-[var(--color-text-caption)]">
        {item.memo ?? ""}
      </span>
    </div>
  );
};
