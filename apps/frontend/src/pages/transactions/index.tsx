import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, RefreshCw, WifiOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";
import { STALE_TIME, RETRY, QUERY_LIMIT } from "../../shared/constants/queryConfig";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { getAllOfflineTransactions } from "../../pwa/indexed-db/repositories/offlineTransaction.repository";
import type { OfflineTransaction } from "../../pwa/types/indexedDb.types";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatAmount(amount: number, type: "INCOME" | "EXPENSE"): string {
  const formatted = amount.toLocaleString("ko-KR");
  return type === "INCOME" ? `+${formatted}원` : `-${formatted}원`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]})`;
}

function groupByDate(items: TransactionItem[]): Map<string, TransactionItem[]> {
  const map = new Map<string, TransactionItem[]>();
  for (const item of items) {
    if (!map.has(item.transaction_date)) map.set(item.transaction_date, []);
    map.get(item.transaction_date)!.push(item);
  }
  return map;
}


const TransactionSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="거래내역을 불러오는 중입니다.">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={`${cardClass} flex items-center gap-3 p-4`} aria-hidden="true">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--color-bg-secondary)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-3 w-1/3 rounded-lg bg-[var(--color-bg-secondary)]" />
        </div>
        <div className="h-4 w-16 rounded-lg bg-[var(--color-bg-secondary)]" />
      </div>
    ))}
  </div>
);

interface TransactionCardProps {
  item: TransactionItem;
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ item, iconMap, categoryIconMap }) => {
  const navigate = useNavigate();
  const iconId = categoryIconMap.get(item.category_id);
  const icon = iconId ? iconMap.get(iconId) : undefined;

  return (
    <div
      className={`${cardClass} flex cursor-pointer items-center gap-3 p-4 transition hover:bg-[var(--color-bg-secondary)]`}
      onClick={() => navigate(`/transactions/${item.transaction_id}/edit`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/transactions/${item.transaction_id}/edit`)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)]">
        {icon ? (
          <IconRenderer
            providerType={icon.provider_type}
            providerKey={icon.provider_key}
            size={20}
            className="text-[var(--color-text-primary)]"
          />
        ) : (
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {item.category_name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-sm font-medium text-[var(--color-text-primary)]">
          <span className="truncate">{item.category_name}</span>
          {item.memo && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="truncate text-[var(--color-text-secondary)]">{item.memo}</span>
            </>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <span className="truncate">{item.wallet_name}</span>
          {item.wallet_deleted && (
            <span className="shrink-0 inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-[var(--color-bg-secondary)] text-[var(--color-text-caption)]">
              삭제된 지갑
            </span>
          )}
          {item.installment_seq != null && item.installment_total_count != null && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="shrink-0">{item.installment_seq}/{item.installment_total_count}회차</span>
            </>
          )}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold ${
          item.transaction_type === "INCOME"
            ? "text-[var(--color-income)]"
            : "text-[var(--color-danger)]"
        }`}
      >
        {formatAmount(item.amount + (item.interest ?? 0), item.transaction_type)}
      </p>
    </div>
  );
};

interface PendingTransactionCardProps {
  tx: OfflineTransaction;
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
  categoryNameMap: Map<number, string>;
  accountNameMap: Map<number, string>;
  cardNameMap: Map<number, string>;
}

const PendingTransactionCard: React.FC<PendingTransactionCardProps> = ({
  tx, iconMap, categoryIconMap, categoryNameMap, accountNameMap, cardNameMap
}) => {
  const categoryName = categoryNameMap.get(tx.category_id) ?? "카테고리";
  const walletName = tx.wallet_type === "ACCOUNT"
    ? (accountNameMap.get(tx.wallet_id) ?? "계좌")
    : (cardNameMap.get(tx.wallet_id) ?? "카드");
  const iconId = categoryIconMap.get(tx.category_id);
  const icon = iconId ? iconMap.get(iconId) : undefined;

  return (
    <div className={`${cardClass} flex items-center gap-3 p-4 opacity-70`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)]">
        {icon ? (
          <IconRenderer
            providerType={icon.provider_type}
            providerKey={icon.provider_key}
            size={20}
            className="text-[var(--color-text-primary)]"
          />
        ) : (
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {categoryName.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-sm font-medium text-[var(--color-text-primary)]">
          <span className="truncate">{categoryName}</span>
          {tx.memo && (
            <>
              <span className="shrink-0 text-[var(--color-text-caption)]">·</span>
              <span className="truncate text-[var(--color-text-secondary)]">{tx.memo}</span>
            </>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <span className="truncate">{walletName}</span>
          <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium leading-none text-amber-600">
            <Clock size={10} />
            동기화 대기
          </span>
        </p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${tx.transaction_type === "INCOME" ? "text-[var(--color-income)]" : "text-[var(--color-danger)]"}`}>
        {tx.transaction_type === "INCOME" ? "+" : "-"}{tx.amount.toLocaleString("ko-KR")}원
      </p>
    </div>
  );
};

let _savedTxState: { year: number; month: number; page: number; scrollTop?: number } | null = null;

