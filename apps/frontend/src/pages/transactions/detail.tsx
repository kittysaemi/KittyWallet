import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ChevronLeft, Circle, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { invalidateTransactionCaches } from "../../pwa/cache/cacheInvalidation";
import { addOfflineTransaction } from "../../pwa/indexed-db/repositories/offlineTransaction.repository";
import { enqueueSyncItem } from "../../pwa/indexed-db/repositories/syncQueue.repository";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

function formatAmount(amount: number, type: "INCOME" | "EXPENSE"): string {
  const formatted = amount.toLocaleString("ko-KR");
  return type === "INCOME" ? `+${formatted}원` : `-${formatted}원`;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function getIcon(
  iconMap: Map<number, IconItem>,
  iconId: number | undefined,
  size = 16,
  className = "text-[var(--color-text-secondary)]"
): React.ReactNode {
  if (!iconId) return <Circle size={size} className={className} />;
  const icon = iconMap.get(iconId);
  if (!icon) return <Circle size={size} className={className} />;
  return (
    <IconRenderer
      providerType={icon.provider_type}
      providerKey={icon.provider_key}
      size={size}
      className={className}
    />
  );
}

interface RowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}
const Row: React.FC<RowProps> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between px-6 py-4">
    <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">{label}</span>
    <div className="ml-4 flex min-w-0 items-center gap-2">
      {icon && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate text-right text-sm font-medium text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  </div>
);

