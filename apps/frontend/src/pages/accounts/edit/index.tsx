import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { accountApi } from "../../../entities/account/api/accountApi";
import { AccountForm } from "../../../features/accounts/AccountForm";
import { Button } from "../../../shared/ui/Button";

const AccountEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountId = Number(id);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts()
  });

  const account = accountsQuery.data?.data?.items.find((a) => a.account_id === accountId);

  if (accountsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-[var(--color-text-secondary)]">불러오는 중...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] px-4">
        <p className="text-[var(--color-text-secondary)]">계좌를 찾을 수 없습니다.</p>
        <Button type="button" variant="secondary" onClick={() => navigate("/accounts")}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/accounts")}>
            ←
          </Button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">계좌 수정</h1>
        </header>
        <AccountForm mode="edit" account={account} />
      </div>
    </div>
  );
};

export default AccountEditPage;
