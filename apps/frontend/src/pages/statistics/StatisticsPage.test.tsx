import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StatisticsPage from ".";
import { statisticsApi } from "../../entities/statistics/api/statisticsApi";

vi.mock("../../entities/statistics/api/statisticsApi", () => ({
  statisticsApi: {
    getMonthlyStatistics: vi.fn(),
    getCategoryStatistics: vi.fn(),
    getPeriodStatistics: vi.fn(),
    getSummaryStatistics: vi.fn(),
    getCategoryTopStatistics: vi.fn(),
    getCalendarStatistics: vi.fn()
  }
}));

const mockedStatisticsApi = vi.mocked(statisticsApi);

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  canvas: document.createElement("canvas"),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  resetTransform: vi.fn(),
  setLineDash: vi.fn()
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/statistics"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedStatisticsApi.getMonthlyStatistics.mockResolvedValue({
      success: true,
      data: {
        month: "2026-06",
        wallet_type: null,
        income_amount: 300000,
        expense_amount: 90000,
        net_amount: 210000,
        transaction_count: 4,
        daily_items: [
          { date: "2026-06-01", income_amount: 0, expense_amount: 40000, transaction_count: 1 },
          { date: "2026-06-02", income_amount: 300000, expense_amount: 50000, transaction_count: 3 }
        ]
      },
      error: null
    });

    mockedStatisticsApi.getSummaryStatistics.mockResolvedValue({
      success: true,
      data: {
        month: "2026-06",
        income_amount: 300000,
        expense_amount: 90000,
        net_amount: 210000,
        transaction_count: 4,
        top_category: {
          category_id: 1,
          category_name: "식비",
          icon_id: 10,
          amount: 60000
        }
      },
      error: null
    });

    mockedStatisticsApi.getCategoryTopStatistics.mockResolvedValue({
      success: true,
      data: {
        month: "2026-06",
        total_expense: 90000,
        items: [
          {
            rank: 1,
            category_id: 1,
            category_name: "식비",
            icon_id: 10,
            amount: 60000,
            ratio: 66.67
          },
          {
            rank: 2,
            category_id: 2,
            category_name: "교통",
            icon_id: 11,
            amount: 30000,
            ratio: 33.33
          }
        ]
      },
      error: null
    });

    mockedStatisticsApi.getCalendarStatistics.mockResolvedValue({
      success: true,
      data: {
        month: "2026-06",
        max_daily_expense: 50000,
        daily_items: [
          { date: "2026-06-01", expense_amount: 40000 },
          { date: "2026-06-02", expense_amount: 50000 }
        ]
      },
      error: null
    });

    mockedStatisticsApi.getCategoryStatistics.mockResolvedValue({
      success: true,
      data: {
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        total_amount: 90000,
        items: [
          {
            category_id: 1,
            category_name: "식비",
            icon_id: 10,
            amount: 60000,
            transaction_count: 2,
            ratio: 66.67
          }
        ]
      },
      error: null
    });

    mockedStatisticsApi.getPeriodStatistics.mockResolvedValue({
      success: true,
      data: {
        start_date: "2026-06-01",
        end_date: "2026-06-07",
        income_amount: 120000,
        expense_amount: 45000,
        net_amount: 75000,
        items: [
          {
            period: "2026-06-02",
            income_amount: 120000,
            expense_amount: 45000,
            transaction_count: 2
          }
        ]
      },
      error: null
    });
  });

  it("renders monthly summary card with income, expense, and top category", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByLabelText("월간 요약")).toBeInTheDocument();
    expect(screen.getByText("300,000원")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThan(0);
    expect(screen.getByText("최고 지출")).toBeInTheDocument();
  });

  it("renders spending chart section", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("소비 흐름")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "월별 소비 흐름 차트" })).toBeInTheDocument();
  });

  it("renders Top 5 category section in MONTH mode", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByLabelText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getByText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getByText("교통")).toBeInTheDocument();
  });

  it("renders calendar heatmap in MONTH mode", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByLabelText("달력 히트맵")).toBeInTheDocument();
    expect(screen.getByText("달력 히트맵")).toBeInTheDocument();
  });

  it("shows selected date expense when calendar cell is clicked", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await screen.findByLabelText("달력 히트맵");
    const dayCell = screen.getByRole("button", { name: /1일 지출/ });
    await userEvent.click(dayCell);

    expect(screen.getByText("1일 지출:")).toBeInTheDocument();
    expect(screen.getByText("40,000원")).toBeInTheDocument();
  });

  it("renders loading UI while statistics are pending", () => {
    mockedStatisticsApi.getMonthlyStatistics.mockReturnValue(new Promise(() => undefined));
    mockedStatisticsApi.getSummaryStatistics.mockReturnValue(new Promise(() => undefined));
    mockedStatisticsApi.getCategoryTopStatistics.mockReturnValue(new Promise(() => undefined));
    mockedStatisticsApi.getCalendarStatistics.mockReturnValue(new Promise(() => undefined));

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(screen.getByLabelText("통계 데이터를 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("switches to weekly period statistics", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "주별" }));

    await waitFor(() => expect(mockedStatisticsApi.getPeriodStatistics).toHaveBeenCalled());
    expect(await screen.findByText("120,000원")).toBeInTheDocument();
    expect(screen.getByText("45,000원")).toBeInTheDocument();
  });

  it("does not render MONTH-only sections in WEEK mode", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "주별" }));

    await waitFor(() => expect(mockedStatisticsApi.getPeriodStatistics).toHaveBeenCalled());
    await screen.findByText("120,000원");

    expect(screen.queryByLabelText("월간 요약")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top 5 카테고리")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("달력 히트맵")).not.toBeInTheDocument();
    expect(screen.getByText("카테고리별 소비")).toBeInTheDocument();
  });

  it("renders empty state when statistics have no items", async () => {
    mockedStatisticsApi.getMonthlyStatistics.mockResolvedValueOnce({
      success: true,
      data: {
        month: "2026-06",
        wallet_type: null,
        income_amount: 0,
        expense_amount: 0,
        net_amount: 0,
        transaction_count: 0,
        daily_items: []
      },
      error: null
    });
    mockedStatisticsApi.getCategoryTopStatistics.mockResolvedValueOnce({
      success: true,
      data: { month: "2026-06", total_expense: 0, items: [] },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
  });
});
