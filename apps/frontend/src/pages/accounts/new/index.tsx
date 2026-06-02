import React from "react";
import { useNavigate } from "react-router-dom";
import { AccountForm } from "../../../features/accounts/AccountForm";
import { Button } from "../../../shared/ui/Button";

const AccountNewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/accounts")}>
            ←
          </Button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">계좌 등록</h1>
        </header>
        <AccountForm mode="create" />
      </div>
    </div>
  );
};

export default AccountNewPage;
