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
import type {
  CalendarStatisticsData,
  CategoryTopStatisticsData,
  MonthlyDailyItem,
  PeriodStatisticsItem,
  SummaryStatisticsData
} from "../../entities/statistics/model/statistics.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip);

type ViewMode = "MONTH" | "WEEK";

interface ChartItem {
  label: string;
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

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    start: toDateValue(new Date(year, month, 1)),
    end: toDateValue(new Date(year, month + 1, 0))
  };
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

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatPeriodLabel(mode: ViewMode, date: Date, range: { start: string; end: string }) {
  if (mode === "MONTH") return formatMonthLabel(date);

  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

function toChartItems(items: MonthlyDailyItem[]): ChartItem[] {
  return items.map((item) => ({
    label: item.date.slice(8),
    expenseAmount: item.expense_amount
  }));
}

function toPeriodChartItems(items: PeriodStatisticsItem[]): ChartItem[] {
  return items.map((item) => {
    const date = new Date(`${item.period}T00:00:00`);
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      expenseAmount: item.expense_amount
    };
  });
}

const SpendingChart: React.FC<{ items: ChartItem[] }> = ({ items }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return undefined;

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            label: "지출",
            data: items.map((item) => item.expenseAmount),
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
              label: (context) => `지출 ${formatAmount(Number(context.parsed.y))}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#6F5B67", maxTicksLimit: 6 }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#F8DDF0" },
            ticks: {
              color: "#6F5B67",
              callback: (value) => Number(value).toLocaleString("ko-KR")
            }
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

const MonthlySummaryCard: React.FC<{
  data: SummaryStatisticsData;
  iconMap: Map<number, IconItem>;
}> = ({ data, iconMap }) => {
  const topCat = data.top_category;
  const topCatIcon = topCat?.icon_id != null ? iconMap.get(topCat.icon_id) : undefined;

  return (
    <section className={`${cardClass} p-4`} aria-label="월간 요약">
      <h2 className="mb-3 text-base font-bold text-[var(--color-text-primary)]">월간 요약</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">수입</p>
          <p className="mt-1 text-lg font-bold text-sky-400">{formatAmount(data.income_amount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">지출</p>
          <p className="mt-1 text-lg font-bold text-[var(--color-danger)]">
            {formatAmount(data.expense_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">잔액 흐름</p>
          <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
            {formatAmount(data.net_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">거래 수</p>
          <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
            {data.transaction_count.toLocaleString("ko-KR")}건
          </p>
        </div>
      </div>
      {topCat && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2">
          <p className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
            최고 지출
          </p>
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
  );
};

const CategoryTopSection: React.FC<{
  data: CategoryTopStatisticsData;
  iconMap: Map<number, IconItem>;
}> = ({ data, iconMap }) => {
  return (
    <section className={`${cardClass} p-4`} aria-label="Top 5 카테고리">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Top 5 카테고리</h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">지출 기준 상위 카테고리</p>
        </div>
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {formatAmount(data.total_expense)}
        </span>
      </div>
      {data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((item, idx) => {
            const isOthers = item.rank === null;
            const icon = !isOthers && item.icon_id != null ? iconMap.get(item.icon_id) : undefined;
            return (
              <div key={isOthers ? "cat-others" : (item.category_id ?? idx)}>
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
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${Math.min(100, item.ratio)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-[var(--color-text-secondary)]">
                  {item.ratio.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--color-bg-secondary)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          카테고리별 소비 데이터가 없습니다.
        </div>
      )}
    </section>
  );
};

const CalendarHeatmap: React.FC<{ data: CalendarStatisticsData }> = ({ data }) => {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const expenseMap = React.useMemo(() => {
    const map = new Map<string, number>();
    data.daily_items.forEach((item) => map.set(item.date, item.expense_amount));
    return map;
  }, [data.daily_items]);

  const year = Number(data.month.slice(0, 4));
  const monthIndex = Number(data.month.slice(5, 7)) - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedExpense = selectedDate != null ? (expenseMap.get(selectedDate) ?? 0) : 0;

  return (
    <section className={`${cardClass} p-4`} aria-label="달력 히트맵">
      <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">달력 히트맵</h2>
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">일별 지출 규모</p>

      <div className="mb-1 grid grid-cols-7 text-center">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d} className="text-xs text-[var(--color-text-secondary)]">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dateStr = `${data.month}-${String(day).padStart(2, "0")}`;
          const expense = expenseMap.get(dateStr) ?? 0;
          const intensity =
            data.max_daily_expense > 0 ? expense / data.max_daily_expense : 0;
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
        <div className="mt-3 rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2 text-center text-sm">
          <span className="text-[var(--color-text-secondary)]">{parseInt(selectedDate.slice(8))}일 지출: </span>
          <span className="font-semibold text-[var(--color-danger)]">
            {selectedExpense > 0 ? formatAmount(selectedExpense) : "없음"}
          </span>
        </div>
      )}
    </section>
  );
};

const StatisticsSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4" aria-label="통계 데이터를 불러오는 중입니다.">
    <div className={`${cardClass} p-4`} aria-hidden="true">
      <div className="mb-3 h-4 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
      <div className="h-[220px] rounded-xl bg-[var(--color-bg-secondary)]" />
    </div>
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`${cardClass} h-24 p-4`}>
          <div className="mb-3 h-3 w-16 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-5 w-24 rounded-lg bg-[var(--color-bg-secondary)]" />
        </div>
      ))}
    </div>
  </div>
);

const StatisticsPage: React.FC = () => {
  const today = React.useMemo(() => new Date(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get("mode");
  const viewMode: ViewMode = rawMode === "WEEK" ? "WEEK" : "MONTH";
  const setViewMode = (next: ViewMode) => setSearchParams({ mode: next }, { replace: true });
  const [baseDate, setBaseDate] = React.useState(today);
  const isOffline = !navigator.onLine;
  const monthValue = formatMonthValue(baseDate);
  const range = viewMode === "MONTH" ? getMonthRange(baseDate) : getWeekRange(baseDate);

  const monthlyQuery = useQuery({
    queryKey: ["statistics", "monthly", monthValue],
    queryFn: () => statisticsApi.getMonthlyStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "MONTH"
  });

  const summaryQuery = useQuery({
    queryKey: ["statistics", "summary", monthValue],
    queryFn: () => statisticsApi.getSummaryStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "MONTH"
  });

  const categoryTopQuery = useQuery({
    queryKey: ["statistics", "category-top", monthValue],
    queryFn: () => statisticsApi.getCategoryTopStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "MONTH"
  });

  const calendarQuery = useQuery({
    queryKey: ["statistics", "calendar", monthValue],
    queryFn: () => statisticsApi.getCalendarStatistics({ month: monthValue }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "MONTH"
  });

  const periodQuery = useQuery({
    queryKey: ["statistics", "period", range.start, range.end],
    queryFn: () =>
      statisticsApi.getPeriodStatistics({
        start_date: range.start,
        end_date: range.end,
        group_by: "DAY"
      }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "WEEK"
  });

  const categoryQuery = useQuery({
    queryKey: ["statistics", "category", range.start, range.end],
    queryFn: () =>
      statisticsApi.getCategoryStatistics({
        start_date: range.start,
        end_date: range.end,
        transaction_type: "EXPENSE",
        limit: 5
      }),
    staleTime: 30 * 1000,
    retry: isOffline ? false : 2,
    enabled: viewMode === "WEEK"
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

  const monthly = monthlyQuery.data?.data ?? null;
  const period = periodQuery.data?.data ?? null;
  const category = categoryQuery.data?.data ?? null;
  const summaryStats = summaryQuery.data?.data ?? null;
  const categoryTop = categoryTopQuery.data?.data ?? null;
  const calendarData = calendarQuery.data?.data ?? null;

  const chartItems =
    viewMode === "MONTH"
      ? toChartItems(monthly?.daily_items ?? [])
      : toPeriodChartItems(period?.items ?? []);
  const hasChartData = chartItems.some((item) => item.expenseAmount > 0);

  const isLoading =
    viewMode === "MONTH"
      ? monthlyQuery.isLoading
      : periodQuery.isLoading || categoryQuery.isLoading;

  const isError =
    viewMode === "MONTH"
      ? monthlyQuery.isError && !monthly
      : (periodQuery.isError && !period) || (categoryQuery.isError && !category);

  const isEmpty =
    !isLoading &&
    !isError &&
    !hasChartData &&
    (viewMode === "MONTH"
      ? (categoryTop?.items.length ?? 0) === 0
      : (category?.items.length ?? 0) === 0);

  const isCurrentPeriod =
    viewMode === "MONTH"
      ? baseDate.getFullYear() === today.getFullYear() && baseDate.getMonth() === today.getMonth()
      : getWeekRange(baseDate).start === getWeekRange(today).start;

  function movePeriod(direction: -1 | 1) {
    setBaseDate((current) => {
      const next = new Date(current);
      if (viewMode === "MONTH") {
        next.setMonth(current.getMonth() + direction);
      } else {
        next.setDate(current.getDate() + direction * 7);
      }
      return next > today ? current : next;
    });
  }

  function refresh() {
    if (viewMode === "MONTH") {
      void monthlyQuery.refetch();
      void summaryQuery.refetch();
      void categoryTopQuery.refetch();
      void calendarQuery.refetch();
    } else {
      void periodQuery.refetch();
      void categoryQuery.refetch();
    }
  }

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">
        <div className="mb-6 flex items-center justify-between">
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

        {isOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <WifiOff size={16} />
            <span>오프라인 상태입니다. 마지막으로 불러온 통계를 표시합니다.</span>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-1">
          {(["MONTH", "WEEK"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
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

        <div className={`${cardClass} mb-4 flex items-center justify-between px-4 py-3`}>
          <button
            type="button"
            onClick={() => movePeriod(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="이전 기간"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)]">
            {formatPeriodLabel(viewMode, baseDate, range)}
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

        {isLoading && <StatisticsSkeleton />}

        {isError && (
          <div
            className={`${cardClass} flex flex-col items-center gap-3 px-6 py-10 text-center`}
            role="alert"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">
              통계 데이터를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        )}

        {isEmpty && (
          <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
            <p className="text-base font-medium text-[var(--color-text-primary)]">
              통계 데이터가 없습니다
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              선택한 달에 기록된 지출이 없습니다.
            </p>
          </div>
        )}

        {!isLoading && !isError && !isEmpty && (
          <div className="flex flex-col gap-4">
            {viewMode === "MONTH" ? (
              <>
                {summaryQuery.isLoading ? (
                  <div className={`${cardClass} h-36 animate-pulse p-4`} aria-hidden="true" />
                ) : (
                  summaryStats && (
                    <MonthlySummaryCard data={summaryStats} iconMap={iconMap} />
                  )
                )}

                <section className={`${cardClass} p-4`}>
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                      소비 흐름
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      선택한 기간의 지출 금액 기준
                    </p>
                  </div>
                  {hasChartData ? (
                    <SpendingChart items={chartItems} />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] px-4 text-center text-sm text-[var(--color-text-secondary)]">
                      차트로 표시할 지출 데이터가 없습니다.
                    </div>
                  )}
                </section>

                {categoryTopQuery.isLoading ? (
                  <div className={`${cardClass} h-32 animate-pulse p-4`} aria-hidden="true" />
                ) : (
                  categoryTop && <CategoryTopSection data={categoryTop} iconMap={iconMap} />
                )}

                {calendarQuery.isLoading ? (
                  <div className={`${cardClass} h-48 animate-pulse p-4`} aria-hidden="true" />
                ) : (
                  calendarData && <CalendarHeatmap data={calendarData} />
                )}
              </>
            ) : (
              <>
                {period && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${cardClass} p-4`}>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">수입</p>
                      <p className="mt-2 text-lg font-bold text-sky-400">
                        {formatAmount(period.income_amount)}
                      </p>
                    </div>
                    <div className={`${cardClass} p-4`}>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">지출</p>
                      <p className="mt-2 text-lg font-bold text-[var(--color-danger)]">
                        {formatAmount(period.expense_amount)}
                      </p>
                    </div>
                    <div className={`${cardClass} p-4`}>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        잔액 흐름
                      </p>
                      <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">
                        {formatAmount(period.net_amount)}
                      </p>
                    </div>
                    <div className={`${cardClass} p-4`}>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        거래 수
                      </p>
                      <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">
                        {period.items
                          .reduce((sum, item) => sum + item.transaction_count, 0)
                          .toLocaleString("ko-KR")}
                        건
                      </p>
                    </div>
                  </div>
                )}

                <section className={`${cardClass} p-4`}>
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                      소비 흐름
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      선택한 기간의 지출 금액 기준
                    </p>
                  </div>
                  {hasChartData ? (
                    <SpendingChart items={chartItems} />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] px-4 text-center text-sm text-[var(--color-text-secondary)]">
                      차트로 표시할 지출 데이터가 없습니다.
                    </div>
                  )}
                </section>

                <section className={`${cardClass} p-4`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        카테고리별 소비
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        상위 5개 카테고리
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {formatAmount(category?.total_amount ?? 0)}
                    </span>
                  </div>
                  {category && category.items.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {category.items.map((item) => {
                        const icon =
                          item.icon_id != null ? iconMap.get(item.icon_id) : undefined;
                        return (
                          <div key={item.category_id}>
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
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
                                className="h-full rounded-full bg-[var(--color-primary)]"
                                style={{ width: `${Math.min(100, item.ratio)}%` }}
                              />
                            </div>
                            <p className="mt-1 text-right text-xs text-[var(--color-text-secondary)]">
                              {item.ratio.toFixed(2)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[var(--color-bg-secondary)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                      카테고리별 소비 데이터가 없습니다.
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
