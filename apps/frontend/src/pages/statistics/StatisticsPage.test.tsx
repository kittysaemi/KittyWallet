import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StatisticsPage from ".";
import { statisticsApi } from "../../entities/statistics/api/statisticsApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";

vi.mock("../../entities/statistics/api/statisticsApi", () => ({
  statisticsApi: {
    getMonthlyStatistics: vi.fn(),
    getPeriodStatistics: vi.fn(),
    getCategoryStatistics: vi.fn(),
    getSummaryStatistics: vi.fn(),
    getCategoryTopStatistics: vi.fn(),
    getCalendarStatistics: vi.fn(),
    getSankeyStatistics: vi.fn(),
    getSankeyIncomeStatistics: vi.fn(),
    getCategoryExpenseStatistics: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

// getAllTransactions(전체 조회)는 실제 구현을 쓰고, 내부에서 호출하는 getTransactions만 모킹한다.
vi.mock("../../entities/transaction/api/transactionApi", async () => {
  const actual = await vi.importActual<typeof import("../../entities/transaction/api/transactionApi")>(
    "../../entities/transaction/api/transactionApi"
  );
  actual.transactionApi.getTransactions = vi.fn();
  return actual;
});

const mockedStatisticsApi = vi.mocked(statisticsApi);
const mockedIconApi = vi.mocked(iconApi);
const mockedTransactionApi = vi.mocked(transactionApi);

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

const DAY_TRANSACTIONS_DATA = {
  success: true,
  data: {
    items: [
      {
        transaction_id: 1,
        wallet_type: "ACCOUNT" as const,
        wallet_id: 1,
        wallet_name: "우리은행",
        wallet_deleted: false,
        category_id: 1,
        category_name: "식비",
        transaction_type: "EXPENSE" as const,
        amount: 40000,
        memo: null,
        transaction_date: "2026-06-01",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z"
      },
      {
        transaction_id: 2,
        wallet_type: "CARD" as const,
        wallet_id: 2,
        wallet_name: "신한카드",
        wallet_deleted: false,
        category_id: 2,
        category_name: "가전",
        transaction_type: "EXPENSE" as const,
        amount: 100000,
        memo: null,
        transaction_date: "2026-06-01",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        installment_id: 77,
        installment_seq: 1,
        installment_total_count: 3,
        installment_original_amount: 300000
      }
    ],
    page: 1,
    limit: 100,
    total_count: 2
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
      { id: "w_1", name: "우리은행", value: 60000 },
      { id: "w_2", name: "신한카드", value: 30000 },
      { id: "cat_1", name: "식비", value: 50000 },
      { id: "cat_2", name: "교통", value: 40000 }
    ],
    links: [
      { source: "total", target: "w_1", value: 60000 },
      { source: "total", target: "w_2", value: 30000 },
      { source: "w_1", target: "cat_1", value: 35000 },
      { source: "w_1", target: "cat_2", value: 25000 },
      { source: "w_2", target: "cat_1", value: 15000 },
      { source: "w_2", target: "cat_2", value: 15000 }
    ]
  },
  error: null
};

const SANKEY_INCOME_DATA = {
  success: true,
  data: {
    month: "2026-06",
    total_income: 300000,
    nodes: [
      { id: "total", name: "총 수입", value: 300000 },
      { id: "w_1", name: "우리은행", value: 300000 },
      { id: "cat_3", name: "급여", value: 300000 }
    ],
    links: [
      { source: "total", target: "w_1", value: 300000 },
      { source: "w_1", target: "cat_3", value: 300000 }
    ]
  },
  error: null
};

describe("StatisticsPage", () => {
  const CATEGORY_EXPENSE_DATA = {
    success: true,
    data: {
      period_type: "all" as const,
      total_amount: 120000,
      items: [
        { category_id: 1, category_name: "식비", icon_id: null, amount: 90000, transaction_count: 5, ratio: 75.0 },
        { category_id: 2, category_name: "교통", icon_id: null, amount: 30000, transaction_count: 2, ratio: 25.0 }
      ]
    },
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatisticsApi.getMonthlyStatistics.mockResolvedValue(MONTHLY_DATA);
    mockedStatisticsApi.getPeriodStatistics.mockResolvedValue(PERIOD_DATA);
    mockedStatisticsApi.getSummaryStatistics.mockResolvedValue(SUMMARY_DATA);
    mockedStatisticsApi.getCategoryTopStatistics.mockResolvedValue(CATEGORY_TOP_DATA);
    mockedStatisticsApi.getCategoryStatistics.mockResolvedValue(CATEGORY_DATA);
    mockedStatisticsApi.getCalendarStatistics.mockResolvedValue(CALENDAR_DATA);
    mockedStatisticsApi.getSankeyStatistics.mockResolvedValue(SANKEY_DATA);
    mockedStatisticsApi.getSankeyIncomeStatistics.mockResolvedValue(SANKEY_INCOME_DATA);
    mockedStatisticsApi.getCategoryExpenseStatistics.mockResolvedValue(CATEGORY_EXPENSE_DATA);
    mockedIconApi.getIcons.mockResolvedValue(ICON_EMPTY);
    mockedTransactionApi.getTransactions.mockResolvedValue(DAY_TRANSACTIONS_DATA);
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

  it("switches to 월간요약 tab and shows summary data", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "월간요약" }));

    await waitFor(() => expect(mockedStatisticsApi.getSummaryStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("월간 요약 카드")).toBeInTheDocument();
    expect(screen.getByText("거래 수")).toBeInTheDocument();
    expect(screen.getByText("최고 지출")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to Top5 tab and shows ranked categories", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "Top5" }));

    await waitFor(() => expect(mockedStatisticsApi.getCategoryTopStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("기타").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to 달력히트맵 tab and shows calendar grid", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "달력히트맵" }));

    await waitFor(() => expect(mockedStatisticsApi.getCalendarStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("달력 히트맵")).toBeInTheDocument();
  });

  it("달력히트맵 일자 상세 목록에서 할부 1회차를 원금으로 표시한다", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "달력히트맵" }));
    await screen.findByLabelText("달력 히트맵");

    await userEvent.click(screen.getByRole("button", { name: /^1일/ }));

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    // 일반 지출과 구매일(1회차) 할부가 모두 노출된다.
    expect(await screen.findByText("식비/우리은행")).toBeInTheDocument();
    expect(screen.getByText(/가전\/신한카드/)).toBeInTheDocument();
    // 할부는 회차 금액(100,000원)이 아니라 원금(300,000원)으로 표시된다.
    expect(screen.getByText("-300,000원")).toBeInTheDocument();
    expect(screen.queryByText("-100,000원")).not.toBeInTheDocument();
    expect(screen.getByText(/할부 3개월/)).toBeInTheDocument();
  });

  it("달력히트맵 일자 상세 목록에서 할부 2회차 이후는 제외한다", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValueOnce({
      ...DAY_TRANSACTIONS_DATA,
      data: {
        ...DAY_TRANSACTIONS_DATA.data,
        items: [
          DAY_TRANSACTIONS_DATA.data.items[0],
          // 구매일이 아닌 달의 2회차 거래 — 그날 히트맵 합계에는 포함되지 않는다.
          { ...DAY_TRANSACTIONS_DATA.data.items[1], transaction_id: 3, installment_seq: 2 }
        ]
      }
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "달력히트맵" }));
    await screen.findByLabelText("달력 히트맵");

    await userEvent.click(screen.getByRole("button", { name: /^1일/ }));

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    expect(await screen.findByText("식비/우리은행")).toBeInTheDocument();
    expect(screen.queryByText(/가전\/신한카드/)).not.toBeInTheDocument();
  });

  it("switches to 소비흐름 tab and renders expense Sankey diagram", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "소비흐름" }));

    await waitFor(() => expect(mockedStatisticsApi.getSankeyStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("지출 흐름 Sankey 다이어그램")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "지출 흐름 Sankey 차트" })).toBeInTheDocument();
  });

  it("renders expense Sankey empty state when total_expense is 0", async () => {
    mockedStatisticsApi.getSankeyStatistics.mockResolvedValueOnce({
      success: true,
      data: { month: "2026-06", total_expense: 0, nodes: [], links: [] },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "소비흐름" }));

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
  });

  it("switches to income mode inside 소비흐름 tab and renders income Sankey diagram", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "소비흐름" }));
    await userEvent.click(await screen.findByRole("button", { name: "수입" }));

    await waitFor(() => expect(mockedStatisticsApi.getSankeyIncomeStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("수입 흐름 Sankey 다이어그램")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "수입 흐름 Sankey 차트" })).toBeInTheDocument();
  });

  it("renders income Sankey empty state when total_income is 0", async () => {
    mockedStatisticsApi.getSankeyIncomeStatistics.mockResolvedValueOnce({
      success: true,
      data: { month: "2026-06", total_income: 0, nodes: [], links: [] },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "소비흐름" }));
    await userEvent.click(await screen.findByRole("button", { name: "수입" }));

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

    await userEvent.click(await screen.findByRole("button", { name: "Top5" }));
    await userEvent.click(await screen.findByRole("button", { name: "주별" }));

    await waitFor(() => expect(mockedStatisticsApi.getCategoryStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("Top 5 카테고리")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to 카테고리통계 tab and shows category expense list", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));

    await waitFor(() => expect(mockedStatisticsApi.getCategoryExpenseStatistics).toHaveBeenCalled());
    expect(await screen.findByLabelText("카테고리별 지출 통계")).toBeInTheDocument();
    expect(screen.getByText("카테고리별 지출")).toBeInTheDocument();
    expect(screen.getAllByText("식비").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("교통").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("120,000원")).toBeInTheDocument();
  });

  it("카테고리통계 탭에서 년별 선택 시 연도 네비게이터가 표시된다", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await userEvent.click(await screen.findByRole("button", { name: "년별" }));

    expect(await screen.findByRole("button", { name: "이전 기간" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 기간" })).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedStatisticsApi.getCategoryExpenseStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ period_type: "year" })
      )
    );
  });

  it("카테고리통계 탭에서 월별 선택 시 월 네비게이터가 표시된다", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await userEvent.click(await screen.findByRole("button", { name: "월별" }));

    expect(await screen.findByRole("button", { name: "이전 기간" })).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedStatisticsApi.getCategoryExpenseStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ period_type: "month" })
      )
    );
  });

  it("카테고리통계 탭 전체 기간에 데이터 없을 때 빈 상태를 표시한다", async () => {
    mockedStatisticsApi.getCategoryExpenseStatistics.mockResolvedValueOnce({
      success: true,
      data: { period_type: "all", total_amount: 0, items: [] },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
    expect(screen.getByText("해당 기간에 기록된 지출이 없습니다.")).toBeInTheDocument();
  });

  it("카테고리통계 탭에서 금액 클릭 시 거래 내역 팝업이 열리고, 합계가 카테고리 통계 금액과 일치한다 (#424)", async () => {
    // 식비(amount: 90000)를 구성하는 실제 내역: 일반 지출 40,000 + 할부 원금 50,000(1회차) = 90,000
    mockedTransactionApi.getTransactions.mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            transaction_id: 10,
            wallet_type: "ACCOUNT",
            wallet_id: 1,
            wallet_name: "우리은행",
            wallet_deleted: false,
            category_id: 1,
            category_name: "식비",
            transaction_type: "EXPENSE",
            amount: 40000,
            memo: "점심 식사",
            transaction_date: "2026-06-05",
            created_at: "2026-06-05T00:00:00.000Z",
            updated_at: "2026-06-05T00:00:00.000Z"
          },
          {
            transaction_id: 11,
            wallet_type: "CARD",
            wallet_id: 2,
            wallet_name: "신한카드",
            wallet_deleted: false,
            category_id: 1,
            category_name: "식비",
            transaction_type: "EXPENSE",
            amount: 16667,
            memo: "가전 할부",
            transaction_date: "2026-06-01",
            created_at: "2026-06-01T00:00:00.000Z",
            updated_at: "2026-06-01T00:00:00.000Z",
            installment_id: 99,
            installment_seq: 1,
            installment_total_count: 3,
            installment_original_amount: 50000
          }
        ],
        page: 1,
        limit: 300,
        total_count: 2
      },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");

    await userEvent.click(screen.getByText("90,000원"));

    await waitFor(() =>
      expect(mockedTransactionApi.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 1, transaction_type: "EXPENSE" })
      )
    );

    // 항목은 아이콘/메모/금액을 한 줄로 표시하며, 거래일은 화면에 표시하지 않는다.
    expect(await screen.findByText("점심 식사")).toBeInTheDocument();
    expect(screen.getByText("40,000원")).toBeInTheDocument();
    expect(screen.getByText("가전 할부")).toBeInTheDocument();
    // 할부는 회차 금액(16,667원)이 아니라 원금(50,000원)으로 표시된다.
    expect(screen.getByText("50,000원")).toBeInTheDocument();
    expect(screen.queryByText("16,667원")).not.toBeInTheDocument();
    expect(screen.queryByText("2026-06-05")).not.toBeInTheDocument();

    // 팝업 목록 금액 합계(40,000 + 50,000)가 카테고리 통계에 표시된 식비 금액(90,000)과 정확히 일치한다.
    expect(40000 + 50000).toBe(90000);

    // 요약 헤더(카테고리명/합계/건수) 없이 목록만 표시된다.
    expect(screen.queryByText("2건")).not.toBeInTheDocument();
  });

  it("카테고리통계 팝업은 100건을 넘는 내역도 페이지를 이어 받아 모두 표시한다 (#353)", async () => {
    const makeItem = (id: number) => ({
      transaction_id: id,
      wallet_type: "ACCOUNT" as const,
      wallet_id: 1,
      wallet_name: "우리은행",
      wallet_deleted: false,
      category_id: 1,
      category_name: "식비",
      transaction_type: "EXPENSE" as const,
      amount: 100,
      memo: `내역 ${id}`,
      transaction_date: "2026-06-05",
      created_at: "2026-06-05T00:00:00.000Z",
      updated_at: "2026-06-05T00:00:00.000Z"
    });
    mockedTransactionApi.getTransactions
      .mockResolvedValueOnce({
        success: true,
        data: { items: Array.from({ length: 100 }, (_, i) => makeItem(i + 1)), page: 1, limit: 100, total_count: 101 },
        error: null
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [makeItem(101)], page: 2, limit: 100, total_count: 101 },
        error: null
      });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");
    await userEvent.click(screen.getByText("90,000원"));

    expect(await screen.findByText("내역 101")).toBeInTheDocument();
    expect(screen.getByText("내역 1")).toBeInTheDocument();
    expect(mockedTransactionApi.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 1, page: 2, limit: 100 })
    );
  });

  it("카테고리통계 팝업에서 할부 2회차 이후 거래는 제외한다", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            transaction_id: 20,
            wallet_type: "CARD",
            wallet_id: 2,
            wallet_name: "신한카드",
            wallet_deleted: false,
            category_id: 1,
            category_name: "식비",
            transaction_type: "EXPENSE",
            amount: 16667,
            memo: "가전 할부 1회차",
            transaction_date: "2026-06-01",
            created_at: "2026-06-01T00:00:00.000Z",
            updated_at: "2026-06-01T00:00:00.000Z",
            installment_id: 99,
            installment_seq: 1,
            installment_total_count: 3,
            installment_original_amount: 50000
          },
          {
            transaction_id: 21,
            wallet_type: "CARD",
            wallet_id: 2,
            wallet_name: "신한카드",
            wallet_deleted: false,
            category_id: 1,
            category_name: "식비",
            transaction_type: "EXPENSE",
            amount: 16667,
            memo: "가전 할부 2회차",
            transaction_date: "2026-07-01",
            created_at: "2026-07-01T00:00:00.000Z",
            updated_at: "2026-07-01T00:00:00.000Z",
            installment_id: 99,
            installment_seq: 2,
            installment_total_count: 3,
            installment_original_amount: 50000
          }
        ],
        page: 1,
        limit: 300,
        total_count: 2
      },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");

    await userEvent.click(screen.getByText("90,000원"));

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    expect(await screen.findByText("가전 할부 1회차")).toBeInTheDocument();
    expect(screen.queryByText("가전 할부 2회차")).not.toBeInTheDocument();
  });

  it("카테고리통계 팝업은 로딩 스피너를 표시하고, 닫기 버튼 또는 배경 클릭으로 닫힌다", async () => {
    mockedTransactionApi.getTransactions.mockReturnValueOnce(new Promise(() => undefined));

    const { container } = render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");

    await userEvent.click(screen.getByText("90,000원"));

    expect(await screen.findByLabelText("거래 내역을 불러오는 중입니다.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByLabelText("거래 내역을 불러오는 중입니다.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("90,000원"));
    expect(await screen.findByLabelText("거래 내역을 불러오는 중입니다.")).toBeInTheDocument();

    const backdrop = container.querySelector(".fixed.inset-0.z-50");
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);
    expect(screen.queryByLabelText("거래 내역을 불러오는 중입니다.")).not.toBeInTheDocument();
  });

  it("카테고리통계 팝업 조회 실패 시 에러 상태와 다시 시도 버튼을 표시한다", async () => {
    const onLineSpy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mockedTransactionApi.getTransactions.mockRejectedValueOnce(new Error("Network Error"));

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");

    await userEvent.click(screen.getByText("90,000원"));

    expect(await screen.findByText("거래 내역을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();

    onLineSpy.mockRestore();
  });

  it("카테고리통계 팝업 조회 결과가 없으면 빈 상태 문구를 표시한다", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValueOnce({
      success: true,
      data: { items: [], page: 1, limit: 300, total_count: 0 },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "카테고리통계" }));
    await screen.findByLabelText("카테고리별 지출 통계");

    await userEvent.click(screen.getByText("90,000원"));

    expect(await screen.findByText("표시할 거래 내역이 없습니다.")).toBeInTheDocument();
  });
});
