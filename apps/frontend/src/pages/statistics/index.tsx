import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { ChevronLeft, ChevronRight, RefreshCw, WifiOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { statisticsApi } from "../../entities/statistics/api/statisticsApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import type {
  CalendarStatisticsData,
  CategoryTopStatisticsData,
  MonthlyDailyItem,
  PeriodStatisticsItem,
  SankeyIncomeStatisticsData,
  SankeyStatisticsData,
  SummaryStatisticsData
} from "../../entities/statistics/model/statistics.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip);

type StatTab = "spending" | "summary" | "top5" | "heatmap" | "sankey" | "income-sankey";
type ViewMode = "MONTH" | "WEEK";

const TABS: { id: StatTab; label: string }[] = [
  { id: "spending", label: "소비 통계" },
  { id: "summary", label: "월간 요약" },
  { id: "top5", label: "Top 5" },
  { id: "heatmap", label: "달력 히트맵" },
  { id: "sankey", label: "지출 흐름" },
  { id: "income-sankey", label: "수입 흐름" }
];

interface ChartItem {
  label: string;
  incomeAmount: number;
  expenseAmount: number;
}

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateValue(start), end: toDateValue(end) };
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatSignedAmount(amount: number, type: "INCOME" | "EXPENSE"): string {
  const sign = type === "INCOME" ? "+" : "-";
  return `${sign}${amount.toLocaleString("ko-KR")}원`;
}

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatWeekLabel(range: { start: string; end: string }): string {
  const s = new Date(`${range.start}T00:00:00`);
  const e = new Date(`${range.end}T00:00:00`);
  return `${s.getMonth() + 1}월 ${s.getDate()}일 - ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

function toChartItems(items: MonthlyDailyItem[]): ChartItem[] {
  return items.map((item) => ({
    label: item.date.slice(8),
    incomeAmount: item.income_amount,
    expenseAmount: item.expense_amount
  }));
}

function toPeriodChartItems(items: PeriodStatisticsItem[]): ChartItem[] {
  return items.map((item) => {
    const date = new Date(`${item.period}T00:00:00`);
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      incomeAmount: item.income_amount,
      expenseAmount: item.expense_amount
    };
  });
}

/* ── 공통 UI 조각 ─────────────────────────────────────── */

const SpendingChart: React.FC<{ items: ChartItem[] }> = ({ items }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return undefined;
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          {
            label: "수입",
            data: items.map((i) => i.incomeAmount),
            borderColor: "#38BDF8",
            backgroundColor: "rgba(56, 189, 248, 0.12)",
            borderWidth: 3,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35
          },
          {
            label: "지출",
            data: items.map((i) => i.expenseAmount),
            borderColor: "#F28A9B",
            backgroundColor: "rgba(242, 138, 155, 0.16)",
            borderWidth: 3,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label ?? "금액"} ${formatAmount(Number(ctx.parsed.y))}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#6F5B67", maxTicksLimit: 6 } },
          y: {
            beginAtZero: true,
            grid: { color: "#F8DDF0" },
            ticks: { color: "#6F5B67", callback: (v) => Number(v).toLocaleString("ko-KR") }
          }
        }
      }
    });
    return () => chart.destroy();
  }, [items]);

  return (
    <div className="h-[240px] min-h-[220px] w-full">
      <canvas ref={canvasRef} aria-label="월별 소비 흐름 차트" role="img" />
    </div>
  );
};

const TabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4" aria-label="통계 데이터를 불러오는 중입니다.">
    <div className={`${cardClass} p-4`} aria-hidden="true">
      <div className="mb-3 h-4 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
      <div className="h-[180px] rounded-xl bg-[var(--color-bg-secondary)]" />
    </div>
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${cardClass} h-24 p-4`}>
          <div className="mb-3 h-3 w-16 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-5 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
        </div>
      ))}
    </div>
  </div>
);

const ErrorCard: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className={`${cardClass} flex flex-col items-center gap-3 px-6 py-10 text-center`} role="alert">
    <p className="text-sm text-[var(--color-text-secondary)]">통계 데이터를 불러오지 못했습니다.</p>
    <button
      type="button"
      onClick={onRetry}
      className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
    >
      <RefreshCw size={14} />
      다시 시도
    </button>
  </div>
);

const EmptyCard: React.FC<{ message?: string }> = ({ message = "해당 기간에 데이터가 없습니다." }) => (
  <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
    <p className="text-base font-medium text-[var(--color-text-primary)]">통계 데이터가 없습니다</p>
    <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
  </div>
);

/* ── 탭별 콘텐츠 컴포넌트 ──────────────────────────────── */

