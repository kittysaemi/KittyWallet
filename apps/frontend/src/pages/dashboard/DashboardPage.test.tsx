import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from ".";
import { dashboardApi } from "../../entities/dashboard/api/dashboardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { QUERY_LIMIT } from "../../shared/constants/queryConfig";

vi.mock("../../entities/dashboard/api/dashboardApi", () => ({
  dashboardApi: {
    getDashboard: vi.fn()
  }
}));

vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: {
    getCategories: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

const mockedDashboardApi = vi.mocked(dashboardApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const emptyCategories = { success: true, data: { items: [] }, error: null };
const emptyIcons = { success: true, data: { items: [] }, error: null };

const makeTx = (id: number, date: string) => ({
  transaction_id: id,
  wallet_type: "ACCOUNT" as const,
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_deleted: false,
  category_id: 1,
  category_name: `카테고리${id}`,
  transaction_type: "EXPENSE" as const,
  amount: 1000 * id,
  memo: null,
  transaction_date: date,
  created_at: `${date}T00:00:00Z`,
  updated_at: `${date}T00:00:00Z`
});

const dashboardResponse = (recentTransactions: ReturnType<typeof makeTx>[]) => ({
  success: true,
  data: {
    user: { user_id: 1, nickname: "미냥이" },
    asset_summary: { total_asset_amount: 100000, account_count: 1, card_count: 0, active_card_count: 0, currency: "KRW" },
    spending_summary: {
      period_type: "MONTH" as const,
      start_date: "2026-09-01",
      end_date: "2026-09-05",
      income_amount: 0,
      expense_amount: 0,
      card_expense_amount: 0,
      net_amount: 0,
      transaction_count: recentTransactions.length
    },
    recent_transactions: recentTransactions,
    sync_summary: { has_pending_sync: false, pending_count: 0, failed_count: 0, last_synced_at: null },
    cache_policy: { cacheable: true, recommended_stale_time_seconds: 60 }
  },
  error: null
});

describe("DashboardPage — 최근 내역", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  it("requests QUERY_LIMIT.DASHBOARD_RECENT(6) recent transactions from the dashboard API", async () => {
    mockedDashboardApi.getDashboard.mockResolvedValue(dashboardResponse([]));

    render(<DashboardPage />, { wrapper: createWrapper() });

    await screen.findByText("최근 거래가 없습니다.");

    expect(mockedDashboardApi.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ recent_limit: QUERY_LIMIT.DASHBOARD_RECENT })
    );
    expect(QUERY_LIMIT.DASHBOARD_RECENT).toBe(6);
    // 통계 Top5 등 다른 용도로 쓰이는 TOP5 상수는 이 변경으로 영향받지 않는다.
    expect(QUERY_LIMIT.TOP5).toBe(5);
  });

  it("renders all 6 items the backend returns without any further client-side filtering (backend already excludes account-transfer transactions)", async () => {
    const items = [1, 2, 3, 4, 5, 6].map((n) => makeTx(n, `2026-08-${20 + n}`));
    mockedDashboardApi.getDashboard.mockResolvedValue(dashboardResponse(items));

    render(<DashboardPage />, { wrapper: createWrapper() });

    for (const item of items) {
      expect(await screen.findByText(item.category_name)).toBeInTheDocument();
    }
    expect(screen.queryByText("최근 거래가 없습니다.")).not.toBeInTheDocument();
  });

  it("shows the empty state when the backend returns no recent transactions", async () => {
    mockedDashboardApi.getDashboard.mockResolvedValue(dashboardResponse([]));

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("최근 거래가 없습니다.")).toBeInTheDocument();
  });
});
