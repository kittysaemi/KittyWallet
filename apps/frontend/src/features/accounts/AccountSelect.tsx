import React from "react";
import { useQuery } from "@tanstack/react-query";
import { accountApi } from "../../entities/account/api/accountApi";
import type { AccountItem } from "../../entities/account/model/account.types";
import { Button } from "../../shared/ui/Button";

interface AccountSelectProps {
  selectedAccountId?: number;
  onSelect: (account: AccountItem) => void;
}

const AccountSelectSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2" aria-label="계좌 목록을 불러오는 중입니다.">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-12 rounded-xl bg-[var(--color-bg-secondary)]" aria-hidden="true" />
    ))}
  </div>
);

export const AccountSelect: React.FC<AccountSelectProps> = ({ selectedAccountId, onSelect }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["accounts", "active"],
    queryFn: () => accountApi.getAccounts({ include_balance: true })
  });

  if (isLoading) return <AccountSelectSkeleton />;

  if (isError || !data?.success || !data.data) {
    return (
      <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          계좌 목록을 불러오지 못했습니다.
        </p>
        <Button type="button" variant="secondary" className="mt-2" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const accounts = data.data.items;

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
        사용 가능한 계좌가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="계좌 선택">
      {accounts.map((account) => {
        const selected = account.account_id === selectedAccountId;
        return (
          <button
            key={account.account_id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(account)}
            className={`flex min-h-11 items-center justify-between rounded-xl border px-4 py-2 text-left transition ${
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            <span className="font-medium text-[var(--color-text-primary)]">
              {account.account_name}
            </span>
            {account.current_balance !== null && (
              <span className="text-sm text-[var(--color-text-secondary)]">
                {account.current_balance.toLocaleString()}원
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
