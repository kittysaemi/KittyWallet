import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Trash2 } from "lucide-react";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { TransactionForm } from "../../features/transactions/TransactionForm";

const DeleteConfirmDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
    <div className="w-full max-w-[400px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-xl">
      <h2 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">거래 삭제</h2>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
        이 거래를 삭제하시겠습니까? 삭제된 거래는 복구할 수 없습니다.
      </p>
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
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const transactionQuery = useQuery({
    queryKey: ["transactions", "detail", id],
    queryFn: () => transactionApi.getTransaction(Number(id)),
    enabled: !!id
  });

  const deleteMutation = useMutation({
    mutationFn: () => transactionApi.deleteTransaction(Number(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/transactions", { replace: true });
    }
  });

  const transaction = transactionQuery.data?.data;

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
              <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">거래 수정</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]"
              aria-label="거래 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)]">
            <TransactionForm
              initialData={transaction}
              transactionId={transaction.transaction_id}
              onSuccess={() => navigate("/transactions", { replace: true })}
            />
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
};

export default TransactionEditPage;
