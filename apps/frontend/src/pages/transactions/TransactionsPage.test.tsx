import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionsPage from ".";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { getTodayInTimezone } from "../../shared/utils/date";

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

const createWrapper = (
  initialEntries: Parameters<typeof MemoryRouter>[0]["initialEntries"] = ["/transactions"],
  existingQueryClient?: QueryClient
) => {
  const queryClient =
    existingQueryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const makeTxItem = (id: number, date: string) => ({
  transaction_id: id,
  wallet_type: "ACCOUNT" as const,
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_deleted: false,
  category_id: 1,
  category_name: "식비",
  transaction_type: "EXPENSE" as const,
  amount: 1000 * id,
  memo: null,
  transaction_date: date,
  created_at: `${date}T00:00:00Z`,
  updated_at: `${date}T00:00:00Z`
});

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

describe("TransactionsPage — highlightDate (거래 등록 후 복귀)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  it("resolves the target page before fetching, and never requests page 1 of the main list when the highlighted date is on a later page", async () => {
    const highlightDate = "2026-06-05";
    mockedTransactionApi.getTransactions.mockImplementation(async (params) => {
      if (params?.limit === 1) {
        // 위치 계산 쿼리: highlightDate 이후 거래가 25건 → 20건씩 페이지네이션 시 2페이지
        return { success: true, data: { items: [], total_count: 25, page: 1, limit: 1 }, error: null };
      }
      return {
        success: true,
        data: { items: [makeTxItem(1, highlightDate)], total_count: 26, page: params?.page ?? 1, limit: 20 },
        error: null
      };
    });

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { highlightDate } }])
    });

    expect(await screen.findByText("식비")).toBeInTheDocument();

    const mainListCalls = mockedTransactionApi.getTransactions.mock.calls.filter(
      ([params]) => params?.limit === 20
    );
    expect(mainListCalls).toHaveLength(1);
    expect(mainListCalls[0][0]).toMatchObject({ page: 2 });
  });

  it("scrolls the highlighted date into view when it is off-screen", async () => {
    const highlightDate = "2026-06-05";
    mockedTransactionApi.getTransactions.mockImplementation(async (params) => {
      if (params?.limit === 1) {
        return { success: true, data: { items: [], total_count: 0, page: 1, limit: 1 }, error: null };
      }
      return {
        success: true,
        data: { items: [makeTxItem(1, highlightDate)], total_count: 1, page: 1, limit: 20 },
        error: null
      };
    });

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const isTarget = this.getAttribute("data-date") === highlightDate;
      return {
        top: isTarget ? 900 : 0,
        bottom: isTarget ? 950 : 800,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON() { return this; }
      } as DOMRect;
    });

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { highlightDate } }])
    });

    await screen.findByText("식비");
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" })
    ));
  });

  it("does not scroll when the highlighted date is already fully visible", async () => {
    const highlightDate = "2026-06-05";
    mockedTransactionApi.getTransactions.mockImplementation(async (params) => {
      if (params?.limit === 1) {
        return { success: true, data: { items: [], total_count: 0, page: 1, limit: 1 }, error: null };
      }
      return {
        success: true,
        data: { items: [makeTxItem(1, highlightDate)], total_count: 1, page: 1, limit: 20 },
        error: null
      };
    });

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { highlightDate } }])
    });

    await screen.findByText("식비");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to the highlighted item once a stale cached page is replaced by the background refetch", async () => {
    // 이 페이지로 돌아왔을 때, 직전 방문에서 캐시된(방금 등록한 거래가 빠진) 데이터로
    // isSuccess가 먼저 true가 되고, 최신 데이터는 뒤이은 백그라운드 refetch로 도착하는
    // 상황을 재현한다 (거래 등록 성공 시 ["transactions"]를 invalidate하지만, 이 페이지의
    // 쿼리는 이미 stale 상태로 마운트되며 캐시를 먼저 보여준 뒤 갱신되기 때문).
    const highlightDate = "2026-08-01";
    const staleItems = [1, 2, 3, 4, 5, 6, 7].map((n) => makeTxItem(n, `2026-08-${25 + (n - 1)}`));
    const freshItems = [...staleItems, makeTxItem(8, highlightDate)];

    mockedTransactionApi.getTransactions.mockImplementation(async (params) => {
      if (params?.limit === 1) {
        return { success: true, data: { items: [], total_count: 7, page: 1, limit: 1 }, error: null };
      }
      return {
        success: true,
        data: { items: freshItems, total_count: freshItems.length, page: 1, limit: 20 },
        error: null
      };
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["transactions", 2026, 8, 1], {
      success: true,
      data: { items: staleItems, total_count: staleItems.length, page: 1, limit: 20 },
      error: null
    });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const isTarget = this.getAttribute("data-date") === highlightDate;
      return {
        top: isTarget ? 900 : 0,
        bottom: isTarget ? 950 : 800,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON() { return this; }
      } as DOMRect;
    });

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { highlightDate } }], queryClient)
    });

    await waitFor(() => expect(screen.getAllByText("식비").length).toBe(freshItems.length));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" })
    ));
  });
});

describe("TransactionsPage — 기본 진입 시 오늘 위치로 스크롤", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  // 주의: 이 스위트는 React StrictMode의 "effect 두 번 실행" 타이밍 버그(스크롤 직후
  // 0으로 되돌아가던 문제)를 실제로 재현/검증하지 못한다 — Vitest 환경에서는 StrictMode로
  // 감싸도 effect가 한 번만 실행되어, 버그가 있던 버전으로 되돌려도 아래 테스트가 그대로
  // 통과한다(직접 확인함). 그래서 <StrictMode>로 감싸지 않고 기본 동작만 검증한다.
  // 해당 타이밍 문제는 실제 브라우저에서 수동으로 재확인해야 한다.
  it("scrolls to today's row on a fresh entry into the current month", async () => {
    const today = getTodayInTimezone();
    mockedTransactionApi.getTransactions.mockResolvedValue({
      success: true,
      data: { items: [makeTxItem(1, today)], total_count: 1, page: 1, limit: 20 },
      error: null
    });

    Element.prototype.scrollIntoView = vi.fn();

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });

    await screen.findByText("식비");

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" })
    );
  });
});
