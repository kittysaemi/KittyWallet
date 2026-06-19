import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { TransactionReadOnlyRow } from "../../entities/transaction/ui/TransactionReadOnlyRow";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone, getWeekRange, formatWeekLabel } from "../../shared/utils/date";

type PeriodType = "year" | "month" | "week";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

interface WalletTransactionsPageProps {
  walletType: "ACCOUNT" | "CARD";
}

const WalletTransactionsPage: React.FC<WalletTransactionsPageProps> = ({ walletType }) => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const todayStr = getTodayInTimezone(timezone);
  const isOffline = !navigator.onLine;

  const today = React.useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayStr]);

  const [periodType, setPeriodType] = React.useState<PeriodType>("month");
  const [baseDate, setBaseDate] = React.useState(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  const weekRange = getWeekRange(baseDate);

  function getDateRange(): { start: string; end: string } {
    if (periodType === "year") {
      const y = baseDate.getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    if (periodType === "month") {
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${y}-${String(m).padStart(2, "0")}-01`,
        end: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      };
    }
    return weekRange;
  }

  function getPeriodLabel(): string {
    if (periodType === "year") return `${baseDate.getFullYear()}년`;
    if (periodType === "month") return `${baseDate.getFullYear()}년 ${baseDate.getMonth() + 1}월`;
    return formatWeekLabel(weekRange, today.getFullYear());
  }

  const { start, end } = getDateRange();
  const periodLabel = getPeriodLabel();

  const accountQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts(),
    staleTime: 60_000,
    retry: isOffline ? false : 2,
    enabled: walletType === "ACCOUNT",
  });
  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: 60_000,
    retry: isOffline ? false : 2,
    enabled: walletType === "CARD",
  });

  const walletName =
    walletType === "ACCOUNT"
      ? accountQuery.data?.data?.items.find((a) => a.account_id === Number(walletId))?.account_name
      : cardsQuery.data?.data?.items.find((c) => c.card_id === Number(walletId))?.card_name;

  const accountBalance =
    walletType === "ACCOUNT"
      ? (accountQuery.data?.data?.items.find((a) => a.account_id === Number(walletId))?.current_balance ?? null)
      : null;

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: 5 * 60 * 1000,
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 10 * 60 * 1000,
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

  const txQuery = useInfiniteQuery({
    queryKey: ["wallet-tx", walletType, walletId, start, end],
    queryFn: ({ pageParam }) =>
      transactionApi.getTransactions({
        wallet_type: walletType,
        wallet_id: Number(walletId),
        start_date: start,
        end_date: end,
        page: pageParam as number,
        limit: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + (p.data?.items.length ?? 0), 0);
      const total = lastPage.data?.total_count ?? 0;
      return loaded < total ? allPages.length + 1 : undefined;
    },
    staleTime: 30_000,
    retry: isOffline ? false : 2,
  });

  const items = txQuery.data?.pages.flatMap((p) => p.data?.items ?? []) ?? [];
  const periodExpense = txQuery.data?.pages[0]?.data?.period_summary?.total_expense ?? 0;

  function movePeriod(dir: -1 | 1) {
    setBaseDate((cur) => {
      const next = new Date(cur);
      if (periodType === "week") {
        next.setDate(cur.getDate() + dir * 7);
      } else if (periodType === "month") {
        next.setMonth(cur.getMonth() + dir);
      } else {
        next.setFullYear(cur.getFullYear() + dir);
      }
      return next;
    });
  }

  function changePeriodType(type: PeriodType) {
    const [y, m, d] = todayStr.split("-").map(Number);
    setBaseDate(new Date(y, m - 1, d));
    setPeriodType(type);
  }

  // 통계 페이지와 동일: 현재 기간이면 미래 이동 방지
  const isCurrentPeriod = (() => {
    if (periodType === "week") return weekRange.start === getWeekRange(today).start;
    if (periodType === "month") return baseDate.getFullYear() === today.getFullYear() && baseDate.getMonth() === today.getMonth();
    return baseDate.getFullYear() === today.getFullYear();
  })();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto w-full max-w-[480px] px-4 pb-8 pt-6">
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">지갑 거래내역</h1>
        </div>
        <div className="flex flex-col gap-4">
        {isOffline && (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 캐시된 데이터를 표시합니다.</span>
          </div>
        )}

        {walletName && (
          <div className={`${cardClass} flex items-center justify-between px-5 py-4`}>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{walletName}</p>
            {walletType === "ACCOUNT" ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                현재잔액 : <span className={`font-semibold ${accountBalance !== null && accountBalance < 0 ? "text-red-500" : "text-blue-500"}`}>{accountBalance !== null ? `${fmt(accountBalance)}원` : "—"}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-500">{fmt(periodExpense)}원</p>
            )}
          </div>
        )}

        <div className={`${cardClass} flex gap-1 p-1`}>
          {(["year", "month", "week"] as PeriodType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => changePeriodType(type)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                periodType === type
                  ? "bg-[var(--color-primary)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              {type === "year" ? "년" : type === "month" ? "월" : "주"}
            </button>
          ))}
        </div>

        <div className={`${cardClass} flex items-center justify-between px-4 py-3`}>
          <button
            type="button"
            onClick={() => movePeriod(-1)}
            aria-label="이전 기간"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)]">{periodLabel}</span>
          <button
            type="button"
            onClick={() => movePeriod(1)}
            disabled={isCurrentPeriod}
            aria-label="다음 기간"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {txQuery.isLoading && (
          <div className="flex flex-col gap-2" aria-label="거래 내역을 불러오는 중입니다.">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${cardClass} flex items-center gap-3 p-4`} aria-hidden="true">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--color-bg-secondary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded-lg bg-[var(--color-bg-secondary)]" />
                  <div className="h-3 w-1/3 rounded-lg bg-[var(--color-bg-secondary)]" />
                </div>
                <div className="h-4 w-16 rounded-lg bg-[var(--color-bg-secondary)]" />
              </div>
            ))}
          </div>
        )}

        {txQuery.isError && (
          <div className={`${cardClass} flex flex-col items-center gap-3 px-6 py-10 text-center`} role="alert">
            <p className="text-sm text-[var(--color-text-secondary)]">거래 내역을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => txQuery.refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {!txQuery.isLoading && !txQuery.isError && items.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
            <p className="text-base font-medium text-[var(--color-text-primary)]">거래 내역이 없습니다</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {walletType === "ACCOUNT"
                ? "선택한 기간에 해당 계좌의 거래가 없어요."
                : "선택한 기간에 해당 카드의 거래가 없어요."}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className={`${cardClass} px-5 py-4`}>
            <div className="divide-y divide-[var(--color-border-secondary)]">
              {items.map((tx) => (
                <TransactionReadOnlyRow
                  key={tx.transaction_id}
                  tx={tx}
                  iconMap={iconMap}
                  categoryIconMap={categoryIconMap}
                  showWallet={false}
                />
              ))}
            </div>

            {txQuery.hasNextPage && (
              <button
                type="button"
                onClick={() => txQuery.fetchNextPage()}
                disabled={txQuery.isFetchingNextPage}
                className="mt-4 w-full rounded-xl border border-[var(--color-border-primary)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
              >
                {txQuery.isFetchingNextPage ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    불러오는 중...
                  </span>
                ) : (
                  "더보기"
                )}
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default WalletTransactionsPage;
