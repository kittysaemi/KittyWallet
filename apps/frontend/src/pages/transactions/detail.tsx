import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Circle, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function formatAmount(amount: number, type: "INCOME" | "EXPENSE"): string {
  const formatted = amount.toLocaleString("ko-KR");
  return type === "INCOME" ? `+${formatted}원` : `-${formatted}원`;
}

interface RowProps {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ label, value, valueClass, icon }) => (
  <div className="flex items-center justify-between px-5 py-4">
    <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">{label}</span>
    <div className="ml-4 flex min-w-0 items-center gap-2">
      {icon && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
          {icon}
        </span>
      )}
      <span className={`min-w-0 truncate text-right text-sm font-medium text-[var(--color-text-primary)] ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  </div>
);

function renderIcon(iconMap: Map<number, IconItem>, iconId: number | undefined): React.ReactNode {
  if (!iconId) return <Circle size={15} className="text-[var(--color-text-secondary)]" />;
  const icon = iconMap.get(iconId);
  if (!icon) return <Circle size={15} className="text-[var(--color-text-secondary)]" />;
  return (
    <IconRenderer
      providerType={icon.provider_type}
      providerKey={icon.provider_key}
      size={15}
      className="text-[var(--color-text-primary)]"
    />
  );
}

const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    queryKey: ["accounts", "active"],
    queryFn: () => accountApi.getAccounts({ use_yn: true }),
    staleTime: 5 * 60 * 1000,
    enabled: txQuery.data?.data?.wallet_type === "ACCOUNT"
  });

  const cardsQuery = useQuery({
    queryKey: ["cards", "active"],
    queryFn: () => cardApi.getCards({ use_yn: true }),
    staleTime: 5 * 60 * 1000,
    enabled: txQuery.data?.data?.wallet_type === "CARD"
  });

  const tx = txQuery.data?.data;

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

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">상세내역</h1>
        </div>

        {/* 로딩 */}
        {txQuery.isLoading && (
          <div className={`${cardClass} divide-y divide-[var(--color-border-secondary)]`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="h-4 w-16 rounded-lg bg-[var(--color-bg-secondary)]" />
                <div className="h-4 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
              </div>
            ))}
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
              onClick={() => txQuery.refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {/* 내역 */}
        {tx && (
          <div className={`${cardClass} divide-y divide-[var(--color-border-secondary)]`}>
            <Row
              label="거래 유형"
              value={tx.transaction_type === "INCOME" ? "수입" : "지출"}
            />
            <Row
              label="금액"
              value={formatAmount(tx.amount, tx.transaction_type)}
              valueClass={
                tx.transaction_type === "INCOME"
                  ? "text-[var(--color-success,#22c55e)]"
                  : undefined
              }
            />
            <Row label="날짜" value={tx.transaction_date} />
            <Row
              label="카테고리"
              value={tx.category_name}
              icon={renderIcon(iconMap, categoryIconId)}
            />
            <Row
              label="지갑"
              value={`${tx.wallet_name} (${tx.wallet_type === "ACCOUNT" ? "계좌" : "카드"})`}
              icon={renderIcon(iconMap, walletIconId)}
            />
            {tx.memo && <Row label="메모" value={tx.memo} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDetailPage;
