import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart2, Camera, FileImage, Home, PenLine, Plus, Search, Settings2, X } from "lucide-react";

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isEntrySheetOpen, setIsEntrySheetOpen] = React.useState(false);

  const isHome = pathname === "/dashboard";
  const isSearch = pathname === "/transactions/search";
  const isStats = pathname.startsWith("/statistics");
  const isManage = ["/manage", "/accounts", "/cards", "/categories", "/icons"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const activeText = "text-[var(--color-primary)]";
  const inactiveText = "text-[var(--color-text-secondary)]";
  const startTransaction = (source?: "camera" | "gallery") => {
    setIsEntrySheetOpen(false);
    navigate(source ? `/transactions/new?receiptSource=${source}` : "/transactions/new");
  };

  return (
    <div className="shrink-0 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-card)]">
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 py-3 px-4">
          <Home size={20} className={isHome ? activeText : inactiveText} strokeWidth={isHome ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${isHome ? activeText : inactiveText}`}>홈</span>
        </Link>

        <Link to="/transactions/search" className="flex flex-col items-center gap-1 py-3 px-4">
          <Search size={20} className={isSearch ? activeText : inactiveText} />
          <span className={`text-[10px] font-medium ${isSearch ? activeText : inactiveText}`}>검색</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsEntrySheetOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-[0_4px_20px_var(--color-card-shadow)] transition active:scale-95"
          aria-label="거래 등록 방식 선택"
        >
          <Plus size={24} strokeWidth={3} className="text-[var(--color-text-primary)]" />
        </button>

        <Link to="/statistics" className="flex flex-col items-center gap-1 py-3 px-4">
          <BarChart2 size={20} className={isStats ? activeText : inactiveText} />
          <span className={`text-[10px] font-medium ${isStats ? activeText : inactiveText}`}>통계</span>
        </Link>

        <Link to="/manage" className="flex flex-col items-center gap-1 py-3 px-4">
          <Settings2 size={20} className={isManage ? activeText : inactiveText} />
          <span className={`text-[10px] font-medium ${isManage ? activeText : inactiveText}`}>관리</span>
        </Link>
      </div>
      {isEntrySheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/50 px-4 pb-safe sm:items-center sm:justify-center">
          <section role="dialog" aria-modal="true" aria-labelledby="transaction-entry-title" className="w-full max-w-[480px] rounded-t-3xl bg-[var(--color-bg-card)] p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="transaction-entry-title" className="font-gamja text-xl text-[var(--color-text-primary)]">거래 등록</h2>
              <button type="button" onClick={() => setIsEntrySheetOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]" aria-label="닫기"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <button type="button" onClick={() => startTransaction()} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--color-border-primary)] px-4 text-left hover:bg-[var(--color-bg-secondary)]"><PenLine size={20} className="text-[var(--color-primary)]" /><span className="text-sm font-semibold text-[var(--color-text-primary)]">직접 입력</span></button>
              <button type="button" onClick={() => startTransaction("camera")} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--color-border-primary)] px-4 text-left hover:bg-[var(--color-bg-secondary)]"><Camera size={20} className="text-[var(--color-primary)]" /><span className="text-sm font-semibold text-[var(--color-text-primary)]">카메라로 영수증 촬영</span></button>
              <button type="button" onClick={() => startTransaction("gallery")} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--color-border-primary)] px-4 text-left hover:bg-[var(--color-bg-secondary)]"><FileImage size={20} className="text-[var(--color-primary)]" /><span className="text-sm font-semibold text-[var(--color-text-primary)]">사진첩에서 영수증 선택</span></button>
            </div>
            <button type="button" onClick={() => setIsEntrySheetOpen(false)} className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">취소</button>
          </section>
        </div>
      )}
    </div>
  );
};