// spending 탭
const SpendingContent: React.FC<{
  viewMode: ViewMode;
  chartItems: ChartItem[];
  incomeAmount: number;
  expenseAmount: number;
  netAmount: number;
  transactionCount: number;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
}> = ({ chartItems, incomeAmount, expenseAmount, netAmount, transactionCount, isLoading, isError, isEmpty, onRetry }) => {
  const hasChartData = chartItems.some((i) => i.incomeAmount > 0 || i.expenseAmount > 0);

  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (isEmpty) return <EmptyCard message="선택한 기간에 기록된 수입/지출이 없습니다." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardClass} p-4`}>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">수입</p>
          <p className="mt-2 text-lg font-bold text-sky-400">{formatAmount(incomeAmount)}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">지출</p>
          <p className="mt-2 text-lg font-bold text-[var(--color-danger)]">{formatAmount(expenseAmount)}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">잔액 흐름</p>
          <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">{formatAmount(netAmount)}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">거래 수</p>
          <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">
            {transactionCount.toLocaleString("ko-KR")}건
          </p>
        </div>
      </div>

      <section className={`${cardClass} p-4`}>
        <div className="mb-4">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">소비 흐름</h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">선택한 기간의 지출 금액 기준</p>
        </div>
        {hasChartData ? (
          <SpendingChart items={chartItems} />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] px-4 text-center text-sm text-[var(--color-text-secondary)]">
            차트로 표시할 수입/지출 데이터가 없습니다.
          </div>
        )}
      </section>
    </div>
  );
};

// summary 탭
const SummaryContent: React.FC<{
  data: SummaryStatisticsData | null;
  iconMap: Map<number, IconItem>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ data, iconMap, isLoading, isError, onRetry }) => {
  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (!data || data.expense_amount === 0) return <EmptyCard message="선택한 달에 기록된 지출이 없습니다." />;

  const topCat = data.top_category;
  const topCatIcon = topCat?.icon_id != null ? iconMap.get(topCat.icon_id) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4`} aria-label="월간 요약 카드">
        <h2 className="mb-4 text-base font-bold text-[var(--color-text-primary)]">월간 요약</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">수입</p>
            <p className="mt-1 text-lg font-bold text-sky-400">{formatAmount(data.income_amount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">지출</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-danger)]">{formatAmount(data.expense_amount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">잔액 흐름</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">{formatAmount(data.net_amount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">거래 수</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
              {data.transaction_count.toLocaleString("ko-KR")}건
            </p>
          </div>
        </div>
        {topCat && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2.5">
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">최고 지출</span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-card)]">
                {topCatIcon && (
                  <IconRenderer
                    providerType={topCatIcon.provider_type}
                    providerKey={topCatIcon.provider_key}
                    size={13}
                    className="text-[var(--color-text-secondary)]"
                  />
                )}
              </div>
              <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                {topCat.category_name}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--color-danger)]">
              {formatAmount(topCat.amount)}
            </span>
          </div>
        )}
      </section>
    </div>
  );
};

function renderTop5Items(
  items: CategoryTopStatisticsData["items"],
  iconMap: Map<number, IconItem>,
  barColor: string
) {
  return items.map((item, idx) => {
    const isOthers = item.rank === null;
    const icon = !isOthers && item.icon_id != null ? iconMap.get(item.icon_id) : undefined;
    return (
      <div key={isOthers ? "others" : (item.category_id ?? idx)}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {!isOthers && (
              <span className="w-4 shrink-0 text-center text-xs font-bold text-[var(--color-text-secondary)]">
                {item.rank}
              </span>
            )}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
              {icon && (
                <IconRenderer
                  providerType={icon.provider_type}
                  providerKey={icon.provider_key}
                  size={15}
                  className="text-[var(--color-text-secondary)]"
                />
              )}
            </div>
            <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {item.category_name}
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
            {formatAmount(item.amount)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, item.ratio)}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-[var(--color-text-secondary)]">
          {item.ratio.toFixed(2)}%
        </p>
      </div>
    );
  });
}

// top5 탭
const Top5Content: React.FC<{
  data: CategoryTopStatisticsData | null;
  incomeData: CategoryTopStatisticsData | null;
  iconMap: Map<number, IconItem>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ data, incomeData, iconMap, isLoading, isError, onRetry }) => {
  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if ((!data || data.items.length === 0) && (!incomeData || incomeData.items.length === 0))
    return <EmptyCard message="선택한 달에 기록된 거래가 없습니다." />;

  return (
    <div className="flex flex-col gap-4">
      {data && data.items.length > 0 && (
      <section className={`${cardClass} p-4`} aria-label="Top 5 카테고리">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Top 5 카테고리</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">지출 기준 상위 카테고리</p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {formatAmount(data.total_expense ?? 0)}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {renderTop5Items(data.items, iconMap, "var(--color-primary)")}
        </div>
      </section>
      )}

      {incomeData && incomeData.items.length > 0 && (incomeData.total_income ?? 0) > 0 && (
      <section className={`${cardClass} p-4`} aria-label="수입 Top 5 카테고리">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">수입 Top 5</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">수입 기준 상위 카테고리</p>
          </div>
          <span className="text-xs font-semibold text-sky-400">
            {formatAmount(incomeData.total_income ?? 0)}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {renderTop5Items(incomeData.items, iconMap, "#38BDF8")}
        </div>
      </section>
      )}
    </div>
  );
};

