import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StatisticsPage from ".";
import { statisticsApi } from "../../entities/statistics/api/statisticsApi";

vi.mock("../../entities/statistics/api/statisticsApi", () => ({
  statisticsApi: {
    getMonthlyStatistics: vi.fn(),
    getCategoryStatistics: vi.fn()
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
          {
            date: "2026-06-01",
            income_amount: 0,
            expense_amount: 40000,
            transaction_count: 1
          },
          {
            date: "2026-06-02",
            income_amount: 300000,
            expense_amount: 50000,
            transaction_count: 3
          }
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
  });

  it("renders monthly summary, Chart.js canvas, and category statistics", async () => {
    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("소비 흐름")).toBeInTheDocument();
    expect(screen.getByText("300,000원")).toBeInTheDocument();
    expect(screen.getAllByText("90,000원")).toHaveLength(2);
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "월별 소비 흐름 차트" })).toBeInTheDocument();
  });

  it("renders loading UI while statistics are pending", () => {
    mockedStatisticsApi.getMonthlyStatistics.mockReturnValue(new Promise(() => undefined));
    mockedStatisticsApi.getCategoryStatistics.mockReturnValue(new Promise(() => undefined));

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(screen.getByLabelText("통계 데이터를 불러오는 중입니다.")).toBeInTheDocument();
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
    mockedStatisticsApi.getCategoryStatistics.mockResolvedValueOnce({
      success: true,
      data: {
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        total_amount: 0,
        items: []
      },
      error: null
    });

    render(<StatisticsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("통계 데이터가 없습니다")).toBeInTheDocument();
  });
});
