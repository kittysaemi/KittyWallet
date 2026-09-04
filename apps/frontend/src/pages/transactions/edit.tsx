import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ChevronLeft, Trash2 } from "lucide-react";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { invalidateTransactionRelatedQueries } from "../../entities/transaction/lib/invalidateTransactionQueries";
import { addOfflineTransaction } from "../../pwa/indexed-db/repositories/offlineTransaction.repository";
import { enqueueSyncItem } from "../../pwa/indexed-db/repositories/syncQueue.repository";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { TransactionForm } from "../../features/transactions/TransactionForm";
import { TransferForm } from "../../features/transactions/TransferForm";
import { isTransferTransaction } from "../../entities/transaction/lib/isTransfer";
import { invalidateTransactionCaches } from "../../pwa/cache/cacheInvalidation";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";

const DeleteConfirmDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  errorMessage?: string;
  installmentTotalCount?: number | null;
  isTransfer?: boolean;
}> = ({ onConfirm, onCancel, isDeleting, errorMessage, installmentTotalCount, isTransfer }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
    <div className="w-full max-w-[400px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-xl">
      <h2 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">거래 삭제</h2>
      {isTransfer ? (
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          이 거래는 계좌이동으로, 출금·입금 내역이 함께 등록되어 있습니다. 삭제하면 두 내역이 모두
          삭제되며, 복구할 수 없습니다.
        </p>
      ) : installmentTotalCount != null ? (
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          할부 거래를 삭제하면{" "}
          <span className="font-semibold text-[var(--color-danger)]">{installmentTotalCount}개월 전체 할부 내역</span>
          이 모두 삭제됩니다. 삭제된 거래는 복구할 수 없습니다.
        </p>
      ) : (
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          이 거래를 삭제하시겠습니까? 삭제된 거래는 복구할 수 없습니다.
        </p>
      )}
      {errorMessage && (
        <p className="mb-4 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="flex-1 min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-primary)] disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 min-h-11 rounded-xl bg-[var(--color-danger)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  </div>
);

const TransactionEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // 상세화면의 편집(연필) 아이콘을 통해 진입한 경우, 원래 목록 화면(지갑 거래내역 등)으로
  // 정확히 복귀할 수 있도록 상세화면이 전달한 returnTo 경로를 사용한다. 없으면(예: 거래
  // 목록에서 항목을 눌러 상세화면을 거치지 않고 바로 진입한 경우) 기존처럼 /transactions로 이동한다.
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const transactionQuery = useQuery({
    queryKey: ["transactions", "detail", id],
    queryFn: () => transactionApi.getTransaction(Number(id)),
    enabled: !!id
  });

  const [deleteError, setDeleteError] = React.useState<string>("");

  const deleteMutation = useMutation({
    // 짝 거래가 연결된 계좌이동(transfer_group_id 존재)은 두 거래를 함께 삭제해야 하므로
    // deleteTransfer를 사용한다. 오프라인 삭제(아래 handleDelete)는 계좌이동 짝 삭제를
    // 아직 지원하지 않는다(온라인 상태에서만 계좌이동 삭제 가능).
    mutationFn: async () => {
      const currentTransferGroupId = transactionQuery.data?.data?.transfer_group_id;
      if (currentTransferGroupId) {
        await transactionApi.deleteTransfer(currentTransferGroupId);
        return;
      }
      await transactionApi.deleteTransaction(Number(id));
    },
    onSuccess: () => {
      invalidateTransactionRelatedQueries(queryClient);
      void invalidateTransactionCaches();
      navigate(returnTo ?? "/transactions", { replace: true });
    },
    onError: (err: unknown) => {
      const code =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { code?: string } })?.error?.code
          : undefined;
      if (code === "ACCOUNT_004") {
        setDeleteError(
          "이 수입을 삭제하면 계좌 잔액이 마이너스가 됩니다. 관련 지출을 먼저 삭제하거나 수정해주세요."
        );
      } else {
        setDeleteError("거래 삭제에 실패했습니다. 다시 시도해주세요.");
      }
    }
  });

  const transaction = transactionQuery.data?.data;
  const todayStr = getTodayInTimezone(timezone);
  const isFutureInstallment =
    !!transaction?.installment_id && transaction.transaction_date > todayStr;

  // 계좌이동으로 보이는 거래인지 판별. transfer_group_id가 있으면(백엔드 API #389 배포 후)
  // 짝 거래 정보를 불러와 계좌이동 전용 수정 화면(TransferForm)으로 연결한다.
  // transfer_group_id가 없는(마이그레이션 전/미매칭) 레거시 건은 기존처럼 단건 수정으로 처리한다.
  const isTransfer = transaction ? isTransferTransaction(transaction) : false;
  const transferGroupId = transaction?.transfer_group_id ?? null;

  const transferDetailQuery = useQuery({
    queryKey: ["transfer", transferGroupId],
    queryFn: () => transactionApi.getTransfer(transferGroupId!),
    enabled: !!transferGroupId
  });

  const handleDelete = async () => {
    setDeleteError("");
    if (!transaction) return;
    if (!navigator.onLine) {
      if (transferGroupId) {
        setDeleteError("계좌이동 삭제는 온라인 상태에서만 가능합니다. 네트워크 연결 후 다시 시도해주세요.");
        return;
      }
      try {
        const payload = {
          transaction_type: transaction.transaction_type,
          wallet_type: transaction.wallet_type,
          wallet_id: transaction.wallet_id,
          category_id: transaction.category_id,
          amount: transaction.amount,
          memo: transaction.memo ?? undefined,
          transaction_date: transaction.transaction_date
        };
        const offline = await addOfflineTransaction({
          ...payload,
          server_id: String(transaction.transaction_id)
        });
        await enqueueSyncItem({
          local_id: offline.local_id,
          client_temp_id: offline.client_temp_id,
          server_id: String(transaction.transaction_id),
          action: "DELETE",
          payload
        });
        usePwaStore.getState().setSyncStatus("pending_sync");
        invalidateTransactionRelatedQueries(queryClient);
        void invalidateTransactionCaches();
        navigate(returnTo ?? "/transactions", { replace: true });
      } catch {
        setDeleteError("오프라인 삭제 저장에 실패했습니다. 다시 시도해주세요.");
      }
      return;
    }
    deleteMutation.mutate();
  };

  React.useEffect(() => {
    if (transaction?.wallet_deleted) {
      navigate(`/transactions/${id}`, { replace: true });
    }
  }, [transaction?.wallet_deleted, id, navigate]);

  if (transactionQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-[480px] px-4 pt-6">
          <div className="animate-pulse h-8 w-32 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="mt-6 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse mb-4 h-10 rounded-xl bg-[var(--color-bg-secondary)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 px-4 pt-20 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">거래 내역을 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className="text-sm text-[var(--color-primary)] underline"
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

  const walletDeleted = transaction.wallet_deleted;

  return (
    <>
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
                aria-label="뒤로"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">
                {isTransfer ? "계좌이동 수정" : "거래 수정"}
              </h1>
            </div>
            {!walletDeleted && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]"
                aria-label="거래 삭제"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {walletDeleted && (
            <div className="mb-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                삭제된 지갑의 내역이라 수정이 불가능합니다.
              </p>
            </div>
          )}

          {isTransfer && !transferGroupId && (
            <div className="mb-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                계좌이동으로 보이는 거래이지만 아직 연결 정보가 없어(데이터 정리 전), 계좌이동 전용
                수정이 아닌 개별 거래 수정으로 진행합니다.
              </p>
            </div>
          )}

          {transferGroupId ? (
            transferDetailQuery.data?.data ? (
              <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)]">
                <TransferForm
                  initialData={{
                    transfer_group_id: transferGroupId,
                    from_account_id: transferDetailQuery.data.data.from_account_id,
                    from_account_name: transferDetailQuery.data.data.from_account_name,
                    from_account_deleted: transferDetailQuery.data.data.from_account_deleted,
                    to_account_id: transferDetailQuery.data.data.to_account_id,
                    to_account_name: transferDetailQuery.data.data.to_account_name,
                    to_account_deleted: transferDetailQuery.data.data.to_account_deleted,
                    amount: transferDetailQuery.data.data.amount,
                    transaction_date: transferDetailQuery.data.data.transaction_date,
                    memo: transaction.memo
                  }}
                  onSuccess={() => navigate(returnTo ?? "/transactions", { replace: true })}
                />
              </div>
            ) : (
              <div className="animate-pulse rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-4 h-10 rounded-xl bg-[var(--color-bg-secondary)]" />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)]">
              <TransactionForm
                initialData={transaction}
                transactionId={transaction.transaction_id}
                onSuccess={() => navigate(returnTo ?? "/transactions", { replace: true })}
                readOnly={walletDeleted}
                futureInstallment={isFutureInstallment}
              />
            </div>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={() => void handleDelete()}
          onCancel={() => { setShowDeleteDialog(false); setDeleteError(""); }}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteError}
          installmentTotalCount={transaction.installment_total_count}
          isTransfer={!!transferGroupId}
        />
      )}
    </>
  );
};

export default TransactionEditPage;
