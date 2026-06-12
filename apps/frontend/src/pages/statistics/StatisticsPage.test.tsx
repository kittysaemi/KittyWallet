import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StatisticsPage from ".";
import { statisticsApi } from "../../entities/statistics/api/statisticsApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/statistics/api/statisticsApi", () => ({
  statisticsApi: {
    getMonthlyStatistics: vi.fn(),
    getPeriodStatistics: vi.fn(),
    getCategoryStatistics: vi.fn(),
    getSummaryStatistics: vi.fn(),
    getCategoryTopStatistics: vi.fn(),
    getCalendarStatistics: vi.fn(),
    getSankeyStatistics: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

const mockedStatisticsApi = vi.mocked(statisticsApi);
const mockedIconApi = vi.mocked(iconApi);

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

const ICON_EMPTY = { success: true, data: { items: [] }, error: null };

const MONTHLY_DATA = {
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
};

const PERIOD_DATA = {
  success: true,
  data: {
    start_date: "2026-06-01",
    end_date: "2026-06-07",
    income_amount: 120000,
    expense_amount: 45000,
    net_amount: 75000,
    items: [{ period: "2026-06-02", income_amount: 120000, expense_amount: 45000, transaction_count: 2 }]
  },
  error: null
};

const SUMMARY_DATA = {
  success: true,
  data: {
    month: "2026-06",
    income_amount: 300000,
    expense_amount: 90000,
    net_amount: 210000,
    transaction_count: 4,
    top_category: { category_id: 1, category_name: "식비", icon_id: null, amount: 60000 }
  },
  error: null
};

const CATEGORY_TOP_DATA = {
  success: true,
  data: {
    month: "2026-06",
    total_expense: 90000,
    items: [
      { rank: 1, category_id: 1, category_name: "식비", icon_id: null, amount: 60000, ratio: 66.67 },
      { rank: null, category_id: null, category_name: "기타", icon_id: null, amount: 30000, ratio: 33.33 }
    ]
  },
  error: null
};

const CATEGORY_DATA = {
  success: true,
  data: {
    start_date: "2026-06-01",
    end_date: "2026-06-07",
    total_amount: 60000,
    items: [
      { category_id: 1, category_name: "식비", icon_id: null, amount: 45000, transaction_count: 2, ratio: 75.0 },
      { category_id: 2, category_name: "교통", icon_id: null, amount: 15000, transaction_count: 1, ratio: 25.0 }
    ]
  },
  error: null
};

const CALENDAR_DATA = {
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
};

const SANKEY_DATA = {
  success: true,
  data: {
    month: "2026-06",
    total_expense: 90000,
    nodes: [
      { id: "total", name: "총 지출", value: 90000 },
      { id: "account", name: "계좌", value: 60000 },
      { id: "card", name: "카드", value: 30000 },
      { id: "cat_1", name: "식비", value: 50000 },
      { id: "cat_other", name: "기타", value: 40000 }
    ],
    links: [
      { source: "total", target: "account", value: 60000 },
      { source: "total", target: "card", value: 30000 },
      { source: "account", target: "cat_1", value: 35000 },
      { source: "account", target: "cat_other", value: 25000 },
      { source: "card", target: "cat_1", value: 15000 },
      { source: "card", target: "cat_other", value: 15000 }
    ]
  },
  error: null
};

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatisticsApi.getMonthlyStatistics.mockResolvedValue(MONTHLY_DATA);
    mockedStatisticsApi.getPeriodStatistics.mockResolvedValue(PERIOD_DATA);
    mockedStatisticsApi.getSummaryStatistics.mockResolvedValue(SUMMARY_DATA);
    mockedStatisticsApi.getCategoryTopStatistics.mockResolvedValue(CATEGORY_TOP_DATA);
    mockedStatisticsApi.getCategoryStatistics.mockResolvedValue(CATEGORY_DATA);
    mockedStatisticsApi.getCalendarStatistics.mockResolvedValue(CALENDAR_DATA);
    mockedStatisticsApi.getSankeyStatistics.mockResolvedValue(SANKEY_DATA);
    mockedIconApi.getIcons.mockResolvedValue(ICON_EMPTY);
  });

  it("renders spending tab with monthly summary and chart", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("소비 흐름")).toBeInTheDocument();
    expect(screen.getByText("300,000원")).toBeInTheDocument();
    expect(screen.getAllByText("90,000원").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("img", { name: "월별 소비 흐름 차트" })).toBeInTheDocument();
  });

  it("renders loading skeleton while statistics are pending", () => {
    mockedStatisticsApi.getMonthlyStatistics.mockReturnValue(new Promise(() => undefined));

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

  it("renders empty state when spending data has no items", async () => {
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
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
  });

  it("renders spending tab when the period has income but no expense", async () => {
    mockedStatisticsApi.getMonthlyStatistics.mockResolvedValueOnce({
      success: true,
      data: {
        month: "2026-06",
        wallet_type: null,
        income_amount: 300000,
        expense_amount: 0,
        net_amount: 300000,
        transaction_count: 1,
        daily_items: [
          { date: "2026-06-02", income_amount: 300000, expense_amount: 0, transaction_count: 1 }
        ]
      },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("소비 흐름")).toBeInTheDocument();
    expect(screen.getAllByText("300,000원").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("통계 데이터가 없습니다")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "월별 소비 흐름 차트" })).toBeInTheDocument();
  });

  it("switches to 월간 요약 tab and shows summary data", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "월간 요약" }));

    await waitFor(() => expect(mockedStatisticsApi.getSummaryStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("월간 요약 카드")).toBeInTheDocument();
    expect(screen.getByText("거래 수")).toBeInTheDocument();
    expect(screen.getByText("최고 지출")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to Top 5 tab and shows ranked categories", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "Top 5" }));

    await waitFor(() => expect(mockedStatisticsApi.getCategoryTopStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("기타")).toBeInTheDocument();
  });

  it("switches to 달력 히트맵 tab and shows calendar grid", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "달력 히트맵" }));

    await waitFor(() => expect(mockedStatisticsApi.getCalendarStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("달력 히트맵")).toBeInTheDocument();
  });

  it("switches to 지출 흐름 tab and renders Sankey diagram", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "지출 흐름" }));

    await waitFor(() => expect(mockedStatisticsApi.getSankeyStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("지출 흐름 Sankey 다이어그램")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "지출 흐름 Sankey 차트" })).toBeInTheDocument();
  });

  it("renders Sankey empty state when total_expense is 0", async () => {
    mockedStatisticsApi.getSankeyStatistics.mockResolvedValueOnce({
      success: true,
      data: { month: "2026-06", total_expense: 0, nodes: [], links: [] },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "지출 흐름" }));

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
  });

  it("shows error card when spending statistics API fails", async () => {
    // navigator.onLine=false → component uses retry:false, so query fails immediately
    const onLineSpy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mockedStatisticsApi.getMonthlyStatistics.mockRejectedValue(new Error("Network Error"));

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("통계 데이터를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();

    onLineSpy.mockRestore();
  });

  it("Top5 tab uses category statistics when switched to weekly mode", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "Top 5" }));
    await userEvent.click(await screen.findByRole("button", { name: "주별" }));

    await waitFor(() => expect(mockedStatisticsApi.getCategoryStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
  });
});
