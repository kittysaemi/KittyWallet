import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionsPage from ".";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: {
    getTransactions: vi.fn()
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

const mockedTransactionApi = vi.mocked(transactionApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/transactions"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const emptyTransactions = {
  success: true,
  data: {
    items: [],
    total_count: 0,
    page: 1,
    limit: 20
  },
  error: null
};

const emptyCategories = {
  success: true,
  data: { items: [] },
  error: null
};

const emptyIcons = {
  success: true,
  data: { items: [] },
  error: null
};

describe("TransactionsPage error cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
  });

  it("renders API failure UI and retries transaction loading", async () => {
    mockedTransactionApi.getTransactions.mockRejectedValue(new Error("network"));
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);

    render(<TransactionsPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(
      "거래 내역을 불러오지 못했습니다."
    );

    mockedTransactionApi.getTransactions.mockReset();
    mockedTransactionApi.getTransactions.mockResolvedValueOnce(emptyTransactions);

    await userEvent.click(screen.getByRole("button", { name: /다시 시도/ }));

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalledTimes(1));
  });

  it("renders transaction memo beside the category name", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            transaction_id: 1,
            wallet_type: "ACCOUNT",
            wallet_id: 1,
            wallet_name: "생활통장",
            wallet_deleted: false,
            category_id: 1,
            category_name: "식비",
            transaction_type: "EXPENSE",
            amount: 12000,
            memo: "점심",
            transaction_date: "2026-06-02",
            created_at: "2026-06-02T00:00:00Z",
            updated_at: "2026-06-02T00:00:00Z"
          }
        ],
        total_count: 1,
        page: 1,
        limit: 20
      },
      error: null
    });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);

    render(<TransactionsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("식비")).toBeInTheDocument();
    expect(screen.getByText("점심")).toBeInTheDocument();
  });

  it("shows offline state and disables query retry while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false
    });
    mockedTransactionApi.getTransactions.mockRejectedValueOnce(new Error("offline"));
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);

    render(<TransactionsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("오프라인 상태입니다. 캐시된 데이터를 표시합니다.")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "거래 내역을 불러오지 못했습니다."
    );

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalledTimes(1));
  });
});
