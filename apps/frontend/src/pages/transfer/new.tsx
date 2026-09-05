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

  // returnTo가 있으면 지갑 거래내역 화면에서 push 한 번으로 들어온 것이므로 그 한 단계를 그대로
  // 되돌린다(navigate(-1)). 예전처럼 replace로 지갑 경로를 다시 열면 [지갑, 지갑'] 처럼 히스토리가
  // 등록 1건마다 한 칸씩 늘어나서, 등록을 N번 반복하면 이전 화면으로 나가는 데 뒤로가기를 N번
  // 눌러야 했다(#353). pop은 순증가가 0이라 몇 번을 반복해도 뒤로가기 한 번이면 벗어난다.
  // 지갑 화면 데이터는 TransferForm의 invalidateTransactionRelatedQueries가 이미 갱신한다.
  // returnTo가 없는 경우(하단 네비게이션의 계좌이동 등 지갑 맥락 없이 진입)는 되돌아갈 지갑
  // 화면 자체가 없으므로 기존처럼 거래내역 목록으로 교체 이동한다.
  function handleSuccess() {
    if (returnTo) {
      navigate(-1);
      return;
    }
    navigate("/transactions", { replace: true });
  }

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
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferNewPage;
