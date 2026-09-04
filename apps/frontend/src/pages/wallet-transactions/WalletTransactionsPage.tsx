import React from "react";
import { STALE_TIME, GC_TIME, RETRY, QUERY_LIMIT } from "../../shared/constants/queryConfig";
import { useParams, useNavigate, useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Loader2, PenLine, Plus, RefreshCw, WifiOff } from "lucide-react";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { TransactionReadOnlyRow } from "../../entities/transaction/ui/TransactionReadOnlyRow";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone, getWeekRange, formatWeekLabel, toDateValue } from "../../shared/utils/date";

type PeriodType = "year" | "month" | "week";

function isPeriodType(v: string | null): v is PeriodType {
  return v === "year" || v === "month" || v === "week";
}

// 상세화면으로 이동했다가 뒤로(Back) 돌아왔을 때, 선택하던 시점의 스크롤 위치와 추가로
// 로드했던 페이지 수를 복원하기 위한 모듈 스코프 저장소. 지갑(계좌/카드)마다 별도로 관리해야
// 하므로 walletType:walletId를 key로 사용한다. TransactionsPage의 `_savedTxState` 패턴을
// window scroll 기반으로 옮긴 것이다.
// 기간(periodType/baseDate)은 새로고침(F5)에도 살아남아야 하므로 URL 쿼리 파라미터(period, date)로
// 옮겼다 — 이 모듈 메모리는 브라우저 새로고침 시 사라지므로 기간 값을 여기 두면 새로고침 시
// "이번 달"로 초기화되는 문제가 그대로 남는다.
interface SavedWalletTxState {
  key: string;
  scrollY: number;
  pageCount: number;
}
let _savedWalletTxState: SavedWalletTxState | null = null;

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
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const timezone = useTimezone();
  const todayStr = getTodayInTimezone(timezone);
  const isOffline = !navigator.onLine;
  const [isEntryExpanded, setIsEntryExpanded] = React.useState(false);

  // 상세화면에서 Back(브라우저 뒤로가기 포함)으로 돌아온 경우(POP)에만 스크롤/추가 로드
  // 페이지 수를 복원한다. 다른 화면에서 새로 진입한 경우(PUSH)는 항상 최상단에서 시작한다.
  // 기간(periodType/baseDate)은 URL 쿼리 파라미터에서 직접 읽으므로 여기서 다루지 않는다 —
  // POP으로 돌아왔을 때는 이전에 기록해둔 URL(기간 변경 시 replace로 갱신됨)이 그대로 복원되고,
  // 새로고침 시에도 브라우저가 같은 URL을 다시 요청하므로 자연히 유지된다.
  const stateKey = `${walletType}:${walletId}`;
  const [pendingRestore] = React.useState<SavedWalletTxState | null>(() =>
    navigationType === "POP" && _savedWalletTxState?.key === stateKey ? _savedWalletTxState : null
  );

  function handleAddClick() {
    if (walletType === "CARD") {
      navigate(`/transactions/new?walletType=CARD&walletId=${walletId}`);
      return;
    }
    setIsEntryExpanded((v) => !v);
  }

  const today = React.useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayStr]);

  // 새로 진입한 경우(PUSH)에는 항상 최상단에서 시작한다(브라우저의 자동 스크롤 복원 방지).
  // Back으로 돌아온 경우(pendingRestore)는 아래 스크롤 복원 effect가 데이터 로드 후 처리한다.
  React.useLayoutEffect(() => {
    if (!pendingRestore) window.scrollTo(0, 0);
  }, [pendingRestore]);

  const [periodType, setPeriodType] = React.useState<PeriodType>(() =>
    isPeriodType(searchParams.get("period")) ? (searchParams.get("period") as PeriodType) : "month"
  );
  const [baseDate, setBaseDate] = React.useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const [y, m, d] = todayStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  // 기간(periodType/baseDate)이 바뀔 때마다 URL 쿼리 파라미터에 반영한다(replace로 히스토리를
  // 늘리지 않음). 최초 마운트 시점에는 실행하지 않는다 — 새 지갑으로 처음 진입했을 때(기본값
  // "이번 달")는 URL을 그대로 깔끔하게 둔다.
  const periodMountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!periodMountedRef.current) {
      periodMountedRef.current = true;
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("period", periodType);
        next.set("date", toDateValue(baseDate));
        return next;
      },
      { replace: true }
    );
  }, [periodType, baseDate, setSearchParams]);

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
    staleTime: STALE_TIME.MINUTE,
    retry: isOffline ? false : RETRY.STANDARD,
    enabled: walletType === "ACCOUNT",
  });
  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: STALE_TIME.MINUTE,
    retry: isOffline ? false : RETRY.STANDARD,
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
    staleTime: STALE_TIME.MEDIUM,
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: STALE_TIME.LONG,
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
        limit: QUERY_LIMIT.PAGE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + (p.data?.items.length ?? 0), 0);
      const total = lastPage.data?.total_count ?? 0;
      return loaded < total ? allPages.length + 1 : undefined;
    },
    staleTime: STALE_TIME.SHORT,
    gcTime: GC_TIME.DEFAULT,
    retry: isOffline ? false : RETRY.AGGRESSIVE,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  const items = txQuery.data?.pages.flatMap((p) => p.data?.items ?? []) ?? [];
  const periodExpense = txQuery.data?.pages[0]?.data?.period_summary?.total_expense ?? 0;

  // Back으로 복원하는 경우: 저장된 스크롤 위치가 첫 페이지보다 더 아래(더보기로 추가 로드된
  // 페이지)에 있었을 수 있으므로, 해당 개수만큼 페이지를 먼저 채운 뒤에 스크롤을 복원한다.
  const restoreAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!pendingRestore || restoreAppliedRef.current) return;
    if (!txQuery.isSuccess) return;
    const loadedPages = txQuery.data?.pages.length ?? 0;
    if (loadedPages < pendingRestore.pageCount) {
      if (txQuery.hasNextPage && !txQuery.isFetchingNextPage) void txQuery.fetchNextPage();
      return;
    }
    restoreAppliedRef.current = true;
    window.scrollTo(0, pendingRestore.scrollY);
  }, [pendingRestore, txQuery.isSuccess, txQuery.data, txQuery.hasNextPage, txQuery.isFetchingNextPage]);

  // 현재 스크롤 위치와 로드된 페이지 수를 계속 저장해두어, 상세화면으로 이동했다가 Back으로
  // 돌아왔을 때 복원할 수 있도록 한다(선택 시점 기준). NavLayout 밖에서 렌더링되어 window
  // scroll을 사용한다. 기간(periodType/baseDate)은 URL 쿼리 파라미터가 대신하므로 여기서는
  // 다루지 않는다.
  React.useEffect(() => {
    const save = () => {
      _savedWalletTxState = {
        key: stateKey,
        scrollY: window.scrollY,
        pageCount: txQuery.data?.pages.length ?? 1,
      };
    };
    window.addEventListener("scroll", save, { passive: true });
    save();
    return () => window.removeEventListener("scroll", save);
  }, [stateKey, txQuery.data]);

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

  // 현재 기간 이상(현재 포함 미래)인지 여부
  const isCurrentOrFuturePeriod = (() => {
    if (periodType === "week") return weekRange.start >= getWeekRange(today).start;
    if (periodType === "month")
      return baseDate.getFullYear() > today.getFullYear() ||
        (baseDate.getFullYear() === today.getFullYear() && baseDate.getMonth() >= today.getMonth());
    return baseDate.getFullYear() >= today.getFullYear();
  })();

  // 월별 + 카드 지갑일 때, 다음 달에 할부 잔여 회차가 있으면 오른쪽 버튼 활성화
  const hasRemainingInstallments = React.useMemo(
    () =>
      periodType === "month" &&
      walletType === "CARD" &&
      items.some(
        (item) =>
          item.installment_seq != null &&
          item.installment_total_count != null &&
          item.installment_seq < item.installment_total_count
      ),
    [items, periodType, walletType]
  );

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
          <div className={cardClass}>
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{walletName}</p>
              {walletType === "ACCOUNT" ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  현재잔액 : <span className={`font-semibold ${accountBalance !== null && accountBalance < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-income)]"}`}>{accountBalance !== null ? `${fmt(accountBalance)}원` : "—"}</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-[var(--color-danger)]">{fmt(periodExpense)}원</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddClick}
              aria-expanded={walletType === "ACCOUNT" ? isEntryExpanded : undefined}
              aria-label={walletType === "ACCOUNT" ? "거래등록/계좌이동" : "거래등록"}
              className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--color-border-primary)] py-2.5 text-sm font-bold text-[var(--color-primary-hover)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              <Plus
                size={14}
                strokeWidth={3}
                className={`transition-transform ${isEntryExpanded ? "rotate-45" : ""}`}
              />
              추가
            </button>
            {walletType === "ACCOUNT" && isEntryExpanded && (
              <div className="flex divide-x divide-[var(--color-border-secondary)] border-t border-[var(--color-border-secondary)]">
                <button
                  type="button"
                  onClick={() => navigate(`/transactions/new?walletType=ACCOUNT&walletId=${walletId}`)}
                  className="flex flex-1 flex-col items-center gap-1.5 py-4 transition hover:bg-[var(--color-bg-secondary)]"
                >
                  <PenLine size={22} className="text-[var(--color-primary-hover)]" />
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">거래등록</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/transfer/new?fromAccountId=${walletId}`)}
                  className="flex flex-1 flex-col items-center gap-1.5 py-4 transition hover:bg-[var(--color-bg-secondary)]"
                >
                  <ArrowLeftRight size={22} className="text-[var(--color-primary-hover)]" />
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">계좌이동</span>
                </button>
              </div>
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
            disabled={isCurrentOrFuturePeriod && (!hasRemainingInstallments || txQuery.isFetching)}
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
                  state={{ editable: true, returnTo: `${location.pathname}${location.search}` }}
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
