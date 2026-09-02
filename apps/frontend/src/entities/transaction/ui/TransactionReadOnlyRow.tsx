import React from "react";
import { useNavigate } from "react-router-dom";
import type { TransactionItem } from "../model/transaction.types";
import type { IconItem } from "../../icon/model/icon.types";
import { IconRenderer } from "../../../shared/ui/IconRenderer";
import { isTransferTransaction } from "../lib/isTransfer";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]})`;
}

export interface TransactionReadOnlyRowProps {
  tx: TransactionItem;
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
  showWallet?: boolean;
  linkTo?: (transactionId: number) => string;
  state?: Record<string, unknown>;
}

export const TransactionReadOnlyRow: React.FC<TransactionReadOnlyRowProps> = ({
  tx,
  iconMap,
  categoryIconMap,
  showWallet = true,
  linkTo = (transactionId) => `/transactions/${transactionId}`,
  state,
}) => {
  const navigate = useNavigate();
  const isIncome = tx.transaction_type === "INCOME";
  const isTransfer = isTransferTransaction(tx);
  const iconId = categoryIconMap.get(tx.category_id);
  const icon = iconId ? iconMap.get(iconId) : undefined;
  const target = linkTo(tx.transaction_id);
  const go = () => (state ? navigate(target, { state }) : navigate(target));

  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-1 py-3 rounded-xl transition hover:bg-[var(--color-bg-secondary)]"
      onClick={go}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && go()}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)]">
        {icon ? (
          <IconRenderer
            providerType={icon.provider_type}
            providerKey={icon.provider_key}
            size={18}
            className="text-[var(--color-text-secondary)]"
          />
        ) : (
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
            {tx.category_name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-sm font-medium text-[var(--color-text-primary)]">
          <span className="truncate">{tx.category_name}</span>
          {isTransfer && (
            <span className="shrink-0 inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              계좌이동
            </span>
          )}
          {tx.memo && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="truncate text-[var(--color-text-secondary)]">{tx.memo}</span>
            </>
          )}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-[var(--color-text-secondary)]">
          <span className="shrink-0">{formatDate(tx.transaction_date)}</span>
          {showWallet && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="truncate">{tx.wallet_name}</span>
              {tx.wallet_deleted && (
                <span className="shrink-0 inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-[var(--color-bg-secondary)] text-[var(--color-text-caption)]">
                  삭제된 지갑
                </span>
              )}
            </>
          )}
          {tx.installment_seq != null && tx.installment_total_count != null && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="shrink-0">
                {tx.installment_seq}/{tx.installment_total_count}회차
              </span>
            </>
          )}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold ${
          isTransfer
            ? "text-[var(--color-text-secondary)]"
            : isIncome
              ? "text-[var(--color-income)]"
              : "text-[var(--color-danger)]"
        }`}
      >
        {isIncome ? "+" : "-"}{fmt(tx.amount + (tx.interest ?? 0))}원
      </p>
    </div>
  );
};