const TransactionsPage: React.FC = () => {
  const timezone = useTimezone();
  const todayStr = getTodayInTimezone(timezone);
  const location = useLocation();

  const [year, setYear] = React.useState(() => {
    if ((location.state as { reset?: boolean } | null)?.reset) _savedTxState = null;
    return _savedTxState?.year ?? parseInt(todayStr.slice(0, 4), 10);
  });
  const [month, setMonth] = React.useState(_savedTxState?.month ?? parseInt(todayStr.slice(5, 7), 10));
  const [page, setPage] = React.useState(_savedTxState?.page ?? 1);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const isOffline = !navigator.onLine;

  const { start, end } = getMonthRange(year, month);

  const query = useQuery({
    queryKey: ["transactions", year, month, page],
    queryFn: () =>
      transactionApi.getTransactions({ start_date: start, end_date: end, page, limit: QUERY_LIMIT.PAGE }),
    staleTime: STALE_TIME.SHORT,
    retry: isOffline ? false : RETRY.STANDARD
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: STALE_TIME.MEDIUM
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: STALE_TIME.LONG
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts({ include_balance: true }),
    staleTime: STALE_TIME.MEDIUM
  });

  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: STALE_TIME.MEDIUM
  });

  const [pendingTxs, setPendingTxs] = React.useState<OfflineTransaction[]>([]);

  React.useEffect(() => {
    getAllOfflineTransactions()
      .then(all => setPendingTxs(
        all.filter(tx => !tx.deleted_yn && (tx.sync_status === "pending_sync" || tx.sync_status === "syncing"))
      ))
      .catch(() => {});
  }, [query.dataUpdatedAt]);

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

  const categoryNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    categoriesQuery.data?.data?.items.forEach((cat) => map.set(cat.category_id, cat.category_name));
    return map;
  }, [categoriesQuery.data]);

  const accountNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    accountsQuery.data?.data?.items.forEach((acc) => map.set(acc.account_id, acc.account_name));
    return map;
  }, [accountsQuery.data]);

  const cardNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    cardsQuery.data?.data?.items.forEach((card) => map.set(card.card_id, card.card_name));
    return map;
  }, [cardsQuery.data]);

  const monthPendingTxs = React.useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return pendingTxs.filter(tx => tx.transaction_date.startsWith(prefix));
  }, [pendingTxs, year, month]);


  const items = query.data?.data?.items ?? [];
  const totalCount = query.data?.data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const grouped = groupByDate(items);

  React.useEffect(() => {
    _savedTxState = { year, month, page, scrollTop: _savedTxState?.scrollTop };
  }, [year, month, page]);

  React.useEffect(() => {
    const scrollEl = pageRef.current?.parentElement as HTMLElement | null;
    if (!scrollEl) return;
    const onScroll = () => {
      if (_savedTxState) _savedTxState.scrollTop = scrollEl.scrollTop;
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  React.useLayoutEffect(() => {
    if (!query.isSuccess) return;
    const scrollEl = pageRef.current?.parentElement as HTMLElement | null;
    if (scrollEl) scrollEl.scrollTop = _savedTxState?.scrollTop ?? 0;
  }, [query.isSuccess]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setPage(1);
  }

  function nextMonth() {
    const nowStr = getTodayInTimezone(timezone);
    const nowYear = parseInt(nowStr.slice(0, 4), 10);
    const nowMonth = parseInt(nowStr.slice(5, 7), 10);
    if (year > nowYear || (year === nowYear && month >= nowMonth)) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setPage(1);
  }

  const isCurrentMonth = (() => {
    const nowStr = getTodayInTimezone(timezone);
    return year === parseInt(nowStr.slice(0, 4), 10) && month === parseInt(nowStr.slice(5, 7), 10);
  })();

  return (
    <div ref={pageRef} className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">
        {/* 헤더 */}
        <div className="mb-6 flex items-center">
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">거래 내역</h1>
        </div>

        {/* 오프라인 배너 */}
        {isOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 캐시된 데이터를 표시합니다.</span>
          </div>
        )}

        {/* 월 선택 */}
        <div className={`${cardClass} mb-4 flex items-center justify-between px-4 py-3`}>
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="이전 달"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)]">
            {year}년 {month}월
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 동기화 대기 중인 내역 */}
        {monthPendingTxs.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {monthPendingTxs.map(tx => (
              <PendingTransactionCard
                key={tx.local_id}
                tx={tx}
                iconMap={iconMap}
                categoryIconMap={categoryIconMap}
                categoryNameMap={categoryNameMap}
                accountNameMap={accountNameMap}
                cardNameMap={cardNameMap}
              />
            ))}
          </div>
        )}

        {/* 로딩 */}
        {query.isLoading && <TransactionSkeleton />}

        {/* 에러 */}
        {query.isError && !query.data && (
          <div
            className={`${cardClass} flex flex-col items-center gap-3 px-6 py-10 text-center`}
            role="alert"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">
              거래 내역을 불러오지 못했습니다.
            </p>
            <button
              onClick={() => query.refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {/* 빈 상태 */}
        {!query.isLoading && !query.isError && items.length === 0 && monthPendingTxs.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
            <p className="text-base font-medium text-[var(--color-text-primary)]">
              거래 내역이 없습니다
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              이번 달 등록된 거래가 없어요.
            </p>
          </div>
        )}

        {/* 거래내역 */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4">
            {Array.from(grouped.entries()).map(([date, txList]) => {
              const income = txList.filter((t) => t.transaction_type === "INCOME").reduce((s, t) => s + t.amount, 0);
              const expense = txList.filter((t) => t.transaction_type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
              return (
                <div key={date}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {formatDate(date)}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {income > 0 && (
                        <span className="text-[var(--color-income)]">+{income.toLocaleString("ko-KR")}원</span>
                      )}
                      {expense > 0 && (
                        <span className="text-[var(--color-danger)]">-{expense.toLocaleString("ko-KR")}원</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {txList.map((tx) => (
                      <TransactionCard
                        key={tx.transaction_id}
                        item={tx}
                        iconMap={iconMap}
                        categoryIconMap={categoryIconMap}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-[var(--color-border-primary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] disabled:opacity-30"
            >
              이전
            </button>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-[var(--color-border-primary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] disabled:opacity-30"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
