import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, RefreshCw, WifiOff, X } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";
import { isTransferTransaction } from "../../entities/transaction/lib/isTransfer";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone, toDateValue } from "../../shared/utils/date";
import { STALE_TIME, RETRY, QUERY_LIMIT } from "../../shared/constants/queryConfig";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { getAllOfflineTransactions } from "../../pwa/indexed-db/repositories/offlineTransaction.repository";
import type { OfflineTransaction } from "../../pwa/types/indexedDb.types";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

interface Filters {
  categoryId?: number;
  walletType?: "ACCOUNT" | "CARD";
  walletId?: number;
  transactionType?: "INCOME" | "EXPENSE";
  // 선택된 연/월(year, month) 안의 특정 일자(1~31)만 남기는 필터. 카테고리/지갑/수입-지출과
  // 달리 API 파라미터가 아니라, 조회 시 start_date/end_date를 둘 다 그 날짜로 좁혀서 구현한다
  // (getEffectiveDateRange 참고). 그래서 getFilterParams에는 포함하지 않는다.
  day?: number;
}

function getFilterParams(filters: Filters) {
  return {
    category_id: filters.categoryId,
    wallet_type: filters.walletType,
    wallet_id: filters.walletId,
    transaction_type: filters.transactionType
  };
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function toDayDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "일" 필터가 선택되어 있으면 조회 범위를 그 하루로 좁힌다(start_date === end_date).
// 선택되어 있지 않으면 기존과 동일하게 월 전체 범위를 사용한다.
function getEffectiveDateRange(
  year: number,
  month: number,
  day: number | undefined
): { start: string; end: string } {
  if (day != null) {
    const dayStr = toDayDateStr(year, month, day);
    return { start: dayStr, end: dayStr };
  }
  return getMonthRange(year, month);
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

// 선택된 연/월의 날짜 그리드. 기간 이동 바텀시트("그 날짜가 있는 페이지로 스크롤 이동")와
// "일" 필터 바텀시트("그 날짜로 목록을 좁히기") 양쪽에서 공용으로 사용한다. 미래 날짜는
// 항상 비활성화한다.
interface MonthDayGridProps {
  year: number;
  month: number;
  todayStr: string;
  selectedDate?: string;
  onSelectDate: (dateStr: string) => void;
}

const MonthDayGrid: React.FC<MonthDayGridProps> = ({ year, month, todayStr, selectedDate, onSelectDate }) => {
  const lastDay = new Date(year, month, 0).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const dStr = toDayDateStr(year, month, d);
        const disabled = dStr > todayStr;
        const isSelected = dStr === selectedDate;
        return (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onSelectDate(dStr)}
            className={`flex h-9 items-center justify-center rounded-lg text-sm transition disabled:pointer-events-none disabled:opacity-30 ${
              isSelected
                ? "bg-[var(--color-primary)] font-semibold text-[var(--color-text-primary)]"
                : dStr === todayStr
                  ? "border border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
};

// 기간 이동 바텀시트: 월 라벨 탭 시 열린다. 연도 이동 → 월 그리드(현재월 이후 비활성화) →
// 월 선택 시 해당 월의 날짜 그리드를 표시한다(거래 유무 표시는 하지 않음). 날짜를 탭하면
// 그 날짜가 있는 페이지로 자동 이동 + 하이라이트하고 시트를 닫는다. 월만 선택하고 날짜를
// 고르지 않으면 그 달 1페이지부터 보여준다(기존 이전/다음 달 이동과 동일한 동작).
interface PeriodJumpSheetProps {
  isOpen: boolean;
  year: number;
  month: number;
  todayStr: string;
  onClose: () => void;
  onSelectMonth: (year: number, month: number) => void;
  onSelectDate: (dateStr: string) => void;
  onToday: () => void;
}

const PeriodJumpSheet: React.FC<PeriodJumpSheetProps> = ({
  isOpen, year, month, todayStr, onClose, onSelectMonth, onSelectDate, onToday
}) => {
  const [sheetYear, setSheetYear] = React.useState(year);
  const [sheetMonth, setSheetMonth] = React.useState(month);

  React.useEffect(() => {
    if (isOpen) {
      setSheetYear(year);
      setSheetMonth(month);
    }
  }, [isOpen, year, month]);

  if (!isOpen) return null;

  const [todayYear, todayMonth] = todayStr.split("-").map(Number);
  const canGoNextYear = sheetYear < todayYear;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-t-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">기간 이동</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToday}
              className="rounded-lg border border-[var(--color-border-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              오늘
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {/* 연도 이동 */}
          <div className="mb-4 flex items-center justify-between px-1">
            <button
              type="button"
              aria-label="이전 연도"
              onClick={() => setSheetYear((y) => y - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-base font-semibold text-[var(--color-text-primary)]">{sheetYear}년</span>
            <button
              type="button"
              aria-label="다음 연도"
              onClick={() => setSheetYear((y) => y + 1)}
              disabled={!canGoNextYear}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 월 그리드 */}
          <div className="mb-5 grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const disabled = sheetYear === todayYear && m > todayMonth;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSheetMonth(m);
                    onSelectMonth(sheetYear, m);
                  }}
                  className={`rounded-xl py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-30 ${
                    sheetMonth === m
                      ? "bg-[var(--color-primary)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  {m}월
                </button>
              );
            })}
          </div>

          {/* 날짜 그리드 */}
          <div>
            <p className="mb-2 px-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {sheetYear}년 {sheetMonth}월
            </p>
            <MonthDayGrid
              year={sheetYear}
              month={sheetMonth}
              todayStr={todayStr}
              onSelectDate={onSelectDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 카테고리/지갑/수입-지출 필터 칩에서 공용으로 사용하는 선택 바텀시트.
interface FilterSelectOption {
  id: string;
  label: string;
  iconId?: number;
}

interface FilterSelectSheetProps {
  title: string;
  isOpen: boolean;
  options: FilterSelectOption[];
  selectedId?: string;
  iconMap: Map<number, IconItem>;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
}

const FilterSelectSheet: React.FC<FilterSelectSheetProps> = ({
  title, isOpen, options, selectedId, iconMap, onSelect, onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[60vh] w-full max-w-[480px] flex-col rounded-t-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => { onSelect(undefined); onClose(); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
              !selectedId
                ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            전체
          </button>
          {options.map((opt) => {
            const icon = opt.iconId ? iconMap.get(opt.iconId) : undefined;
            const active = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); onClose(); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                }`}
              >
                {icon && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
                    <IconRenderer
                      providerType={icon.provider_type}
                      providerKey={icon.provider_key}
                      size={16}
                      className="text-[var(--color-text-primary)]"
                    />
                  </span>
                )}
                <span className="flex-1">{opt.label}</span>
                {active && <span className="text-xs font-semibold text-[var(--color-primary)]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// "일" 필터 바텀시트: 현재 선택된 연/월 안에서 특정 일자를 골라 목록을 그 하루로 좁힌다.
// 기간 이동 바텀시트("그 날짜로 스크롤 이동")와는 달리 실제로 조회 범위를 좁히는 필터다.
// 다른 달로는 이동할 수 없다(연/월 이동은 상단 월 선택/기간 이동 바텀시트의 몫이며, 그때
// 이 필터는 초기화된다).
interface DayFilterSheetProps {
  isOpen: boolean;
  year: number;
  month: number;
  todayStr: string;
  selectedDay?: number;
  onSelect: (day: number | undefined) => void;
  onClose: () => void;
}

const DayFilterSheet: React.FC<DayFilterSheetProps> = ({
  isOpen, year, month, todayStr, selectedDay, onSelect, onClose
}) => {
  if (!isOpen) return null;

  const selectedDate = selectedDay != null ? toDayDateStr(year, month, selectedDay) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-[480px] flex-col rounded-t-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">일</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => { onSelect(undefined); onClose(); }}
            className={`mb-3 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${
              selectedDay == null
                ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            전체
          </button>
          <p className="mb-2 px-1 text-xs font-medium text-[var(--color-text-secondary)]">
            {year}년 {month}월
          </p>
          <MonthDayGrid
            year={year}
            month={month}
            todayStr={todayStr}
            selectedDate={selectedDate}
            onSelectDate={(dStr) => {
              onSelect(parseInt(dStr.slice(8, 10), 10));
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface FilterChipProps {
  label: string;
  value?: string;
  onClick: () => void;
  onClear: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, value, onClick, onClear }) => (
  <div
    className={`flex items-center rounded-full border text-xs font-medium transition ${
      value
        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
        : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]"
    }`}
  >
    <button type="button" onClick={onClick} className="flex items-center gap-1 rounded-full py-1.5 pl-3 pr-2">
      <span>{value ?? label}</span>
      {!value && <ChevronDown size={12} />}
    </button>
    {value && (
      <button
        type="button"
        aria-label={`${label} 필터 해제`}
        onClick={onClear}
        className="mr-1 flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-[var(--color-bg-secondary)]"
      >
        <X size={12} />
      </button>
    )}
  </div>
);

// 상세화면(POP=뒤로가기)에서 돌아왔을 때 이전에 보던 페이지/스크롤 위치를 복원하기 위한
// 모듈 스코프 저장소. 연/월은 새로고침에도 살아남아야 하므로 URL 쿼리 파라미터(year, month)로
// 옮겼고, 이 저장소에는 새로고침 시 굳이 유지할 필요가 없는 page/scrollTop/필터만 남긴다.
let _savedTxState: {
  year: number;
  month: number;
  page: number;
  scrollTop?: number;
  filters?: Filters;
} | null = null;

const TransactionsPage: React.FC = () => {
  const timezone = useTimezone();
  const todayStr = getTodayInTimezone(timezone);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocationState = location.state as { highlightDate?: string; reset?: boolean } | null;

  // 신규 등록/기간 이동 바텀시트에서 특정 날짜로 점프한 경우, 그 날짜가 있는 페이지를 찾아
  // 스크롤 하이라이트하기 위한 대상 날짜. 최초 진입 시에는 거래 등록 화면에서 넘어온
  // location.state.highlightDate로 초기화되고, 이후에는 기간 이동 바텀시트에서 직접 설정된다.
  const [targetDate, setTargetDate] = React.useState<string | undefined>(initialLocationState?.highlightDate);

  const [year, setYear] = React.useState(() => {
    if (initialLocationState?.reset) _savedTxState = null;
    if (initialLocationState?.highlightDate) {
      _savedTxState = null;
      return parseInt(initialLocationState.highlightDate.slice(0, 4), 10);
    }
    const urlYear = searchParams.get("year");
    if (urlYear && /^\d{4}$/.test(urlYear)) return parseInt(urlYear, 10);
    return _savedTxState?.year ?? parseInt(todayStr.slice(0, 4), 10);
  });
  const [month, setMonth] = React.useState(() => {
    if (targetDate) return parseInt(targetDate.slice(5, 7), 10);
    const urlMonth = searchParams.get("month");
    if (urlMonth) {
      const m = parseInt(urlMonth, 10);
      if (m >= 1 && m <= 12) return m;
    }
    return _savedTxState?.month ?? parseInt(todayStr.slice(5, 7), 10);
  });
  const [page, setPage] = React.useState(_savedTxState?.page ?? 1);
  const [filters, setFilters] = React.useState<Filters>(() => _savedTxState?.filters ?? {});
  // 신규 등록된 거래(targetDate)로 진입한 경우, 해당 날짜가 속한 페이지를 먼저 계산할 때까지
  // 잘못된 페이지(1페이지)가 잠깐 보이지 않도록 목록 조회를 지연한다.
  const [pageResolved, setPageResolved] = React.useState(!targetDate);
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = React.useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = React.useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = React.useState(false);
  const [isTypeSheetOpen, setIsTypeSheetOpen] = React.useState(false);
  const [isDaySheetOpen, setIsDaySheetOpen] = React.useState(false);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const isOffline = !navigator.onLine;

  const isCurrentMonth =
    year === parseInt(todayStr.slice(0, 4), 10) && month === parseInt(todayStr.slice(5, 7), 10);
  const { end } = getMonthRange(year, month);
  // "일" 필터가 선택되어 있으면 조회 범위를 그 하루로 좁힌다. positionQuery(기간 이동
  // 바텀시트의 날짜 점프용 페이지 위치 계산)는 이 필터와 별개의 흐름이라 항상 월 전체
  // 범위(start/end)를 기준으로 계산한다.
  const { start: rangeStart, end: rangeEnd } = getEffectiveDateRange(year, month, filters.day);
  // 신규 진입(리셋) 시에만 "오늘" 위치로 스크롤 이동한다. 카드 할부의 미래 회차 등
  // 오늘보다 미래 날짜 거래는 데이터에서 제외하지 않고 그대로 보여주되, 스크롤만 오늘로 옮긴다.
  // StrictMode에서 effect가 두 번 실행되어도 결과가 같도록, 값을 도중에 바꾸지 않고 마운트 시점에
  // 한 번만 계산해서 고정한다(실행 후 false로 바꾸는 방식은 두 번째 실행에서 폴백 분기로 빠져
  // 방금 옮긴 스크롤을 다시 0으로 되돌려버린다).
  const wasFreshEntry = React.useRef(!targetDate && _savedTxState === null).current;

  // 연/월은 새로고침(F5)에도 유지되어야 하므로 URL 쿼리 파라미터에 동기화한다. 최초 마운트
  // 시점에는 실행하지 않는다 — 거래 등록 후 복귀(highlightDate)나 "최근 내역 더보기"(reset)
  // 진입 시 URL이 정확히 `/transactions`로 끝나야 하는 화면(E2E, 대시보드 진입)이 있기 때문에,
  // 사용자가 실제로 기간을 이동(이전/다음 달, 기간 이동 바텀시트)한 뒤부터만 URL에 반영한다.
  const yearMonthMountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!yearMonthMountedRef.current) {
      yearMonthMountedRef.current = true;
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("year", String(year));
        next.set("month", String(month));
        return next;
      },
      { replace: true }
    );
  }, [year, month, setSearchParams]);

  const positionQuery = useQuery({
    queryKey: ["transactions-position", year, month, targetDate, filters],
    queryFn: async () => {
      const dayAfter = new Date(`${targetDate}T00:00:00`);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const dayAfterStr = toDateValue(dayAfter);
      if (dayAfterStr > end) return { total_count: 0 };
      const res = await transactionApi.getTransactions({
        start_date: dayAfterStr,
        end_date: end,
        page: 1,
        limit: 1,
        ...getFilterParams(filters)
      });
      return { total_count: res.data?.total_count ?? 0 };
    },
    enabled: !!targetDate && !pageResolved,
    staleTime: 0
  });

  React.useEffect(() => {
    if (!targetDate || pageResolved) return;
    if (positionQuery.data) {
      setPage(Math.floor(positionQuery.data.total_count / QUERY_LIMIT.PAGE) + 1);
      setPageResolved(true);
    } else if (positionQuery.isError) {
      // 위치 계산에 실패해도 목록 자체는 볼 수 있어야 하므로 1페이지로 대체한다.
      setPageResolved(true);
    }
  }, [targetDate, pageResolved, positionQuery.data, positionQuery.isError]);

  const isResolvingTargetPosition = !!targetDate && !pageResolved;

  const query = useQuery({
    queryKey: ["transactions", year, month, page, filters],
    queryFn: () =>
      transactionApi.getTransactions({
        start_date: rangeStart,
        end_date: rangeEnd,
        page,
        limit: QUERY_LIMIT.PAGE,
        ...getFilterParams(filters)
      }),
    staleTime: STALE_TIME.SHORT,
    retry: isOffline ? false : RETRY.STANDARD,
    enabled: pageResolved
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

  const categoryOptions: FilterSelectOption[] = React.useMemo(
    () =>
      (categoriesQuery.data?.data?.items ?? []).map((c) => ({
        id: String(c.category_id),
        label: c.category_name,
        iconId: c.icon_id
      })),
    [categoriesQuery.data]
  );

  const walletOptions: FilterSelectOption[] = React.useMemo(() => {
    const accounts = (accountsQuery.data?.data?.items ?? []).map((a) => ({
      id: `ACCOUNT:${a.account_id}`,
      label: a.account_name,
      iconId: a.icon_id
    }));
    const cards = (cardsQuery.data?.data?.items ?? []).map((c) => ({
      id: `CARD:${c.card_id}`,
      label: c.card_name,
      iconId: c.icon_id
    }));
    return [...accounts, ...cards];
  }, [accountsQuery.data, cardsQuery.data]);

  const typeOptions: FilterSelectOption[] = [
    { id: "INCOME", label: "수입" },
    { id: "EXPENSE", label: "지출" }
  ];

  const selectedCategoryLabel = filters.categoryId != null
    ? categoryOptions.find((o) => o.id === String(filters.categoryId))?.label
    : undefined;
  const selectedWalletLabel = filters.walletId != null
    ? walletOptions.find((o) => o.id === `${filters.walletType}:${filters.walletId}`)?.label
    : undefined;
  const selectedTypeLabel = filters.transactionType === "INCOME"
    ? "수입"
    : filters.transactionType === "EXPENSE"
      ? "지출"
      : undefined;
  const selectedDayLabel = filters.day != null ? `${month}월 ${filters.day}일` : undefined;

  // 계좌이동 거래는 전체 거래내역에 노출하지 않는다(지갑별 거래내역에서만 노출).
  // 서버가 아직 이 필터를 지원하지 않아 클라이언트에서 제외하므로, 한 페이지에 표시되는
  // 항목 수가 페이지 크기보다 적게 보일 수 있다(백엔드 API #389에서 서버 필터 추가 예정).
  const items = (query.data?.data?.items ?? []).filter((tx) => !isTransferTransaction(tx));
  const totalCount = query.data?.data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const grouped = groupByDate(items);

  React.useEffect(() => {
    _savedTxState = { year, month, page, filters, scrollTop: _savedTxState?.scrollTop };
  }, [year, month, page, filters]);

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
    if (targetDate) {
      const el = pageRef.current?.querySelector(`[data-date="${targetDate}"]`) as HTMLElement | null;
      const scrollEl = pageRef.current?.parentElement as HTMLElement | null;
      if (el && scrollEl) {
        // 이 스크롤 컨테이너는 라우트 전환 시 초기화되지 않는다(NavLayout이 /transactions는
        // 자체 복원 로직에 맡기고 건너뜀). 그래서 등록 폼 화면 등 직전 화면의 scrollTop이
        // 그대로 남아있을 수 있는데, 그 값을 기준으로 "이미 보이는지"를 판단하면 실제로는
        // 안 보이는 상태를 잘못 보이는 것으로 오판할 수 있다. 항상 맨 위를 기준선으로 삼는다.
        scrollEl.scrollTop = 0;
        const elRect = el.getBoundingClientRect();
        const containerRect = scrollEl.getBoundingClientRect();
        // 이미 화면(하단 네비게이션 위 영역)에 온전히 보이는 경우 불필요한 스크롤을 생략한다.
        const alreadyVisible = elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
        if (!alreadyVisible) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    const scrollEl = pageRef.current?.parentElement as HTMLElement | null;
    if (wasFreshEntry && isCurrentMonth) {
      const todayEl = pageRef.current?.querySelector(`[data-date="${todayStr}"]`) as HTMLElement | null;
      if (todayEl) {
        todayEl.scrollIntoView({ block: "start" });
        return;
      }
    }
    if (scrollEl) scrollEl.scrollTop = _savedTxState?.scrollTop ?? 0;
    // query.dataUpdatedAt을 의존성에 포함한다: 이 페이지로 돌아올 때 캐시된(stale) 이전 데이터로
    // isSuccess가 먼저 true가 되고, 방금 등록한 거래가 반영된 최신 데이터는 백그라운드 refetch로
    // 뒤늦게 도착한다. isSuccess는 그사이 계속 true라 dataUpdatedAt이 없으면 effect가 다시 실행되지
    // 않아, 최신 데이터가 온 뒤에도 하이라이트 대상 요소를 계속 못 찾은 채로 남는다.
  }, [query.isSuccess, query.dataUpdatedAt, targetDate, isCurrentMonth, todayStr, wasFreshEntry]);

  // 달이 바뀌면(이전/다음 달, 기간 이동 바텀시트의 월/날짜 선택) "일" 필터는 항상 초기화한다
  // — 예전 달의 일자 필터가 새 달에 그대로 남아있으면 안 되기 때문이다.
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setPage(1);
    setTargetDate(undefined);
    setPageResolved(true);
    setFilters((prev) => ({ ...prev, day: undefined }));
  }

  function nextMonth() {
    const nowStr = getTodayInTimezone(timezone);
    const nowYear = parseInt(nowStr.slice(0, 4), 10);
    const nowMonth = parseInt(nowStr.slice(5, 7), 10);
    if (year > nowYear || (year === nowYear && month >= nowMonth)) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setPage(1);
    setTargetDate(undefined);
    setPageResolved(true);
    setFilters((prev) => ({ ...prev, day: undefined }));
  }

  // 기간 이동 바텀시트에서 월만 선택한 경우: 그 달 1페이지부터 보여준다(기존 동작 유지).
  function selectMonth(y: number, m: number) {
    setYear(y);
    setMonth(m);
    setPage(1);
    setTargetDate(undefined);
    setPageResolved(true);
    setFilters((prev) => ({ ...prev, day: undefined }));
  }

  // 기간 이동 바텀시트에서 날짜를 탭했거나 "오늘" 버튼을 누른 경우: 해당 날짜가 있는
  // 페이지를 찾아 이동한 뒤 스크롤 하이라이트한다(신규 등록 거래 진입 시와 동일한 로직).
  // 이건 "일" 필터(목록을 그 하루로 좁히기)와는 다른 기능이므로 여기서는 day 필터를
  // 초기화만 하고 실제 필터로는 설정하지 않는다.
  function jumpToDate(dateStr: string) {
    const y = parseInt(dateStr.slice(0, 4), 10);
    const m = parseInt(dateStr.slice(5, 7), 10);
    setYear(y);
    setMonth(m);
    setPage(1);
    setTargetDate(dateStr);
    setPageResolved(false);
    setIsPeriodSheetOpen(false);
    setFilters((prev) => ({ ...prev, day: undefined }));
  }

  function updateFilters(next: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }

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
        <div className={`${cardClass} mb-3 flex items-center justify-between px-4 py-3`}>
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="이전 달"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => setIsPeriodSheetOpen(true)}
            aria-haspopup="dialog"
            className="rounded-lg px-2 text-base font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg-secondary)]"
          >
            {year}년 {month}월
          </button>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 필터 바 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip
            label="카테고리"
            value={selectedCategoryLabel}
            onClick={() => setIsCategorySheetOpen(true)}
            onClear={() => updateFilters({ categoryId: undefined })}
          />
          <FilterChip
            label="지갑"
            value={selectedWalletLabel}
            onClick={() => setIsWalletSheetOpen(true)}
            onClear={() => updateFilters({ walletType: undefined, walletId: undefined })}
          />
          <FilterChip
            label="수입/지출"
            value={selectedTypeLabel}
            onClick={() => setIsTypeSheetOpen(true)}
            onClear={() => updateFilters({ transactionType: undefined })}
          />
          <FilterChip
            label="일"
            value={selectedDayLabel}
            onClick={() => setIsDaySheetOpen(true)}
            onClear={() => updateFilters({ day: undefined })}
          />
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
        {(query.isLoading || isResolvingTargetPosition) && <TransactionSkeleton />}

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
        {!query.isLoading && !isResolvingTargetPosition && !query.isError && items.length === 0 && monthPendingTxs.length === 0 && (
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
                <div key={date} data-date={date}>
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

      <PeriodJumpSheet
        isOpen={isPeriodSheetOpen}
        year={year}
        month={month}
        todayStr={todayStr}
        onClose={() => setIsPeriodSheetOpen(false)}
        onSelectMonth={selectMonth}
        onSelectDate={jumpToDate}
        onToday={() => jumpToDate(todayStr)}
      />
      <FilterSelectSheet
        title="카테고리"
        isOpen={isCategorySheetOpen}
        options={categoryOptions}
        selectedId={filters.categoryId != null ? String(filters.categoryId) : undefined}
        iconMap={iconMap}
        onSelect={(id) => updateFilters({ categoryId: id ? Number(id) : undefined })}
        onClose={() => setIsCategorySheetOpen(false)}
      />
      <FilterSelectSheet
        title="지갑"
        isOpen={isWalletSheetOpen}
        options={walletOptions}
        selectedId={filters.walletId != null ? `${filters.walletType}:${filters.walletId}` : undefined}
        iconMap={iconMap}
        onSelect={(id) => {
          if (!id) { updateFilters({ walletType: undefined, walletId: undefined }); return; }
          const [walletType, walletId] = id.split(":");
          updateFilters({ walletType: walletType as "ACCOUNT" | "CARD", walletId: Number(walletId) });
        }}
        onClose={() => setIsWalletSheetOpen(false)}
      />
      <FilterSelectSheet
        title="수입/지출"
        isOpen={isTypeSheetOpen}
        options={typeOptions}
        selectedId={filters.transactionType}
        iconMap={iconMap}
        onSelect={(id) => updateFilters({ transactionType: id as "INCOME" | "EXPENSE" | undefined })}
        onClose={() => setIsTypeSheetOpen(false)}
      />
      <DayFilterSheet
        isOpen={isDaySheetOpen}
        year={year}
        month={month}
        todayStr={todayStr}
        selectedDay={filters.day}
        onSelect={(day) => updateFilters({ day })}
        onClose={() => setIsDaySheetOpen(false)}
      />
    </div>
  );
};

export default TransactionsPage;
