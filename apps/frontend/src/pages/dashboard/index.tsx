import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  PawPrint,
  RefreshCw,
  Settings,
  WifiOff
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { dashboardApi } from "../../entities/dashboard/api/dashboardApi";
import type { DashboardTransaction } from "../../entities/dashboard/model/dashboard.types";
import { useAuthStore } from "../../entities/auth/store/authStore";
import { authApi } from "../../entities/auth/api/authApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]})`;
}

// ─── Skeleton ────────────────────────────────────────────────
const SkeletonCard: React.FC<{ rows?: number; tall?: boolean }> = ({ rows = 2, tall }) => (
  <div className={`${cardClass} p-5 ${tall ? "h-28" : ""}`}>
    <div className="mb-3 h-3 w-20 rounded-lg bg-[var(--color-bg-secondary)]" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="mb-2 h-5 w-full rounded-lg bg-[var(--color-bg-secondary)]" />
    ))}
  </div>
);

// ─── 최근 거래 항목 ──────────────────────────────────────────
interface TxRowProps {
  tx: DashboardTransaction;
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
}
const TxRow: React.FC<TxRowProps> = ({ tx, iconMap, categoryIconMap }) => {
  const navigate = useNavigate();
  const isIncome = tx.transaction_type === "INCOME";
  const iconId = categoryIconMap.get(tx.category_id);
  const icon = iconId ? iconMap.get(iconId) : undefined;
  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-1 py-3 rounded-xl transition hover:bg-[var(--color-bg-secondary)]"
      onClick={() => navigate(`/transactions/${tx.transaction_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/transactions/${tx.transaction_id}`)}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)]">
        {icon ? (
          <IconRenderer providerType={icon.provider_type} providerKey={icon.provider_key} size={18} className="text-[var(--color-text-secondary)]" />
        ) : (
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{tx.category_name.slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {tx.category_name}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-[var(--color-text-secondary)]">
          <span className="shrink-0">{formatDate(tx.transaction_date)}</span>
          <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
          <span className="truncate">{tx.wallet_name}</span>
          {tx.wallet_deleted && (
            <span className="shrink-0 inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-[var(--color-bg-secondary)] text-[var(--color-text-caption)]">
              삭제된 지갑
            </span>
          )}
        </p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${isIncome ? "text-blue-500" : "text-red-500"}`}>
        {isIncome ? "+" : "-"}{fmt(tx.amount)}원
      </p>
    </div>
  );
};

// ─── 요약 섹션 카드 ──────────────────────────────────────────
interface SumCardProps {
  label: string;
  amount: number;
  sign?: "+" | "-";
  labelColor: string;
  amountColor: string;
}
const SumCard: React.FC<SumCardProps> = ({ label, amount, sign = "+", labelColor, amountColor }) => (
  <div className={`${cardClass} flex flex-col gap-1.5 px-4 py-4`}>
    <p className={`text-xs font-medium ${labelColor}`}>{label}</p>
    <p className={`text-base font-bold ${amountColor}`}>
      {sign}{fmt(amount)}원
    </p>
  </div>
);

// ─── 메인 페이지 ─────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isOffline = !navigator.onLine;

  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.getDashboard({ recent_limit: 5, summary_period: "MONTH" }),
    staleTime: 60 * 1000,
    retry: isOffline ? false : 2
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: 5 * 60 * 1000
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 10 * 60 * 1000
  });

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const categoryIconMap = React.useMemo(() => {
    const map = new Map<number, number>();
    categoriesQuery.data?.data?.items.forEach((cat) => map.set(cat.category_id, cat.icon_id));
    return map;
  }, [categoriesQuery.data]);

  const data = query.data?.data;

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
  }

  const accountExpense =
    (data?.spending_summary.expense_amount ?? 0) -
    (data?.spending_summary.card_expense_amount ?? 0);

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">

        {/* 오프라인 배너 */}
        {isOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 캐시된 데이터를 표시합니다.</span>
          </div>
        )}

        {/* ── 사용자 카드 ── */}
        {query.isLoading ? (
          <div className="mb-4"><SkeletonCard rows={1} /></div>
        ) : (
          <div className={`${cardClass} mb-4 flex items-center justify-between px-5 py-4`}>
            <button
              type="button"
              aria-label="사용자 설정으로 이동"
              onClick={() => navigate("/settings")}
              className="flex flex-col text-left transition hover:opacity-70 active:opacity-50"
            >
              <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-brand)" }}>안녕하세요</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-[var(--color-text-primary)]" style={{ fontFamily: "var(--font-brand)" }}>
                {data?.user.nickname ?? "—"}님
                <PawPrint size={20} className="text-[var(--color-primary)]" strokeWidth={1.8} />
              </p>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="설정"
                onClick={() => navigate("/settings/app")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
              >
                <Settings size={15} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="로그아웃"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}

        {/* 에러 */}
        {query.isError && !data && (
          <div className={`${cardClass} mb-4 flex flex-col items-center gap-3 px-6 py-10 text-center`} role="alert">
            <p className="text-sm text-[var(--color-text-secondary)]">대시보드를 불러오지 못했습니다.</p>
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

        {/* ── 전체 자산 카드 ── */}
        {query.isLoading ? (
          <div className="mb-4"><SkeletonCard rows={1} tall /></div>
        ) : data ? (
          <div
            className="mb-4 rounded-2xl px-5 py-5 shadow-[0_4px_20px_rgba(253,165,227,0.35)]"
            style={{
              background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)"
            }}
          >
            <p className="mb-1 text-xs font-medium text-white/80">전체 자산</p>
            <p className="text-3xl font-bold text-white">
              {fmt(data.asset_summary.total_asset_amount)}원
            </p>
          </div>
        ) : null}

        {/* ── 이번달 수입 / 지출 / 카드지출 ── */}
        {query.isLoading ? (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} rows={1} />)}
          </div>
        ) : data ? (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SumCard
              label="이번달수입"
              amount={data.spending_summary.income_amount}
              sign="+"
              labelColor="text-blue-500"
              amountColor="text-blue-600"
            />
            <SumCard
              label="이번달지출"
              amount={accountExpense}
              sign="-"
              labelColor="text-orange-500"
              amountColor="text-orange-600"
            />
            <SumCard
              label="카드지출"
              amount={data.spending_summary.card_expense_amount}
              sign="-"
              labelColor="text-purple-500"
              amountColor="text-purple-600"
            />
          </div>
        ) : null}

        {/* ── 최근 거래 ── */}
        {query.isLoading ? (
          <div className="mb-4"><SkeletonCard rows={4} /></div>
        ) : data ? (
          <div className={`${cardClass} mb-4 px-5 py-4`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">최근 내역</p>
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
                  <TxRow key={tx.transaction_id} tx={tx} iconMap={iconMap} categoryIconMap={categoryIconMap} />
                ))}
              </div>
            )}
          </div>
        ) : null}

      </div>

    </div>
  );
};

export default DashboardPage;
