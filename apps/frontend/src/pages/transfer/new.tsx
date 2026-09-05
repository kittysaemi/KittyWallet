import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TransferForm } from "../../features/transactions/TransferForm";

const TransferNewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const lockedFromAccountIdParam = searchParams.get("fromAccountId");
  const lockedFromAccountId = lockedFromAccountIdParam ? Number(lockedFromAccountIdParam) : undefined;
  // 지갑별 거래내역 화면에서 진입한 경우, 등록 완료 후 일반 거래내역이 아니라 원래 있던 지갑
  // 화면(기간/스크롤 상태 포함)으로 돌아가야 한다(#353). 상세/수정화면 복귀에 쓰는 것과 같은
  // returnTo state 패턴(edit.tsx, detail.tsx 참고)을 그대로 따른다.
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

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
            onSuccess={() => navigate(returnTo ?? "/transactions", { replace: true })}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferNewPage;
