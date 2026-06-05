import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart2, Home, Plus, Search, Settings2 } from "lucide-react";

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();

  const isHome = pathname === "/dashboard";
  const isSearch = pathname === "/transactions/search";
  const isStats = pathname.startsWith("/statistics");
  const isManage = ["/manage", "/accounts", "/cards", "/categories", "/icons"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const activeText = "text-[var(--color-primary)]";
  const inactiveText = "text-[var(--color-text-secondary)]";

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

        <Link
          to="/transactions/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-[0_4px_20px_var(--color-card-shadow)] transition active:scale-95"
          aria-label="거래 등록"
        >
          <Plus size={24} strokeWidth={3} className="text-[var(--color-text-primary)]" />
        </Link>

        <Link to="/statistics" className="flex flex-col items-center gap-1 py-3 px-4">
          <BarChart2 size={20} className={isStats ? activeText : inactiveText} />
          <span className={`text-[10px] font-medium ${isStats ? activeText : inactiveText}`}>통계</span>
        </Link>

        <Link to="/manage" className="flex flex-col items-center gap-1 py-3 px-4">
          <Settings2 size={20} className={isManage ? activeText : inactiveText} />
          <span className={`text-[10px] font-medium ${isManage ? activeText : inactiveText}`}>관리</span>
        </Link>
      </div>
    </div>
  );
};
