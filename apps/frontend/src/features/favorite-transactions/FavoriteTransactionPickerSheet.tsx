import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  FAVORITE_TRANSACTIONS_QUERY_KEY,
  favoriteTransactionApi
} from "../../entities/favorite-transaction/api/favoriteTransactionApi";
import {
  type FavoriteSortOrder,
  selectFavoritesForQuickEntry,
  sortFavorites
} from "../../entities/favorite-transaction/lib/favoriteTransactionList";
import type { FavoriteTransactionItem } from "../../entities/favorite-transaction/model/favoriteTransaction.types";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { invalidateTransactionRelatedQueries } from "../../entities/transaction/lib/invalidateTransactionQueries";
import { invalidateTransactionCaches } from "../../pwa/cache/cacheInvalidation";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { toSupportErrorMessage } from "../../shared/api/apiError";
import { STALE_TIME } from "../../shared/constants/queryConfig";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";
import { FavoriteTransactionSummary } from "./FavoriteTransactionSummary";

interface FavoriteTransactionPickerSheetProps {
  /** 지갑 화면에서 연 경우 해당 지갑 항목만 보여 준다. 없으면 전체 항목. */
  wallet?: { walletType: "ACCOUNT" | "CARD"; walletId: number };
  onClose: () => void;
  /** 바로 등록 성공 후 호출된다(목록은 호출 측에서 닫는다). */
  onRegistered: (transactionDate: string) => void;
}

const SORT_OPTIONS: { key: FavoriteSortOrder; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "category", label: "카테고리 가나다순" }
];

/**
 * 자주 쓰는 거래 선택 목록(화면정의 §23). 항목을 누르면 확인 팝업 없이 오늘 날짜의
 * 일반 거래로 바로 등록한다. 온라인 전용이며 Sync Queue를 쓰지 않는다.
 */
export const FavoriteTransactionPickerSheet: React.FC<FavoriteTransactionPickerSheetProps> = ({
  wallet,
  onClose,
  onRegistered
}) => {
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const isOffline = usePwaStore((state) => state.networkStatus) === "offline";
  const [sortOrder, setSortOrder] = React.useState<FavoriteSortOrder>("latest");
  const [registerError, setRegisterError] = React.useState("");

  const favoritesQuery = useQuery({
    queryKey: FAVORITE_TRANSACTIONS_QUERY_KEY,
    queryFn: favoriteTransactionApi.getFavoriteTransactions,
    staleTime: STALE_TIME.REALTIME,
    refetchOnMount: "always"
  });

  const registerMutation = useMutation({
    mutationFn: (item: FavoriteTransactionItem) => {
      const transactionDate = getTodayInTimezone(timezone);
      // 일반 거래로 등록: 할부·계좌이동 없이 n월 현금 동일 사용·고정지출은 기본값(false)으로 저장한다.
      return transactionApi
        .createTransaction({
          transaction_type: item.transaction_type,
          wallet_type: item.wallet_type,
          wallet_id: item.wallet_id,
          category_id: item.category_id,
          amount: item.amount,
          ...(item.memo ? { memo: item.memo } : {}),
          transaction_date: transactionDate,
          timezone,
          next_month_cash_yn: false,
          fixed_expense_yn: false
        })
        .then(() => transactionDate);
    },
    onSuccess: (transactionDate) => {
      invalidateTransactionRelatedQueries(queryClient);
      void invalidateTransactionCaches();
      void queryClient.invalidateQueries({ queryKey: FAVORITE_TRANSACTIONS_QUERY_KEY });
      onRegistered(transactionDate);
    },
    onError: (error: unknown) => {
      setRegisterError(toSupportErrorMessage(error));
      // 잔액이 바뀌었을 수 있으므로 선택 목록을 다시 계산한다.
      void queryClient.invalidateQueries({ queryKey: FAVORITE_TRANSACTIONS_QUERY_KEY });
    }
  });

  const items = React.useMemo(
    () =>
      sortFavorites(
        selectFavoritesForQuickEntry(favoritesQuery.data?.data?.items ?? [], wallet),
        sortOrder
      ),
    [favoritesQuery.data, wallet, sortOrder]
  );

  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !registerMutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, registerMutation.isPending]);

  const isLoading = favoritesQuery.isLoading;
  const isError =
    !isLoading && (favoritesQuery.isError || (favoritesQuery.data && !favoritesQuery.data.success));
  const isPending = registerMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-black/50 px-4 pb-safe sm:items-center sm:justify-center"
      onClick={() => !isPending && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-bg-card)] p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="favorite-picker-title" className="font-gamja text-xl text-[var(--color-text-primary)]">
            자주 쓰는 거래
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 flex gap-1 rounded-xl bg-[var(--color-bg-secondary)] p-1" role="group" aria-label="정렬">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={sortOrder === key}
              onClick={() => setSortOrder(key)}
              className={`min-h-9 flex-1 rounded-lg text-sm font-semibold transition ${
                sortOrder === key
                  ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {registerError && (
          <div
            className="mb-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
            role="alert"
          >
            {registerError}
          </div>
        )}
        {isOffline && (
          <p className="mb-3 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]" role="status">
            오프라인에서는 자주 쓰는 거래를 등록할 수 없어요.
          </p>
        )}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {isLoading && (
            <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">불러오는 중...</p>
          )}
          {isError && (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                자주 쓰는 거래 목록을 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={() => void favoritesQuery.refetch()}
                className="mt-3 min-h-11 rounded-xl border border-[var(--color-border-primary)] px-4 text-sm font-semibold text-[var(--color-text-secondary)]"
              >
                다시 시도
              </button>
            </div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
              선택할 수 있는 자주 쓰는 거래가 없습니다.
            </p>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="자주 쓰는 거래 선택 목록">
              {items.map((item) => (
                <li key={item.favorite_transaction_id}>
                  <button
                    type="button"
                    disabled={isPending || isOffline}
                    onClick={() => {
                      setRegisterError("");
                      registerMutation.mutate(item);
                    }}
                    className="flex min-h-14 w-full items-center rounded-2xl border border-[var(--color-border-primary)] px-3 text-left hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FavoriteTransactionSummary item={item} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isPending && (
          <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)]" aria-live="polite">
            등록하고 있습니다…
          </p>
        )}
      </section>
    </div>
  );
};
