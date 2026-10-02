import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, X } from "lucide-react";
import {
  FAVORITE_TRANSACTIONS_QUERY_KEY,
  favoriteTransactionApi
} from "../../entities/favorite-transaction/api/favoriteTransactionApi";
import { getFavoriteUnusableReasons } from "../../entities/favorite-transaction/lib/favoriteTransactionList";
import type {
  FavoriteTransactionItem,
  SaveFavoriteTransactionRequest
} from "../../entities/favorite-transaction/model/favoriteTransaction.types";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { toSupportErrorMessage } from "../../shared/api/apiError";
import { RETRY, STALE_TIME } from "../../shared/constants/queryConfig";
import { Button } from "../../shared/ui/Button";
import { FavoriteTransactionForm } from "./FavoriteTransactionForm";
import { FavoriteTransactionSummary } from "./FavoriteTransactionSummary";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

type FormTarget = { type: "create" } | { type: "edit"; item: FavoriteTransactionItem } | null;

/** 관리 화면 "자주 쓰는 거래" 탭(화면정의 §22). 등록·수정·삭제는 온라인에서만 가능하다. */
export const FavoriteTransactionsManageTab: React.FC = () => {
  const queryClient = useQueryClient();
  const isOffline = usePwaStore((state) => state.networkStatus) === "offline";
  const [formTarget, setFormTarget] = React.useState<FormTarget>(null);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<FavoriteTransactionItem | null>(null);
  const [deleteError, setDeleteError] = React.useState("");

  const favoritesQuery = useQuery({
    queryKey: FAVORITE_TRANSACTIONS_QUERY_KEY,
    queryFn: favoriteTransactionApi.getFavoriteTransactions,
    staleTime: STALE_TIME.REALTIME,
    refetchOnMount: "always",
    retry: isOffline ? false : RETRY.AGGRESSIVE
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: FAVORITE_TRANSACTIONS_QUERY_KEY });

  const closeForm = () => {
    setFormTarget(null);
    setFormError("");
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: SaveFavoriteTransactionRequest }) =>
      id === undefined
        ? favoriteTransactionApi.createFavoriteTransaction(data)
        : favoriteTransactionApi.updateFavoriteTransaction(id, data),
    onSuccess: async () => {
      closeForm();
      await refresh();
    },
    onError: (error: unknown) => {
      setFormError(toSupportErrorMessage(error));
      // 이미 삭제된 항목이면 목록을 다시 불러와 최신 상태를 보여 준다.
      void refresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => favoriteTransactionApi.deleteFavoriteTransaction(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError("");
      await refresh();
    },
    onError: (error: unknown) => {
      setDeleteError(toSupportErrorMessage(error));
      void refresh();
    }
  });

  const items = favoritesQuery.data?.data?.items ?? [];
  const isLoading = favoritesQuery.isLoading;
  const isError =
    !isLoading && (favoritesQuery.isError || (favoritesQuery.data && !favoritesQuery.data.success));
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  const renderForm = (initialData?: FavoriteTransactionItem) => (
    <div className={`${cardClass} p-4`}>
      <FavoriteTransactionForm
        key={initialData?.favorite_transaction_id ?? "new"}
        initialData={initialData}
        isSaving={saveMutation.isPending}
        disabled={isOffline}
        apiError={formError}
        onSubmit={(data) =>
          saveMutation.mutate({ id: initialData?.favorite_transaction_id, data })
        }
        onCancel={closeForm}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">
            자주 쓰는 거래를 관리합니다.
          </p>
          <button
            type="button"
            aria-label="자주 쓰는 거래 등록"
            disabled={isOffline || isPending}
            onClick={() => {
              setFormError("");
              setFormTarget((prev) => (prev?.type === "create" ? null : { type: "create" }));
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>

        {isOffline && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[#FFF8E8] px-4 py-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              오프라인에서는 자주 쓰는 거래를 등록·수정·삭제할 수 없어요.
            </p>
          </div>
        )}

        {formTarget?.type === "create" && renderForm()}

        {isLoading && (
          <div className={`${cardClass} h-20 animate-pulse`} aria-label="불러오는 중" />
        )}

        {isError && (
          <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="font-medium text-[var(--color-text-primary)]">
              자주 쓰는 거래 목록을 불러오지 못했습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void favoritesQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && formTarget?.type !== "create" && (
          <div className={`${cardClass} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="text-5xl">🐾</span>
            <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
              아직 등록된 자주 쓰는 거래가 없어요.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="자주 쓰는 거래 목록">
            {items.map((item) => {
              if (formTarget?.type === "edit" && formTarget.item.favorite_transaction_id === item.favorite_transaction_id) {
                return <li key={item.favorite_transaction_id}>{renderForm(item)}</li>;
              }
              const reasons = getFavoriteUnusableReasons(item);
              return (
                <li
                  key={item.favorite_transaction_id}
                  className={`${cardClass} flex items-start gap-2 p-4 ${reasons.length > 0 ? "bg-[var(--color-bg-secondary)]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <FavoriteTransactionSummary item={item} />
                    {reasons.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-danger)]">
                        <span className="rounded-full border border-[var(--color-danger)] px-2 py-0.5 font-semibold">
                          사용 불가
                        </span>
                        <span>{reasons.join(" · ")}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${item.category_name} ${item.amount.toLocaleString("ko-KR")}원 수정`}
                    disabled={isOffline || isPending}
                    onClick={() => {
                      setFormError("");
                      setFormTarget({ type: "edit", item });
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${item.category_name} ${item.amount.toLocaleString("ko-KR")}원 삭제`}
                    disabled={isOffline || isPending}
                    onClick={() => {
                      setDeleteError("");
                      setDeleteTarget(item);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-caption)] transition hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="favorite-delete-title"
            className="w-full max-w-[400px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-xl"
          >
            <h2 id="favorite-delete-title" className="mb-2 text-base font-bold text-[var(--color-text-primary)]">
              자주 쓰는 거래 삭제
            </h2>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              이 항목을 삭제할까요? 이미 등록된 거래는 그대로 남습니다.
            </p>
            <div className="mb-4 rounded-xl bg-[var(--color-bg-secondary)] p-3">
              <FavoriteTransactionSummary item={deleteTarget} />
            </div>
            {deleteError && (
              <p className="mb-3 text-sm text-[var(--color-danger)]" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={deleteMutation.isPending || isOffline}
                onClick={() => deleteMutation.mutate(deleteTarget.favorite_transaction_id)}
                className="min-h-11 w-full rounded-xl bg-[var(--color-danger)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
                className="min-h-11 w-full rounded-xl text-sm font-medium text-[var(--color-text-secondary)] disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
