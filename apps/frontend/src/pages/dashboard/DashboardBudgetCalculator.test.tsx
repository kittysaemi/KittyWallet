import type { PropsWithChildren } from "react";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from ".";
import { dashboardApi } from "../../entities/dashboard/api/dashboardApi";
import { budgetCalculatorApi } from "../../entities/dashboard/api/budgetCalculatorApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { usePwaStore } from "../../pwa/state/pwa.store";

vi.mock("../../entities/dashboard/api/dashboardApi", () => ({
  dashboardApi: { getDashboard: vi.fn() }
}));
vi.mock("../../entities/dashboard/api/budgetCalculatorApi", () => ({
  budgetCalculatorApi: { getSource: vi.fn() }
}));
vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: { getCategories: vi.fn() }
}));
vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: { getIcons: vi.fn() }
}));

const mockedDashboardApi = vi.mocked(dashboardApi);
const mockedBudgetApi = vi.mocked(budgetCalculatorApi);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return Wrapper;
};

const dashboardResponse = {
  success: true,
  data: {
    user: { user_id: 1, nickname: "테스트" },
    asset_summary: { total_asset_amount: 0, account_count: 0, card_count: 0, active_card_count: 0, currency: "KRW" },
    spending_summary: {
      period_type: "MONTH" as const,
      start_date: "2026-09-01",
      end_date: "2026-09-20",
      income_amount: 0,
      expense_amount: 0,
      card_expense_amount: 0,
      net_amount: 0,
      transaction_count: 0
    },
    recent_transactions: [],
    cash_expense_forecast: {
      target_year: 2026,
      target_month: 10,
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      account_checked_expense_amount: 150_000,
      card_expense_amount: 50_000,
      total_amount: 200_000
    },
    sync_summary: { has_pending_sync: false, pending_count: 0, failed_count: 0, last_synced_at: null },
    cache_policy: { cacheable: true, recommended_stale_time_seconds: 60 }
  },
  error: null
};

describe("DashboardPage — 예산 계산기 진입", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePwaStore.setState({ networkStatus: "online" });
    mockedDashboardApi.getDashboard.mockResolvedValue(dashboardResponse);
    mockedBudgetApi.getSource.mockReturnValue(new Promise(() => undefined));
    vi.mocked(categoryApi.getCategories).mockResolvedValue({ success: true, data: { items: [] }, error: null });
    vi.mocked(iconApi.getIcons).mockResolvedValue({ success: true, data: { items: [] }, error: null });
  });

  it("계산기 버튼은 현금 지출 예상 카드 내부가 아니라 오른쪽 형제 요소이며, 카드 표시는 그대로다", async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    const forecast = await screen.findByTestId("cash-expense-forecast");
    const button = screen.getByRole("button", { name: "예산 계산기 열기" });

    expect(forecast).toHaveTextContent("10월 현금 지출 예상 금액 :200,000원");
    expect(forecast.contains(button)).toBe(false);
    expect(button.parentElement).toBe(forecast.parentElement);
    expect(forecast.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("버튼을 누르면 라우트 변경 없이 예산 계산기 팝업을 연다", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole("button", { name: "예산 계산기 열기" }));

    expect(screen.getByRole("dialog", { name: "예산 계산기" })).toBeInTheDocument();
  });

  it("오프라인이면 버튼을 비활성화하고, 온라인으로 돌아오면 다시 활성화한다", async () => {
    usePwaStore.setState({ networkStatus: "offline" });
    render(<DashboardPage />, { wrapper: createWrapper() });

    const button = await screen.findByRole("button", { name: "예산 계산기 열기" });
    expect(button).toBeDisabled();

    act(() => usePwaStore.setState({ networkStatus: "online" }));

    expect(await screen.findByRole("button", { name: "예산 계산기 열기" })).toBeEnabled();
  });
});
