import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  LayoutList,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Wallet,
  WifiOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { dashboardApi } from "../../entities/dashboard/api/dashboardApi";
import type { DashboardTransaction } from "../../entities/dashboard/model/dashboard.types";
import { useAuthStore } from "../../entities/auth/store/authStore";
import { authApi } from "../../entities/auth/api/authApi";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${fmt(n)}원` : `-${fmt(Math.abs(n))}원`;
}

// ─── Skeleton ────────────────────────────────────────────────
const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 2 }) => (
  <div className={`${cardClass} p-5`}>
    <div className="mb-3 h-4 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="mb-2 h-5 w-full rounded-lg bg-[var(--color-bg-secondary)]" />
    ))}
  </div>
);

// ─── 최근 거래 항목 ──────────────────────────────────────────
const TxRow: React.FC<{ tx: DashboardTransaction }> = ({ tx }) => {
  const navigate = useNavigate();
  const isIncome = tx.transaction_type === "INCOME";
  return (
    <div
      className="flex cursor-pointer items-center gap-3 py-3 transition hover:bg-[var(--color-bg-secondary)] px-1 rounded-xl"
      onClick={() => navigate(`/transactions/${tx.transaction_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/transactions/${tx.transaction_id}`)}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-sm font-semibold text-[var(--color-text-secondary)]">
        {tx.category_name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {tx.category_name}
        </p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{tx.wallet_name}</p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold ${
          isIncome ? "text-[var(--color-success,#22c55e)]" : "text-[var(--color-text-primary)]"
        }`}
      >
        {isIncome ? "+" : "-"}
        {fmt(tx.amount)}원
      </p>
    </div>
  );
};

// ─── 메뉴 버튼 ───────────────────────────────────────────────
interface MenuBtnProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}
const MenuBtn: React.FC<MenuBtnProps> = ({ to, icon, label }) => (
  <Link
    to={to}
    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-4 text-center transition hover:bg-[var(--color-primary-soft)]"
  >
    <span className="text-[var(--color-text-primary)]">{icon}</span>
    <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
  </Link>
);

// ─── 메인 페이지 ─────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isOffline = !navigator.onLine;

  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.getDashboard({ recent_limit: 5, summary_period: "MONTH" }),
    staleTime: 60 * 1000,
    retry: isOffline ? false : 2
  });

  const data = query.data?.data;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuth();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-12 pt-6">

        {/* 오프라인 배너 */}
        {isOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 캐시된 데이터를 표시합니다.</span>
          </div>
        )}

        {/* ── 사용자 카드 ── */}
        {query.isLoading ? (
          <SkeletonCard rows={1} />
        ) : (
          <div className={`${cardClass} mb-4 flex items-center justify-between px-5 py-4`}>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">안녕하세요</p>
              <p className="mt-0.5 text-lg font-bold text-[var(--color-text-primary)]">
                {data?.user.nickname ?? "—"}님
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border-primary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        )}

        {/* 에러 */}
        {query.isError && !data && (
          <div
            className={`${cardClass} mb-4 flex flex-col items-center gap-3 px-6 py-10 text-center`}
            role="alert"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">
              대시보드를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {/* ── 자산 요약 ── */}
        {query.isLoading ? (
          <SkeletonCard rows={2} />
        ) : data ? (
          <div className={`${cardClass} mb-4 px-5 py-4`}>
            <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">전체 자산</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {fmt(data.asset_summary.total_asset_amount)}원
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              계좌 {data.asset_summary.active_account_count}/{data.asset_summary.account_count}개
              {data.asset_summary.card_count > 0 &&
                ` · 카드 ${data.asset_summary.active_card_count}/${data.asset_summary.card_count}개`}
            </p>
          </div>
        ) : null}

        {/* ── 소비 요약 ── */}
        {query.isLoading ? (
          <SkeletonCard rows={3} />
        ) : data ? (
          <div className={`${cardClass} mb-4 px-5 py-4`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {data.spending_summary.period_type === "MONTH"
                  ? "이번 달"
                  : data.spending_summary.period_type === "WEEK"
                  ? "이번 주"
                  : "오늘"}{" "}
                소비 요약
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                거래 {data.spending_summary.transaction_count}건
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">수입</span>
                <span className="text-sm font-semibold text-[var(--color-success,#22c55e)]">
                  +{fmt(data.spending_summary.income_amount)}원
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">지출</span>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  -{fmt(data.spending_summary.expense_amount)}원
                </span>
              </div>
              <div className="border-t border-[var(--color-border-secondary)] pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">순</span>
                <span
                  className={`text-sm font-bold ${
                    data.spending_summary.net_amount >= 0
                      ? "text-[var(--color-success,#22c55e)]"
                      : "text-[var(--color-danger)]"
                  }`}
                >
                  {fmtSigned(data.spending_summary.net_amount)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── 최근 거래 ── */}
        {query.isLoading ? (
          <SkeletonCard rows={4} />
        ) : data ? (
          <div className={`${cardClass} mb-4 px-5 py-4`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">최근 거래</p>
              <Link
                to="/transactions"
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                전체 보기 →
              </Link>
            </div>
            {data.recent_transactions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">최근 거래가 없습니다.</p>
                <Link
                  to="/transactions/new"
                  className="mt-3 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
                >
                  첫 거래 등록하기
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border-secondary)]">
                {data.recent_transactions.map((tx) => (
                  <TxRow key={tx.transaction_id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── 메뉴 ── */}
        <div className="grid grid-cols-5 gap-2">
          <MenuBtn to="/transactions" icon={<LayoutList size={20} />} label="거래내역" />
          <MenuBtn to="/transactions/new" icon={<Plus size={20} />} label="거래등록" />
          <MenuBtn to="/accounts" icon={<Wallet size={20} />} label="계좌" />
          <MenuBtn to="/cards" icon={<CreditCard size={20} />} label="카드" />
          <MenuBtn to="/categories" icon={<Tag size={20} />} label="카테고리" />
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
