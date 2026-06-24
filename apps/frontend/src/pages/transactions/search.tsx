import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Circle, Search, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function getThreeMonthsAgo(timezone: string): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toLocaleDateString("sv-SE", { timeZone: timezone });
}

// 검색 상태 캐시 (뒤로가기 복원용)
interface BrowseCacheState {
  startDate: string;
  endDate: string;
  walletOpt: SelectOption | undefined;
  categoryOpt: SelectOption | undefined;
  searched: boolean;
  params: { start: string; end: string; walletId?: number; walletType?: string; catId?: number } | null;
}
interface KeywordCacheState {
  keyword: string;
  submittedKeyword: string;
  triggered: boolean;
  searched: boolean;
}
interface SearchPageCache {
  tab: "browse" | "keyword";
  browse: BrowseCacheState;
  keyword: KeywordCacheState;
}
const _sc: SearchPageCache = {
  tab: "browse",
  browse: { startDate: "", endDate: "", walletOpt: undefined, categoryOpt: undefined, searched: false, params: null },
  keyword: { keyword: "", submittedKeyword: "", triggered: false, searched: false }
};

function formatAmount(amount: number, type: "INCOME" | "EXPENSE"): string {
  const formatted = amount.toLocaleString("ko-KR");
  return type === "INCOME" ? `+${formatted}원` : `-${formatted}원`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]})`;
}

function groupByDate(items: TransactionItem[]): Map<string, TransactionItem[]> {
  const map = new Map<string, TransactionItem[]>();
  for (const item of items) {
    if (!map.has(item.transaction_date)) map.set(item.transaction_date, []);
    map.get(item.transaction_date)!.push(item);
  }
  return map;
}

// 할부 거래는 installment_id당 가장 낮은 seq(1회차 우선) 하나만 유지
function deduplicateInstallments(items: TransactionItem[]): TransactionItem[] {
  const best = new Map<number, TransactionItem>();
  for (const item of items) {
    if (!item.installment_id) continue;
    const prev = best.get(item.installment_id);
    if (!prev || (item.installment_seq ?? Infinity) < (prev.installment_seq ?? Infinity)) {
      best.set(item.installment_id, item);
    }
  }
  const seen = new Set<number>();
  return items.filter((item) => {
    if (!item.installment_id) return true;
    if (seen.has(item.installment_id)) return false;
    if (best.get(item.installment_id)?.transaction_id === item.transaction_id) {
      seen.add(item.installment_id);
      return true;
    }
    return false;
  });
}


interface TransactionRowProps {
  item: TransactionItem;
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ item, iconMap, categoryIconMap }) => {
  const navigate = useNavigate();
  const iconId = categoryIconMap.get(item.category_id);
  const icon = iconId ? iconMap.get(iconId) : undefined;

  return (
    <div
      className={`${cardClass} flex cursor-pointer items-center gap-3 p-4 transition hover:bg-[var(--color-bg-secondary)]`}
      onClick={() => navigate(`/transactions/${item.transaction_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/transactions/${item.transaction_id}`)}
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
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {item.category_name}
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
            ? "text-blue-500"
            : "text-[var(--color-danger)]"
        }`}
      >
        {formatAmount(item.amount + (item.interest ?? 0), item.transaction_type)}
      </p>
    </div>
  );
};

// 아이콘 드롭다운 (지갑/카테고리 공용)
interface SelectOption {
  id: number;
  label: string;
  iconId: number;
  group?: string;
}

interface IconSelectProps {
  options: SelectOption[];
  value: number | undefined;
  placeholder: string;
  onChange: (opt: SelectOption | undefined) => void;
  iconMap: Map<number, IconItem>;
}