// heatmap 탭
const HeatmapContent: React.FC<{
  data: CalendarStatisticsData | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ data, isLoading, isError, onRetry }) => {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const expenseMap = React.useMemo(() => {
    const map = new Map<string, number>();
    data?.daily_items.forEach((item) => map.set(item.date, item.expense_amount));
    return map;
  }, [data]);

  const selectedTransactionsQuery = useQuery({
    queryKey: ["transactions", "calendar-day", selectedDate],
    queryFn: () =>
      transactionApi.getTransactions({
        start_date: selectedDate!,
        end_date: selectedDate!,
        transaction_type: "EXPENSE",
        page: 1,
        limit: 100
      }),
    enabled: selectedDate != null,
    staleTime: 30 * 1000
  });
  const selectedTransactions = selectedTransactionsQuery.data?.data?.items ?? [];

  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (!data || data.daily_items.length === 0) return <EmptyCard message="선택한 달에 기록된 지출이 없습니다." />;

  const year = Number(data.month.slice(0, 4));
  const monthIndex = Number(data.month.slice(5, 7)) - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedExpense = selectedDate != null ? (expenseMap.get(selectedDate) ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4`} aria-label="달력 히트맵">
        <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">달력 히트맵</h2>
        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">일별 지출 규모</p>

        <div className="mb-1 grid grid-cols-7 text-center">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span key={d} className="text-xs text-[var(--color-text-secondary)]">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />;
            const dateStr = `${data.month}-${String(day).padStart(2, "0")}`;
            const expense = expenseMap.get(dateStr) ?? 0;
            const intensity = data.max_daily_expense > 0 ? expense / data.max_daily_expense : 0;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg transition ${
                  isSelected ? "ring-2 ring-[var(--color-primary)]" : ""
                }`}
                style={{
                  backgroundColor:
                    intensity > 0
                      ? `rgba(242, 138, 155, ${(0.15 + intensity * 0.85).toFixed(2)})`
                      : "var(--color-bg-secondary)"
                }}
                aria-label={`${day}일${expense > 0 ? ` 지출 ${formatAmount(expense)}` : ""}`}
              >
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{day}</span>
              </button>
            );
          })}
        </div>

        {selectedDate != null && (
          <div className="mt-4 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2 text-sm">
            <div className="mb-2 text-center">
              <span className="text-[var(--color-text-secondary)]">
                {parseInt(selectedDate.slice(8))}일 지출:{" "}
              </span>
              <span className="font-semibold text-[var(--color-danger)]">
                {selectedExpense > 0 ? formatAmount(selectedExpense) : "없음"}
              </span>
            </div>
            {selectedTransactionsQuery.isLoading && (
              <p className="text-center text-xs text-[var(--color-text-secondary)]">
                거래 내역을 불러오는 중입니다.
              </p>
            )}
            {!selectedTransactionsQuery.isLoading && selectedTransactions.length > 0 && (
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {selectedTransactions.map((item: TransactionItem) => (
                  <li
                    key={item.transaction_id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-bg-card)] px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs text-[var(--color-text-primary)]">
                      {item.category_name}/{item.wallet_name}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        item.transaction_type === "EXPENSE"
                          ? "text-[var(--color-danger)]"
                          : "text-blue-500"
                      }`}
                    >
                      {formatSignedAmount(item.amount, item.transaction_type)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

/* ── Sankey 레이아웃 ──────────────────────────────────── */

const SVG_W = 440;
const SVG_MIN_H = 200;
const MAX_SVG_H = 812;
const NODE_W = 120;
const COL_X: [number, number, number] = [5, 160, 315];
const NODE_GAP = 8;
const PAD_V = 12;
const MIN_NODE_H = 16;

const CAT_COLORS = ["#A78BFA", "#34D399", "#FBBF24", "#F472B6", "#38BDF8", "#94A3B8"];
const WALLET_COLORS = ["#60A5FA", "#F87171", "#34D399", "#FBBF24", "#A78BFA", "#38BDF8", "#FB923C"];
const BASE_COLORS: Record<string, string> = {
  total: "#F28A9B"
};

interface SankeyLayoutNode {
  id: string; name: string; value: number;
  x: number; y: number; h: number; color: string;
}
interface SankeyLayoutLink {
  source: string; target: string; value: number;
  path: string; color: string;
}

function getSankeyFlowHeight(categoryCount: number): number {
  const gapTotal = Math.max(0, categoryCount - 1) * NODE_GAP;
  const maxContent = MAX_SVG_H - 2 * PAD_V;
  const available = Math.max(categoryCount * MIN_NODE_H, maxContent - gapTotal);
  return Math.max(28, available);
}

function buildSankeyLayout(
  data: SankeyStatisticsData
): { nodes: SankeyLayoutNode[]; links: SankeyLayoutLink[]; height: number } | null {
  try {
    const { total_expense, nodes, links } = data;
    if (total_expense === 0 || nodes.length === 0) return null;

    const col0 = nodes.filter(n => n.id === "total");
    const col1 = nodes
      .filter(n => n.id.startsWith("w_"))
      .sort((a, b) => b.value - a.value);
    const col2 = nodes
      .filter(n => n.id.startsWith("cat_") && n.id !== "cat_other" && n.value > 0)
      .sort((a, b) => b.value - a.value);

    const maxColLen = Math.max(col0.length, col1.length, col2.length);
    const minRequiredH = maxColLen * MIN_NODE_H + Math.max(0, maxColLen - 1) * NODE_GAP + 2 * PAD_V;
    const svgHeight = Math.max(SVG_MIN_H, Math.min(MAX_SVG_H, minRequiredH));
    const scale = Math.max(0.001, getSankeyFlowHeight(col2.length) / total_expense);

    function positionCol(
      colNodes: typeof nodes,
      colIdx: 0 | 1 | 2
    ): SankeyLayoutNode[] {
      let y = PAD_V;
      return colNodes.map((n, i) => {
        const h = Math.max(MIN_NODE_H, n.value * scale);
        const color =
          colIdx === 2
            ? CAT_COLORS[i % CAT_COLORS.length]
            : colIdx === 1
              ? WALLET_COLORS[i % WALLET_COLORS.length]
              : (BASE_COLORS[n.id] ?? "#94A3B8");
        const node: SankeyLayoutNode = {
          id: n.id, name: n.name, value: n.value,
          x: COL_X[colIdx], y, h, color
        };
        y += h + NODE_GAP;
        return node;
      });
    }

    let layoutNodes: SankeyLayoutNode[] = [
      ...positionCol(col0, 0),
      ...positionCol(col1, 1),
      ...positionCol(col2, 2)
    ];

    // 실제 컨텐츠 높이 계산 후 MIN_NODE_H를 보장하며 압축
    const rawContentH = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.h), PAD_V);
    const rawHeight = Math.max(svgHeight, rawContentH + PAD_V);
    let linkScale = scale;
    if (rawHeight > MAX_SVG_H) {
      const sFactor = (MAX_SVG_H - 2 * PAD_V) / (rawContentH - PAD_V);
      layoutNodes = layoutNodes.map(n => ({
        ...n,
        y: PAD_V + (n.y - PAD_V) * sFactor,
        h: Math.max(MIN_NODE_H, n.h * sFactor)
      }));
      linkScale = scale * sFactor;
    }
    // 압축 후 실제 높이 재계산 (MIN_NODE_H 클램핑으로 늘어날 수 있음)
    const clampedContentH = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.h), PAD_V);
    const finalHeight = Math.max(SVG_MIN_H, clampedContentH + PAD_V);

    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
    const srcUsed = new Map(layoutNodes.map(n => [n.id, 0]));
    const tgtUsed = new Map(layoutNodes.map(n => [n.id, 0]));

    const layoutLinks: SankeyLayoutLink[] = [];
    for (const lk of links) {
      if (lk.source === "cat_other" || lk.target === "cat_other") continue;
      const src = nodeMap.get(lk.source);
      const tgt = nodeMap.get(lk.target);
      if (!src || !tgt) continue;

      const lh = Math.max(2, lk.value * linkScale);
      const sy = src.y + (srcUsed.get(lk.source) ?? 0);
      const ty = tgt.y + (tgtUsed.get(lk.target) ?? 0);
      srcUsed.set(lk.source, (srcUsed.get(lk.source) ?? 0) + lh);
      tgtUsed.set(lk.target, (tgtUsed.get(lk.target) ?? 0) + lh);

      const x1 = src.x + NODE_W;
      const x2 = tgt.x;
      const mx = (x1 + x2) / 2;
      const path =
        `M${x1},${sy} C${mx},${sy} ${mx},${ty} ${x2},${ty}` +
        ` L${x2},${ty + lh} C${mx},${ty + lh} ${mx},${sy + lh} ${x1},${sy + lh}Z`;

      const color = lk.source === "total" ? (tgt.color) : src.color;
      layoutLinks.push({ source: lk.source, target: lk.target, value: lk.value, path, color });
    }

    return { nodes: layoutNodes, links: layoutLinks, height: finalHeight };
  } catch {
    return null;
  }
}

function truncateLabel(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// sankey 탭
const SankeyContent: React.FC<{
  data: SankeyStatisticsData | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ data, isLoading, isError, onRetry }) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const layout = React.useMemo(
    () => (data ? buildSankeyLayout(data) : null),
    [data]
  );

  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (!data || data.total_expense === 0 || !layout)
    return <EmptyCard message="선택한 달에 지출 데이터가 없습니다." />;

  const total = data.total_expense;

  const selectedNode = layout.nodes.find(n => n.id === selectedId);
  const selectedLinkKey = selectedNode ? null : selectedId;
  const selectedLink = selectedLinkKey
    ? layout.links.find(l => `${l.source}→${l.target}` === selectedLinkKey)
    : undefined;

  function handleNodeClick(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(prev => (prev === id ? null : id));
  }

  function handleLinkClick(lk: SankeyLayoutLink, e: React.MouseEvent) {
    e.stopPropagation();
    const key = `${lk.source}→${lk.target}`;
    setSelectedId(prev => (prev === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4`} aria-label="지출 흐름 Sankey 다이어그램">
        <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">지출 흐름</h2>
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          총 지출 → 지갑 → 카테고리 · 노드/링크 터치 시 상세 표시
        </p>

        {/* 컬럼 헤더 */}
        <div className="mb-1 flex justify-between text-[10px] font-semibold text-[var(--color-text-secondary)]">
          <span>총 지출</span>
          <span>지갑</span>
          <span>카테고리</span>
        </div>

        <div>
          <svg
            viewBox={`0 0 ${SVG_W} ${layout.height}`}
            width="100%"
            style={{ display: "block", height: `${layout.height}px` }}
            role="img"
            aria-label="지출 흐름 Sankey 차트"
            onClick={() => setSelectedId(null)}
          >
            {/* 링크 (노드 아래 레이어) */}
            {layout.links.map(lk => {
              const key = `${lk.source}→${lk.target}`;
              const isSel = selectedId === key;
              return (
                <path
                  key={key}
                  d={lk.path}
                  fill={lk.color}
                  fillOpacity={isSel ? 0.75 : 0.35}
                  style={{ cursor: "pointer" }}
                  onClick={e => handleLinkClick(lk, e)}
                >
                  <title>{`${lk.source} → ${lk.target}: ${formatAmount(lk.value)}`}</title>
                </path>
              );
            })}

            {/* 노드 */}
            {layout.nodes.map(node => {
              const isSel = selectedId === node.id;
              const showName = node.h >= MIN_NODE_H;
              const showRatio = node.h >= 30;
              const ratio = ((node.value / total) * 100).toFixed(1);
              const maxChars = Math.floor(NODE_W / 8);

              return (
                <g
                  key={node.id}
                  onClick={e => handleNodeClick(node.id, e)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NODE_W}
                    height={node.h}
                    fill={node.color}
                    fillOpacity={isSel ? 1 : 0.88}
                    rx={3}
                    stroke={isSel ? "#fff" : "none"}
                    strokeWidth={1.5}
                  />
                  {showName && (
                    <text
                      x={node.x + NODE_W / 2}
                      y={node.y + (showRatio ? node.h / 2 - 4 : node.h / 2 + 4)}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="700"
                      fill="#fff"
                      style={{ userSelect: "none", pointerEvents: "none" }}
                    >
                      {truncateLabel(node.name, maxChars)}
                    </text>
                  )}
                  {showRatio && (
                    <text
                      x={node.x + NODE_W / 2}
                      y={node.y + node.h / 2 + 9}
                      textAnchor="middle"
                      fontSize={8}
                      fill="rgba(255,255,255,0.85)"
                      style={{ userSelect: "none", pointerEvents: "none" }}
                    >
                      {ratio}%
                    </text>
                  )}
                  <title>{`${node.name}: ${formatAmount(node.value)} (${ratio}%)`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 선택 정보 패널 */}
        {(selectedNode ?? selectedLink) && (
          <div className="mt-3 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2.5">
            {selectedNode && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: selectedNode.color }}
                  />
                  <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {selectedNode.name}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatAmount(selectedNode.value)}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {((selectedNode.value / total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
            {selectedLink && (() => {
              const srcNode = layout.nodes.find(n => n.id === selectedLink.source);
              const tgtNode = layout.nodes.find(n => n.id === selectedLink.target);
              return (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-[var(--color-text-secondary)]">
                    {srcNode?.name} → {tgtNode?.name}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {formatAmount(selectedLink.value)}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {((selectedLink.value / total) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
};

const INCOME_BASE_COLORS: Record<string, string> = {
  total: "#38BDF8"
};
const INCOME_WALLET_COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#38BDF8", "#FB923C", "#F472B6"];

function buildIncomeSankeyLayout(
  data: SankeyIncomeStatisticsData
): { nodes: SankeyLayoutNode[]; links: SankeyLayoutLink[]; height: number } | null {
  try {
    const { total_income, nodes, links } = data;
    if (total_income === 0 || nodes.length === 0) return null;

    const col0 = nodes.filter(n => n.id === "total");
    const col1 = nodes
      .filter(n => n.id.startsWith("w_"))
      .sort((a, b) => b.value - a.value);
    const col2 = nodes
      .filter(n => n.id.startsWith("cat_") && n.id !== "cat_other" && n.value > 0)
      .sort((a, b) => b.value - a.value);

    if (col0.length === 0 || col1.length === 0) return null;

    const maxColLen = Math.max(col0.length, col1.length, col2.length);
    const minRequiredH = maxColLen * MIN_NODE_H + Math.max(0, maxColLen - 1) * NODE_GAP + 2 * PAD_V;
    const svgHeight = Math.max(SVG_MIN_H, Math.min(MAX_SVG_H, minRequiredH));
    const scale = Math.max(0.001, getSankeyFlowHeight(col2.length) / total_income);

    function positionCol(
      colNodes: typeof nodes,
      colIdx: 0 | 1 | 2
    ): SankeyLayoutNode[] {
      let y = PAD_V;
      return colNodes.map((n, i) => {
        const h = Math.max(MIN_NODE_H, n.value * scale);
        const color =
          colIdx === 2
            ? CAT_COLORS[i % CAT_COLORS.length]
            : colIdx === 1
              ? INCOME_WALLET_COLORS[i % INCOME_WALLET_COLORS.length]
              : (INCOME_BASE_COLORS[n.id] ?? "#94A3B8");
        const node: SankeyLayoutNode = {
          id: n.id, name: n.name, value: n.value,
          x: COL_X[colIdx], y, h, color
        };
        y += h + NODE_GAP;
        return node;
      });
    }

    let layoutNodes: SankeyLayoutNode[] = [
      ...positionCol(col0, 0),
      ...positionCol(col1, 1),
      ...positionCol(col2, 2)
    ];

    // 실제 컨텐츠 높이 계산 후 MIN_NODE_H를 보장하며 압축
    const rawContentH = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.h), PAD_V);
    const rawHeight = Math.max(svgHeight, rawContentH + PAD_V);
    let linkScale = scale;
    if (rawHeight > MAX_SVG_H) {
      const sFactor = (MAX_SVG_H - 2 * PAD_V) / (rawContentH - PAD_V);
      layoutNodes = layoutNodes.map(n => ({
        ...n,
        y: PAD_V + (n.y - PAD_V) * sFactor,
        h: Math.max(MIN_NODE_H, n.h * sFactor)
      }));
      linkScale = scale * sFactor;
    }
    // 압축 후 실제 높이 재계산 (MIN_NODE_H 클램핑으로 늘어날 수 있음)
    const clampedContentH = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.h), PAD_V);
    const finalHeight = Math.max(SVG_MIN_H, clampedContentH + PAD_V);

    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
    const srcUsed = new Map(layoutNodes.map(n => [n.id, 0]));
    const tgtUsed = new Map(layoutNodes.map(n => [n.id, 0]));

    const layoutLinks: SankeyLayoutLink[] = [];
    for (const lk of links) {
      if (lk.source === "cat_other" || lk.target === "cat_other") continue;
      const src = nodeMap.get(lk.source);
      const tgt = nodeMap.get(lk.target);
      if (!src || !tgt) continue;

      const lh = Math.max(2, lk.value * linkScale);
      const sy = src.y + (srcUsed.get(lk.source) ?? 0);
      const ty = tgt.y + (tgtUsed.get(lk.target) ?? 0);
      srcUsed.set(lk.source, (srcUsed.get(lk.source) ?? 0) + lh);
      tgtUsed.set(lk.target, (tgtUsed.get(lk.target) ?? 0) + lh);

      const x1 = src.x + NODE_W;
      const x2 = tgt.x;
      const mx = (x1 + x2) / 2;
      const path =
        `M${x1},${sy} C${mx},${sy} ${mx},${ty} ${x2},${ty}` +
        ` L${x2},${ty + lh} C${mx},${ty + lh} ${mx},${sy + lh} ${x1},${sy + lh}Z`;

      const color = lk.source === "total" ? tgt.color : src.color;
      layoutLinks.push({ source: lk.source, target: lk.target, value: lk.value, path, color });
    }

    return { nodes: layoutNodes, links: layoutLinks, height: finalHeight };
  } catch {
    return null;
  }
}

// 수입 흐름 탭
const IncomeSankeyContent: React.FC<{
  data: SankeyIncomeStatisticsData | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}> = ({ data, isLoading, isError, onRetry }) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const layout = React.useMemo(
    () => (data ? buildIncomeSankeyLayout(data) : null),
    [data]
  );

  if (isLoading) return <TabSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (!data || data.total_income === 0 || !layout)
    return <EmptyCard message="선택한 달에 수입 데이터가 없습니다." />;

  const total = data.total_income;

  const selectedNode = layout.nodes.find(n => n.id === selectedId);
  const selectedLinkKey = selectedNode ? null : selectedId;
  const selectedLink = selectedLinkKey
    ? layout.links.find(l => `${l.source}→${l.target}` === selectedLinkKey)
    : undefined;

  function handleNodeClick(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(prev => (prev === id ? null : id));
  }

  function handleLinkClick(lk: SankeyLayoutLink, e: React.MouseEvent) {
    e.stopPropagation();
    const key = `${lk.source}→${lk.target}`;
    setSelectedId(prev => (prev === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4`} aria-label="수입 흐름 Sankey 다이어그램">
        <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">수입 흐름</h2>
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          총 수입 → 지갑 → 카테고리 · 노드/링크 터치 시 상세 표시
        </p>

        <div className="mb-1 flex justify-between text-[10px] font-semibold text-[var(--color-text-secondary)]">
          <span>총 수입</span>
          <span>지갑</span>
          <span>카테고리</span>
        </div>

        <div>
          <svg
            viewBox={`0 0 ${SVG_W} ${layout.height}`}
            width="100%"
            style={{ display: "block", height: `${layout.height}px` }}
            role="img"
            aria-label="수입 흐름 Sankey 차트"
            onClick={() => setSelectedId(null)}
          >
            {layout.links.map(lk => {
              const key = `${lk.source}→${lk.target}`;
              const isSel = selectedId === key;
              return (
                <path
                  key={key}
                  d={lk.path}
                  fill={lk.color}
                  fillOpacity={isSel ? 0.75 : 0.35}
                  style={{ cursor: "pointer" }}
                  onClick={e => handleLinkClick(lk, e)}
                >
                  <title>{`${lk.source} → ${lk.target}: ${formatAmount(lk.value)}`}</title>
                </path>
              );
            })}

            {layout.nodes.map(node => {
              const isSel = selectedId === node.id;
              const showName = node.h >= MIN_NODE_H;
              const showRatio = node.h >= 30;
              const ratio = ((node.value / total) * 100).toFixed(1);
              const maxChars = Math.floor(NODE_W / 8);

              return (
                <g
                  key={node.id}
                  onClick={e => handleNodeClick(node.id, e)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NODE_W}
                    height={node.h}
                    fill={node.color}
                    fillOpacity={isSel ? 1 : 0.88}
                    rx={3}
                    stroke={isSel ? "#fff" : "none"}
                    strokeWidth={1.5}
                  />
                  {showName && (
                    <text
                      x={node.x + NODE_W / 2}
                      y={node.y + (showRatio ? node.h / 2 - 4 : node.h / 2 + 4)}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="700"
                      fill="#fff"
                      style={{ userSelect: "none", pointerEvents: "none" }}
                    >
                      {truncateLabel(node.name, maxChars)}
                    </text>
                  )}
                  {showRatio && (
                    <text
                      x={node.x + NODE_W / 2}
                      y={node.y + node.h / 2 + 9}
                      textAnchor="middle"
                      fontSize={8}
                      fill="rgba(255,255,255,0.85)"
                      style={{ userSelect: "none", pointerEvents: "none" }}
                    >
                      {ratio}%
                    </text>
                  )}
                  <title>{`${node.name}: ${formatAmount(node.value)} (${ratio}%)`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {(selectedNode ?? selectedLink) && (
          <div className="mt-3 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2.5">
            {selectedNode && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: selectedNode.color }}
                  />
                  <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {selectedNode.name}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatAmount(selectedNode.value)}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {((selectedNode.value / total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
            {selectedLink && (() => {
              const srcNode = layout.nodes.find(n => n.id === selectedLink.source);
              const tgtNode = layout.nodes.find(n => n.id === selectedLink.target);
              return (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-[var(--color-text-secondary)]">
                    {srcNode?.name} → {tgtNode?.name}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {formatAmount(selectedLink.value)}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {((selectedLink.value / total) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
};

/* ── 메인 페이지 ───────────────────────────────────────── */

const StatisticsPage: React.FC = () => {
  const today = React.useMemo(() => new Date(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [baseDate, setBaseDate] = React.useState(today);
  const isOffline = !navigator.onLine;

  // 탭 상태
  const rawTab = searchParams.get("tab") ?? "spending";
  const activeTab: StatTab = (["spending", "summary", "top5", "heatmap", "sankey", "income-sankey"] as const).includes(
    rawTab as StatTab
  )
    ? (rawTab as StatTab)
    : "spending";

  // 소비통계 탭 월/주 모드
  const rawMode = searchParams.get("mode") ?? "MONTH";
  const viewMode: ViewMode = rawMode === "WEEK" ? "WEEK" : "MONTH";

  const monthValue = formatMonthValue(baseDate);
  const weekRange = getWeekRange(baseDate);

  /* ── 쿼리 ── */
  const monthlyQuery = useQuery({
    queryKey: ["statistics", "monthly", monthValue],
    queryFn: () => statisticsApi.getMonthlyStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "spending" && viewMode === "MONTH"
  });

  const periodQuery = useQuery({
    queryKey: ["statistics", "period", weekRange.start, weekRange.end],
    queryFn: () =>
      statisticsApi.getPeriodStatistics({
        start_date: weekRange.start,
        end_date: weekRange.end,
        group_by: "DAY"
      }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "spending" && viewMode === "WEEK"
  });

  const summaryQuery = useQuery({
    queryKey: ["statistics", "summary", monthValue],
    queryFn: () => statisticsApi.getSummaryStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "summary"
  });

  // top5: 월별은 category-top 엔드포인트, 주별은 category 엔드포인트(날짜 범위 지원)
  const categoryTopMonthQuery = useQuery({
    queryKey: ["statistics", "category-top", monthValue],
    queryFn: () => statisticsApi.getCategoryTopStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "top5" && viewMode === "MONTH"
  });

  const categoryTopWeekQuery = useQuery({
    queryKey: ["statistics", "category-week", weekRange.start, weekRange.end],
    queryFn: () =>
      statisticsApi.getCategoryStatistics({
        start_date: weekRange.start,
        end_date: weekRange.end,
        transaction_type: "EXPENSE",
        limit: 5
      }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "top5" && viewMode === "WEEK"
  });

  const calendarQuery = useQuery({
    queryKey: ["statistics", "calendar", monthValue],
    queryFn: () => statisticsApi.getCalendarStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "heatmap"
  });

  const sankeyQuery = useQuery({
    queryKey: ["statistics", "sankey", monthValue],
    queryFn: () => statisticsApi.getSankeyStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "sankey"
  });

  const sankeyIncomeQuery = useQuery({
    queryKey: ["statistics", "sankey-income", monthValue],
    queryFn: () => statisticsApi.getSankeyIncomeStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "income-sankey"
  });

  const categoryTopIncomeMonthQuery = useQuery({
    queryKey: ["statistics", "category-top-income", monthValue],
    queryFn: () =>
      statisticsApi.getCategoryTopStatistics({ month: monthValue, transaction_type: "INCOME" }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: activeTab === "top5" && viewMode === "MONTH"
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

  /* ── top5 탭 데이터 준비 ── */
  const top5Data =
    viewMode === "MONTH"
      ? (categoryTopMonthQuery.data?.data ?? null)
      : (() => {
          const weekCat = categoryTopWeekQuery.data?.data;
          if (!weekCat) return null;
          return {
            month: weekRange.start.slice(0, 7),
            total_expense: weekCat.total_amount,
            items: weekCat.items.map((item, idx) => ({
              rank: idx + 1,
              category_id: item.category_id,
              category_name: item.category_name,
              icon_id: item.icon_id,
              amount: item.amount,
              ratio: item.ratio
            }))
          } as import("../../entities/statistics/model/statistics.types").CategoryTopStatisticsData;
        })();

  const top5IsLoading =
    viewMode === "MONTH" ? categoryTopMonthQuery.isLoading : categoryTopWeekQuery.isLoading;
  const top5IsError =
    viewMode === "MONTH" ? categoryTopMonthQuery.isError : categoryTopWeekQuery.isError;

  /* ── spending 탭 데이터 준비 ── */
  const monthly = monthlyQuery.data?.data ?? null;
  const period = periodQuery.data?.data ?? null;
  const activeSpendingData = viewMode === "MONTH" ? monthly : period;

  const chartItems =
    viewMode === "MONTH"
      ? toChartItems(monthly?.daily_items ?? [])
      : toPeriodChartItems(period?.items ?? []);

  const spendingIsLoading = viewMode === "MONTH" ? monthlyQuery.isLoading : periodQuery.isLoading;

  const spendingIsError =
    (viewMode === "MONTH" ? monthlyQuery.isError : periodQuery.isError) && !activeSpendingData;

  const hasChartData = chartItems.some((i) => i.incomeAmount > 0 || i.expenseAmount > 0);
  const spendingIsEmpty = !spendingIsLoading && !spendingIsError && !hasChartData;

  /* ── 네비게이터 ── */
  // spending·top5 탭에서 주별 모드일 때만 주간 네비게이터 표시
  const isMonthNav = !(viewMode === "WEEK" && (activeTab === "spending" || activeTab === "top5"));
  const periodLabel = isMonthNav ? formatMonthLabel(baseDate) : formatWeekLabel(weekRange);

  const isCurrentPeriod = isMonthNav
    ? baseDate.getFullYear() === today.getFullYear() && baseDate.getMonth() === today.getMonth()
    : weekRange.start === getWeekRange(today).start;

  function movePeriod(dir: -1 | 1) {
    setBaseDate((cur) => {
      const next = new Date(cur);
      if (!isMonthNav) {
        next.setDate(cur.getDate() + dir * 7);
      } else {
        next.setMonth(cur.getMonth() + dir);
      }
      return next > today ? cur : next;
    });
  }

  /* ── 탭 전환 ── */
  function handleTabChange(tab: StatTab) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  }

  function handleViewModeChange(mode: ViewMode) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("mode", mode);
      return next;
    }, { replace: true });
  }

  /* ── 새로고침 ── */
  function refresh() {
    switch (activeTab) {
      case "spending":
        if (viewMode === "MONTH") void monthlyQuery.refetch();
        else void periodQuery.refetch();
        break;
      case "summary":
        void summaryQuery.refetch();
        break;
      case "top5":
        if (viewMode === "MONTH") void categoryTopMonthQuery.refetch();
        else void categoryTopWeekQuery.refetch();
        break;
      case "heatmap":
        void calendarQuery.refetch();
        break;
      case "sankey":
        void sankeyQuery.refetch();
        break;
      case "income-sankey":
        void sankeyIncomeQuery.refetch();
        break;
    }
  }

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">통계</h1>
          <button
            type="button"
            onClick={refresh}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)]"
            aria-label="통계 새로고침"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* 오프라인 배너 */}
        {isOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 마지막으로 불러온 통계를 표시합니다.</span>
          </div>
        )}

        {/* 통계 유형 탭 (가로 스크롤 pill) */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[var(--color-primary)] text-[var(--color-text-primary)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]"
                }`}
                aria-pressed={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 소비통계·Top5 탭: 월별/주별 토글 */}
        {(activeTab === "spending" || activeTab === "top5") && (
          <div className="mb-3 grid grid-cols-2 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1">
            {(["MONTH", "WEEK"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewModeChange(mode)}
                className={`min-h-10 rounded-xl text-sm font-semibold transition ${
                  viewMode === mode
                    ? "bg-[var(--color-primary)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {mode === "MONTH" ? "월별" : "주별"}
              </button>
            ))}
          </div>
        )}

        {/* 기간 네비게이터 */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 shadow-[0_4px_16px_var(--color-card-shadow)]">
          <button
            type="button"
            onClick={() => movePeriod(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="이전 기간"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)]">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={() => movePeriod(1)}
            disabled={isCurrentPeriod}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
            aria-label="다음 기간"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "spending" && (
          <SpendingContent
            viewMode={viewMode}
            chartItems={chartItems}
            incomeAmount={activeSpendingData?.income_amount ?? 0}
            expenseAmount={activeSpendingData?.expense_amount ?? 0}
            netAmount={activeSpendingData?.net_amount ?? 0}
            transactionCount={
              viewMode === "MONTH"
                ? (monthly?.transaction_count ?? 0)
                : (period?.items.reduce((s, i) => s + i.transaction_count, 0) ?? 0)
            }
            isLoading={spendingIsLoading}
            isError={spendingIsError}
            isEmpty={spendingIsEmpty}
            onRetry={refresh}
          />
        )}

        {activeTab === "summary" && (
          <SummaryContent
            data={summaryQuery.data?.data ?? null}
            iconMap={iconMap}
            isLoading={summaryQuery.isLoading}
            isError={summaryQuery.isError}
            onRetry={refresh}
          />
        )}

        {activeTab === "top5" && (
          <Top5Content
            data={top5Data}
            incomeData={viewMode === "MONTH" ? (categoryTopIncomeMonthQuery.data?.data ?? null) : null}
            iconMap={iconMap}
            isLoading={top5IsLoading}
            isError={top5IsError}
            onRetry={refresh}
          />
        )}

        {activeTab === "heatmap" && (
          <HeatmapContent
            data={calendarQuery.data?.data ?? null}
            isLoading={calendarQuery.isLoading}
            isError={calendarQuery.isError}
            onRetry={refresh}
          />
        )}

        {activeTab === "sankey" && (
          <SankeyContent
            data={sankeyQuery.data?.data ?? null}
            isLoading={sankeyQuery.isLoading}
            isError={sankeyQuery.isError}
            onRetry={refresh}
          />
        )}

        {activeTab === "income-sankey" && (
          <IncomeSankeyContent
            data={sankeyIncomeQuery.data?.data ?? null}
            isLoading={sankeyIncomeQuery.isLoading}
            isError={sankeyIncomeQuery.isError}
            onRetry={refresh}
          />
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
