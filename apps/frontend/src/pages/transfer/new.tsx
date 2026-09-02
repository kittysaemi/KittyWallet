import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TransferForm } from "../../features/transactions/TransferForm";

const TransferNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lockedFromAccountIdParam = searchParams.get("fromAccountId");
  const lockedFromAccountId = lockedFromAccountIdParam ? Number(lockedFromAccountIdParam) : undefined;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-gamja text-2xl">계좌이동</h1>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-primary)] p-5">
          <TransferForm
            lockedFromAccountId={lockedFromAccountId}
            onSuccess={() => navigate("/transactions")}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferNewPage;