const IconSelect: React.FC<IconSelectProps> = ({ options, value, placeholder, onChange, iconMap }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const groups = Array.from(new Set(options.map((o) => o.group ?? ""))).filter(Boolean);
  const hasGroups = groups.length > 0;

  function renderIcon(iconId: number) {
    const icon = iconMap.get(iconId);
    if (!icon) return <Circle size={16} className="text-[var(--color-text-secondary)]" />;
    return (
      <IconRenderer
        providerType={icon.provider_type}
        providerKey={icon.provider_key}
        size={16}
        className="text-[var(--color-text-primary)]"
      />
    );
  }

  function renderOptions(items: SelectOption[]) {
    return items.map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => {
          onChange(opt);
          setOpen(false);
        }}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
          opt.id === value
            ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
            : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
          {renderIcon(opt.iconId)}
        </span>
        <span className="flex-1 text-sm">{opt.label}</span>
        {opt.id === value && (
          <span className="text-xs font-semibold text-[var(--color-primary)]">✓</span>
        )}
      </button>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
          open
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]"
            : "border-[var(--color-border-primary)]"
        } bg-[var(--color-bg-input)] cursor-pointer`}
      >
        {selected ? (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-bg-secondary)]">
              {renderIcon(selected.iconId)}
            </span>
            <span className="flex-1 text-sm text-[var(--color-text-primary)]">{selected.label}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
              className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-[var(--color-text-caption)]">{placeholder}</span>
            <ChevronDown size={14} className={`shrink-0 text-[var(--color-text-secondary)] transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] py-1 shadow-lg">
          {!selected && (
            <button
              type="button"
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            >
              전체
            </button>
          )}
          {hasGroups
            ? groups.map((group) => (
                <div key={group}>
                  <p className="px-4 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                    {group}
                  </p>
                  {renderOptions(options.filter((o) => o.group === group))}
                </div>
              ))
            : renderOptions(options)}
        </div>
      )}
    </div>
  );
};

// 조회 탭
interface BrowseTabProps {
  iconMap: Map<number, IconItem>;
  walletOptions: SelectOption[];
  categoryOptions: SelectOption[];
  categoriesLoading: boolean;
  walletsLoading: boolean;
}

