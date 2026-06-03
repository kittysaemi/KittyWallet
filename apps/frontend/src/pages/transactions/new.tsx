import React from "react";
import { useNavigate } from "react-router-dom";
import { TransactionForm } from "../../features/transactions/TransactionForm";

const TransactionNewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ← 뒤로
          </button>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">거래 등록</h1>
          <div className="w-10" />
        </div>

        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)]">
          <TransactionForm onSuccess={() => navigate("/transactions")} />
        </div>
      </div>
    </div>
  );
};

export default TransactionNewPage;