const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");

  const deleteMutation = useMutation({
    mutationFn: () => transactionApi.deleteTransaction(Number(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      void invalidateTransactionCaches();
      navigate("/transactions", { replace: true });
    },
    onError: (err: unknown) => {
      const code =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { code?: string } })?.error?.code
          : undefined;
      setDeleteError(
        code === "ACCOUNT_004"
          ? "이 수입을 삭제하면 계좌 잔액이 마이너스가 됩니다. 관련 지출을 먼저 삭제하거나 수정해주세요."
          : "거래 삭제에 실패했습니다. 다시 시도해주세요."
      );
    }
  });

  const txQuery = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionApi.getTransaction(Number(id)),
    enabled: !!id
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 10 * 60 * 1000
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: 5 * 60 * 1000
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts(),
    staleTime: 5 * 60 * 1000,
    enabled: txQuery.data?.data?.wallet_type === "ACCOUNT"
  });

  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: 5 * 60 * 1000,
    enabled: txQuery.data?.data?.wallet_type === "CARD"
  });

  const tx = txQuery.data?.data;

  const handleDelete = async () => {
    setDeleteError("");
    if (!tx) return;
    if (!navigator.onLine) {
      try {
        const payload = {
          transaction_type: tx.transaction_type,
          wallet_type: tx.wallet_type,
          wallet_id: tx.wallet_id,
          category_id: tx.category_id,
          amount: tx.amount,
          memo: tx.memo ?? undefined,
          transaction_date: tx.transaction_date
        };
        const offline = await addOfflineTransaction({
          ...payload,
          server_id: String(tx.transaction_id)
        });
        await enqueueSyncItem({
          local_id: offline.local_id,
          client_temp_id: offline.client_temp_id,
          server_id: String(tx.transaction_id),
          action: "DELETE",
          payload
        });
        usePwaStore.getState().setSyncStatus("pending_sync");
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        void queryClient.invalidateQueries({ queryKey: ["accounts"] });
        void queryClient.invalidateQueries({ queryKey: ["cards"] });
        void queryClient.invalidateQueries({ queryKey: ["statistics"] });
        void invalidateTransactionCaches();
        navigate("/transactions", { replace: true });
      } catch {
        setDeleteError("오프라인 삭제 저장에 실패했습니다. 다시 시도해주세요.");
      }
      return;
    }
    deleteMutation.mutate();
  };

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const categoryIconId = React.useMemo(() => {
    if (!tx) return undefined;
    return categoriesQuery.data?.data?.items.find((c) => c.category_id === tx.category_id)?.icon_id;
  }, [tx, categoriesQuery.data]);

  const walletIconId = React.useMemo(() => {
    if (!tx) return undefined;
    if (tx.wallet_type === "ACCOUNT") {
      return accountsQuery.data?.data?.items.find((a) => a.account_id === tx.wallet_id)?.icon_id;
    }
    return cardsQuery.data?.data?.items.find((c) => c.card_id === tx.wallet_id)?.icon_id;
  }, [tx, accountsQuery.data, cardsQuery.data]);

  const isIncome = tx?.transaction_type === "INCOME";
  const gradient = isIncome
    ? "linear-gradient(160deg, #7DD3FC 0%, #38BDF8 100%)"
    : "linear-gradient(160deg, var(--color-primary) 0%, #F98DD9 100%)";
  const heroShadow = isIncome
    ? "0 6px 24px rgba(56,189,248,0.35)"
    : "0 6px 24px rgba(253,165,227,0.40)";

  return (
    <>
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">

        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
              aria-label="뒤로"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">상세내역</h1>
          </div>
          {tx?.wallet_deleted && (
            <button
              type="button"
              onClick={() => { setDeleteError(""); setShowDeleteDialog(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]"
              aria-label="거래 삭제"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* 로딩 */}
        {txQuery.isLoading && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]">
            <div className="animate-pulse rounded-t-2xl bg-[var(--color-primary-soft)] px-6 py-10 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-white/40" />
              <div className="mx-auto mt-4 h-4 w-20 rounded-lg bg-white/40" />
              <div className="mx-auto mt-3 h-8 w-32 rounded-xl bg-white/40" />
              <div className="mx-auto mt-3 h-3 w-28 rounded-lg bg-white/40" />
            </div>
            <div className="divide-y divide-[var(--color-border-secondary)] pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center justify-between px-6 py-4">
                  <div className="h-3.5 w-14 rounded-lg bg-[var(--color-bg-secondary)]" />
                  <div className="h-3.5 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 에러 */}
        {txQuery.isError && (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-6 py-10 text-center"
            role="alert"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">내역을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => void txQuery.refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {/* 삭제된 지갑 안내 */}
        {tx?.wallet_deleted && (
          <div className="mb-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              삭제된 지갑의 내역이라 수정이 불가능합니다.
            </p>
          </div>
        )}

        {/* 영수증 카드 */}
        {tx && (
          <div
            className="relative rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]"
            style={{ boxShadow: "0 4px 16px var(--color-card-shadow)" }}
          >
            {/* ── 상단: 히어로 섹션 ── */}
            <div
              className="rounded-t-[14px] px-6 pb-8 pt-8 text-center"
              style={{ background: gradient, boxShadow: heroShadow }}
            >
              {/* 아이콘 */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25">
                {getIcon(iconMap, categoryIconId, 28, "text-white")}
              </div>

              {/* 카테고리명 */}
              <p className="text-sm font-medium text-white/80">{tx.category_name}</p>

              {/* 금액 */}
              <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                {formatAmount(tx.amount, tx.transaction_type)}
              </p>

              {/* 날짜 */}
              <p className="mt-2 text-sm text-white/70">{formatDate(tx.transaction_date)}</p>
            </div>

            {/* ── 점선 구분선 + 반원 노치 ── */}
            <div className="relative flex items-center py-4">
              {/* 왼쪽 노치 */}
              <div
                className="absolute -left-3.5 z-10 h-7 w-7 rounded-full"
                style={{ backgroundColor: "var(--color-bg-primary)" }}
              />
              {/* 점선 */}
              <div
                className="flex-1 border-t-2 border-dashed"
                style={{ borderColor: "var(--color-border-primary)", marginLeft: "14px", marginRight: "14px" }}
              />
              {/* 오른쪽 노치 */}
              <div
                className="absolute -right-3.5 z-10 h-7 w-7 rounded-full"
                style={{ backgroundColor: "var(--color-bg-primary)" }}
              />
            </div>

            {/* ── 하단: 상세 정보 ── */}
            <div className="divide-y divide-[var(--color-border-secondary)] pb-2">
              <Row
                label="거래 유형"
                value={isIncome ? "수입" : "지출"}
              />
              <Row
                label="지갑"
                value={`${tx.wallet_name} (${tx.wallet_type === "ACCOUNT" ? "계좌" : "카드"})${tx.wallet_deleted ? " [삭제됨]" : ""}`}
                icon={getIcon(iconMap, walletIconId)}
              />
              {tx.memo && <Row label="메모" value={tx.memo} />}
            </div>
          </div>
        )}

      </div>
    </div>

    {showDeleteDialog && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
        <div className="w-full max-w-[400px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-xl">
          <h2 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">거래 삭제</h2>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            이 거래를 삭제하시겠습니까? 삭제된 거래는 복구할 수 없습니다.
          </p>
          {deleteError && (
            <p className="mb-4 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {deleteError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowDeleteDialog(false); setDeleteError(""); }}
              disabled={deleteMutation.isPending}
              className="flex-1 min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-primary)] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
              className="flex-1 min-h-11 rounded-xl bg-[var(--color-danger)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default TransactionDetailPage;