const BrowseTab: React.FC<BrowseTabProps> = ({
  iconMap,
  walletOptions,
  categoryOptions,
  categoriesLoading,
  walletsLoading
}) => {
  const timezone = useTimezone();
  const [startDate, setStartDate] = React.useState(() => _sc.browse.startDate || getThreeMonthsAgo(timezone));
  const [endDate, setEndDate] = React.useState(() => _sc.browse.endDate || getTodayInTimezone(timezone));
  const [walletOpt, setWalletOpt] = React.useState<SelectOption | undefined>(() => _sc.browse.walletOpt);
  const [categoryOpt, setCategoryOpt] = React.useState<SelectOption | undefined>(() => _sc.browse.categoryOpt);
  const [searched, setSearched] = React.useState(() => _sc.browse.searched);
  const [params, setParams] = React.useState<{
    start: string; end: string; walletId?: number; walletType?: string; catId?: number;
  } | null>(() => _sc.browse.params);

  React.useEffect(() => {
    _sc.browse = { startDate, endDate, walletOpt, categoryOpt, searched, params };
  }, [startDate, endDate, walletOpt, categoryOpt, searched, params]);

  const query = useQuery({
    queryKey: ["transactions", "browse", params],
    queryFn: () =>
      transactionApi.getTransactions({
        start_date: params?.start,
        end_date: params?.end,
        wallet_type: params?.walletType,
        wallet_id: params?.walletId,
        category_id: params?.catId,
        limit: 200
      }),
    enabled: !!params,
    staleTime: 30 * 1000
  });

  const iconsForBrowse = iconMap;

  const categoriesIconMap = React.useMemo(() => {
    const map = new Map<number, number>();
    categoryOptions.forEach((c) => map.set(c.id, c.iconId));
    return map;
  }, [categoryOptions]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const walletType = walletOpt
      ? walletOptions.find((w) => w.id === walletOpt.id && w.group === "계좌")
        ? "ACCOUNT"
        : "CARD"
      : undefined;
    setParams({
      start: startDate,
      end: endDate,
      walletId: walletOpt?.id,
      walletType,
      catId: categoryOpt?.id
    });
    setSearched(true);
  }

  function handleReset() {
    const fresh = { startDate: getThreeMonthsAgo(timezone), endDate: getTodayInTimezone(timezone), walletOpt: undefined, categoryOpt: undefined, searched: false, params: null };
    _sc.browse = fresh;
    setStartDate(fresh.startDate);
    setEndDate(fresh.endDate);
    setWalletOpt(undefined);
    setCategoryOpt(undefined);
    setParams(null);
    setSearched(false);
  }

  const items = deduplicateInstallments(query.data?.data?.items ?? []);

  const inputClass =
    "w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2.5 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-caption)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

  return (
    <div>
      <form onSubmit={handleSearch} className={`${cardClass} mb-5 flex flex-col gap-4 p-4`}>
        {/* 기간 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">기간</label>
          <div className="flex items-center gap-2">
            <input type="date" className={inputClass} value={startDate} max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)} />
            <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">~</span>
            <input type="date" className={inputClass} value={endDate} min={startDate}
              onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* 지갑 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">지갑</label>
          {walletsLoading ? (
            <div className="h-11 rounded-xl bg-[var(--color-bg-secondary)]" />
          ) : (
            <IconSelect
              options={walletOptions}
              value={walletOpt?.id}
              placeholder="전체"
              onChange={setWalletOpt}
              iconMap={iconsForBrowse}
            />
          )}
        </div>

        {/* 카테고리 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">카테고리</label>
          {categoriesLoading ? (
            <div className="h-11 rounded-xl bg-[var(--color-bg-secondary)]" />
          ) : (
            <IconSelect
              options={categoryOptions}
              value={categoryOpt?.id}
              placeholder="전체"
              onChange={setCategoryOpt}
              iconMap={iconsForBrowse}
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            <Search size={16} />
            조회
          </button>
          {searched && (
            <button
              type="button"
              onClick={handleReset}
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--color-border-primary)] px-4 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              <X size={14} />
              초기화
            </button>
          )}
        </div>
      </form>

      {searched && (
        <>
          {query.isLoading && <ResultSkeleton />}
          {query.isError && !query.data && (
            <ErrorCard onRetry={() => query.refetch()} />
          )}
          {!query.isLoading && !query.isError && items.length === 0 && <EmptyCard />}
          {items.length > 0 && (
            <ResultList items={items} iconMap={iconsForBrowse} categoryIconMap={categoriesIconMap} />
          )}
        </>
      )}
    </div>
  );
};

// 키워드검색 탭
const KeywordTab: React.FC<{ iconMap: Map<number, IconItem>; categoryIconMap: Map<number, number> }> = ({
  iconMap,
  categoryIconMap
}) => {
  const [keyword, setKeyword] = React.useState(() => _sc.keyword.keyword);
  const [submittedKeyword, setSubmittedKeyword] = React.useState(() => _sc.keyword.submittedKeyword);
  const [triggered, setTriggered] = React.useState(() => _sc.keyword.triggered);
  const [searched, setSearched] = React.useState(() => _sc.keyword.searched);

  React.useEffect(() => {
    _sc.keyword = { keyword, submittedKeyword, triggered, searched };
  }, [keyword, submittedKeyword, triggered, searched]);

  const query = useQuery({
    queryKey: ["transactions", "keyword-all"],
    queryFn: () =>
      transactionApi.getTransactions({ limit: 500 }),
    enabled: triggered,
    staleTime: 60 * 1000
  });

  const filtered = React.useMemo(() => {
    const all = query.data?.data?.items ?? [];
    const kw = submittedKeyword.toLowerCase();
    const matched = submittedKeyword
      ? all.filter(
          (tx) =>
            (tx.memo ?? "").toLowerCase().includes(kw) ||
            tx.wallet_name.toLowerCase().includes(kw) ||
            tx.category_name.toLowerCase().includes(kw)
        )
      : all;
    return deduplicateInstallments(matched);
  }, [query.data, submittedKeyword]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSubmittedKeyword(keyword.trim());
    setTriggered(true);
    setSearched(true);
  }

  function handleReset() {
    _sc.keyword = { keyword: "", submittedKeyword: "", triggered: false, searched: false };
    setKeyword("");
    setSubmittedKeyword("");
    setTriggered(false);
    setSearched(false);
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2.5 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-caption)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

  return (
    <div>
      <form onSubmit={handleSearch} className={`${cardClass} mb-5 flex flex-col gap-4 p-4`}>
        {/* 키워드 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            키워드 <span className="font-normal text-[var(--color-text-caption)]">(메모 · 계좌명 · 카드명 · 카테고리명)</span>
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="검색어를 입력하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            <Search size={16} />
            검색
          </button>
          {searched && (
            <button
              type="button"
              onClick={handleReset}
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--color-border-primary)] px-4 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              <X size={14} />
              초기화
            </button>
          )}
        </div>
      </form>

      {searched && (
        <>
          {query.isLoading && <ResultSkeleton />}
          {query.isError && !query.data && <ErrorCard onRetry={() => query.refetch()} />}
          {!query.isLoading && !query.isError && filtered.length === 0 && <EmptyCard />}
          {filtered.length > 0 && (
            <ResultList items={filtered} iconMap={iconMap} categoryIconMap={categoryIconMap} />
          )}
        </>
      )}
    </div>
  );
};

// 공용 결과 컴포넌트
const ResultSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="검색 결과를 불러오는 중입니다.">
    {Array.from({ length: 3 }).map((_, i) => (
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

const EmptyCard: React.FC = () => (
  <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
    <p className="text-base font-medium text-[var(--color-text-primary)]">검색 결과가 없습니다</p>
    <p className="text-sm text-[var(--color-text-secondary)]">다른 조건으로 검색해보세요.</p>
  </div>
);

const ErrorCard: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className={`${cardClass} flex flex-col items-center gap-3 px-6 py-10 text-center`} role="alert">
    <p className="text-sm text-[var(--color-text-secondary)]">검색 결과를 불러오지 못했습니다.</p>
    <button
      type="button"
      onClick={onRetry}
      className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
    >
      다시 시도
    </button>
  </div>
);

const ResultList: React.FC<{
  items: TransactionItem[];
  iconMap: Map<number, IconItem>;
  categoryIconMap: Map<number, number>;
}> = ({ items, iconMap, categoryIconMap }) => {
  const grouped = groupByDate(items);
  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-xs text-[var(--color-text-secondary)]">총 {items.length}건</p>
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
                  <span className="text-blue-500">+{income.toLocaleString("ko-KR")}원</span>
                )}
                {expense > 0 && (
                  <span className="text-[var(--color-text-primary)]">-{expense.toLocaleString("ko-KR")}원</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {txList.map((tx) => (
                <TransactionRow key={tx.transaction_id} item={tx} iconMap={iconMap} categoryIconMap={categoryIconMap} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 메인 페이지
const TransactionSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: "browse" | "keyword" = rawTab === "keyword" ? "keyword" : "browse";
  const setTab = (next: "browse" | "keyword") => {
    _sc.tab = next;
    setSearchParams({ tab: next }, { replace: true });
  };

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts(),
    staleTime: 5 * 60 * 1000
  });
  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: 5 * 60 * 1000
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

  const walletOptions: SelectOption[] = React.useMemo(() => {
    const accounts = (accountsQuery.data?.data?.items ?? []).map((a) => ({
      id: a.account_id,
      label: a.account_name,
      iconId: a.icon_id,
      group: "계좌"
    }));
    const cards = (cardsQuery.data?.data?.items ?? []).map((c) => ({
      id: c.card_id,
      label: c.card_name,
      iconId: c.icon_id,
      group: "카드"
    }));
    return [...accounts, ...cards];
  }, [accountsQuery.data, cardsQuery.data]);

  const categoryOptions: SelectOption[] = React.useMemo(
    () =>
      (categoriesQuery.data?.data?.items ?? []).map((c) => ({
        id: c.category_id,
        label: c.category_name,
        iconId: c.icon_id
      })),
    [categoriesQuery.data]
  );

  const categoryIconMap = React.useMemo(() => {
    const map = new Map<number, number>();
    categoriesQuery.data?.data?.items.forEach((c) => map.set(c.category_id, c.icon_id));
    return map;
  }, [categoriesQuery.data]);

  const walletsLoading = accountsQuery.isLoading || cardsQuery.isLoading;
  const categoriesLoading = categoriesQuery.isLoading;

  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
      active
        ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
        : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    }`;

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">
        {/* 헤더 */}
        <div className="mb-4 flex items-center">
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">거래 검색</h1>
        </div>

        {/* 탭 */}
        <div className="mb-5 flex border-b border-[var(--color-border-primary)]">
          <button type="button" className={tabClass(tab === "browse")} onClick={() => setTab("browse")}>
            조회
          </button>
          <button type="button" className={tabClass(tab === "keyword")} onClick={() => setTab("keyword")}>
            키워드검색
          </button>
        </div>

        {tab === "browse" ? (
          <BrowseTab
            iconMap={iconMap}
            walletOptions={walletOptions}
            categoryOptions={categoryOptions}
            walletsLoading={walletsLoading}
            categoriesLoading={categoriesLoading}
          />
        ) : (
          <KeywordTab iconMap={iconMap} categoryIconMap={categoryIconMap} />
        )}
      </div>
    </div>
  );
};

export default TransactionSearchPage;
