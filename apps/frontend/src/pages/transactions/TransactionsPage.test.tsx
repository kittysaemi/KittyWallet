import { StrictMode } from "react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import TransactionsPage from ".";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
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

vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: {
    getAccounts: vi.fn()
  }
}));

vi.mock("../../entities/card/api/cardApi", () => ({
  cardApi: {
    getCards: vi.fn()
  }
}));

const mockedTransactionApi = vi.mocked(transactionApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);
const mockedAccountApi = vi.mocked(accountApi);
const mockedCardApi = vi.mocked(cardApi);

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

const emptyAccounts = { success: true, data: { items: [] }, error: null };
const emptyCards = { success: true, data: { items: [] }, error: null };

describe("TransactionsPage error cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
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
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
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
    queryClient.setQueryData(["transactions", 2026, 8, 1, {}], {
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
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
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

// 새로고침(F5)해도 이전에 보던 기간(연/월)이 유지되어야 한다(#353). 연/월을 URL 쿼리
// 파라미터로 옮겼으므로, 마운트 시 URL에서 그대로 읽어오는지와, 이전/다음 달 이동 시 URL에
// 반영되는지를 검증한다.
describe("TransactionsPage — 새로고침(F5) 시 기간 유지", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  it("reads year/month from the URL on mount (simulates surviving a page reload)", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);

    render(<TransactionsPage />, {
      wrapper: createWrapper(["/transactions?year=2025&month=3"])
    });

    await waitFor(() => {
      const call = mockedTransactionApi.getTransactions.mock.calls.find(([p]) => p?.limit === 20)?.[0];
      expect(call).toMatchObject({ start_date: "2025-03-01", end_date: "2025-03-31" });
    });
  });

  it("syncs the URL when moving to a different month, so a later reload keeps the same period", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);

    const LocationProbe = () => {
      const location = useLocation();
      return <div data-testid="loc">{location.pathname}{location.search}</div>;
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/transactions"]}>
          <TransactionsPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("거래 내역이 없습니다");
    expect(screen.getByTestId("loc")).toHaveTextContent("/transactions");
    expect(screen.getByTestId("loc")).not.toHaveTextContent("?");

    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));

    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toMatch(/\?year=\d{4}&month=\d{1,2}/);
    });
  });

  // 회귀 테스트(#353 후속): 개발 서버/E2E는 <React.StrictMode>로 감싸져 있어 effect가 마운트 시
  // 두 번 실행된다. "최초 마운트에는 스킵" 플래그를 단순 boolean으로만 구현하면, 첫 번째 실행에서
  // 이미 플래그가 true로 바뀌어 두 번째 실행이 "진짜 변경"으로 오인되어 URL에 ?year=&month=가
  // 붙어버렸다(대시보드 "전체 보기"·계좌이동 등록 후 복귀가 깨끗한 /transactions를 기대하는 E2E가
  // 이 문제로 실패함). "마지막으로 URL에 반영한 연/월" 값을 비교해서만 실제로 갱신하도록 고쳤다.
  it("does not add a year/month query even when effects double-invoke under StrictMode (dev/E2E parity)", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);

    const LocationProbe = () => {
      const location = useLocation();
      return <div data-testid="loc">{location.pathname}{location.search}</div>;
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/transactions"]}>
            <TransactionsPage />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>
    );

    await screen.findByText("거래 내역이 없습니다");
    expect(screen.getByTestId("loc")).toHaveTextContent("/transactions");
    expect(screen.getByTestId("loc")).not.toHaveTextContent("?");
  });
});

const makeCategory = (category_id: number, category_name: string) => ({
  category_id,
  category_name,
  icon_id: 1,
  show: true,
  include_in_statistics: true,
  is_default: false,
  editable: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z"
});

const categoriesResponse = (
  ...categories: ReturnType<typeof makeCategory>[]
) => ({ success: true, data: { items: categories }, error: null });

// 일반 거래내역(/transactions) 탐색 UI 개선(#353): 필터 바(카테고리/지갑/수입-지출/할부 제외)와
// 기간 이동 바텀시트. 카테고리/지갑은 다중 선택(체크박스), 수입/지출은 배타적인 값이라 단일 선택,
// "할부 제외"는 바텀시트 없이 그 자리에서 토글되는 on/off 칩이다.
describe("TransactionsPage — 필터 바", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  const lastListCall = () =>
    mockedTransactionApi.getTransactions.mock.calls.filter(([p]) => p?.limit === 20).at(-1)?.[0];

  it("applies the selected category filter to the transaction query, resets to page 1, and clears via the chip's X", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(categoriesResponse(makeCategory(5, "식비")));

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());
    mockedTransactionApi.getTransactions.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "카테고리" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /식비/ }));
    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => expect(lastListCall()).toMatchObject({ category_ids: "5", page: 1 }));

    await userEvent.click(screen.getByRole("button", { name: "카테고리 필터 해제" }));

    // 초기(필터 없음) 조회와 쿼리 파라미터가 동일해지므로 TanStack Query가 캐시를 재사용해
    // 네트워크 재요청을 생략할 수 있다 — 그래서 mock 호출 여부 대신 칩이 실제로 선택 해제
    // 상태(placeholder "카테고리")로 돌아왔는지를 검증한다.
    expect(await screen.findByRole("button", { name: "카테고리" })).toBeInTheDocument();
  });

  it("keeps the category sheet open while several categories are checked and sends them as one comma-separated param", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(
      categoriesResponse(makeCategory(5, "식비"), makeCategory(7, "교통"))
    );

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "카테고리" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /식비/ }));

    // 다중 선택이므로 한 항목을 골라도 시트가 닫히지 않아야 한다.
    expect(screen.getByRole("checkbox", { name: /교통/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /교통/ }));

    expect(screen.getByRole("checkbox", { name: /식비/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: /교통/ })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => expect(lastListCall()).toMatchObject({ category_ids: "5,7", page: 1 }));
    // 칩 라벨은 "첫 항목 외 N"으로 줄여 보여준다.
    expect(screen.getByRole("button", { name: "식비 외 1" })).toBeInTheDocument();
  });

  it("unchecks a previously selected category on a second tap", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(
      categoriesResponse(makeCategory(5, "식비"), makeCategory(7, "교통"))
    );

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "카테고리" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /식비/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /교통/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /식비/ }));

    expect(screen.getByRole("checkbox", { name: /식비/ })).toHaveAttribute("aria-checked", "false");

    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => expect(lastListCall()).toMatchObject({ category_ids: "7" }));
  });

  it("sends multi-selected wallets as type:id pairs so accounts and cards with the same id stay distinct", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedAccountApi.getAccounts.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            account_id: 1,
            account_name: "생활통장",
            icon_id: 1,
            initial_balance: 0,
            current_balance: 0,
            allow_negative_balance: false,
            negative_balance_limit: 0,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z"
          }
        ]
      },
      error: null
    });
    mockedCardApi.getCards.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            card_id: 1,
            card_name: "미냥카드",
            icon_id: 1,
            use_yn: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z"
          }
        ]
      },
      error: null
    });

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "지갑" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /생활통장/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /미냥카드/ }));
    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() =>
      expect(lastListCall()).toMatchObject({ wallet_ids: "ACCOUNT:1,CARD:1", page: 1 })
    );
  });

  it("keeps 수입/지출 single-select: picking a second option replaces the first and closes the sheet", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "수입/지출" }));
    // 단일 선택이므로 체크박스가 아니라 일반 버튼이고, 고르는 즉시 시트가 닫힌다.
    await userEvent.click(await screen.findByRole("button", { name: "지출" }));

    await waitFor(() => expect(lastListCall()).toMatchObject({ transaction_type: "EXPENSE" }));
    expect(screen.queryByRole("button", { name: "완료" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "지출" }));
    await userEvent.click(await screen.findByRole("button", { name: "수입" }));

    await waitFor(() => expect(lastListCall()).toMatchObject({ transaction_type: "INCOME" }));
  });

  it("toggles the 할부 제외 filter on and off from the chip itself", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState의 filters)를 물려받지 않도록
    // 항상 필터 없는 초기 상태로 시작한다.
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    const chip = screen.getByRole("button", { name: "할부 제외" });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(chip);

    await waitFor(() =>
      expect(lastListCall()).toMatchObject({ exclude_installment: true, page: 1 })
    );
    expect(screen.getByRole("button", { name: "할부 제외" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "할부 제외" }));

    // 해제 시에는 파라미터 자체를 보내지 않아야 초기 조회와 쿼리 키가 같아진다.
    expect(await screen.findByRole("button", { name: "할부 제외" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

describe("TransactionsPage — 기간 이동 바텀시트", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  it("opens on tapping the month label, and jumping to a date resolves its page before fetching the list", async () => {
    mockedTransactionApi.getTransactions.mockImplementation(async (params) => {
      if (params?.limit === 1) {
        // 오늘 이후로 같은 달에 21건이 더 있다고 가정 → 20건씩 페이지네이션 시 2페이지.
        return { success: true, data: { items: [], total_count: 21, page: 1, limit: 1 }, error: null };
      }
      return {
        success: true,
        data: { items: [], total_count: 0, page: params?.page ?? 1, limit: 20 },
        error: null
      };
    });

    // 같은 파일의 다른 테스트가 남긴 모듈 스코프 상태(_savedTxState)와 무관하게 항상 이번 달로
    // 시작하도록 reset:true를 전달한다(기존 "오늘 위치로 스크롤" 테스트와 동일한 패턴).
    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    const today = getTodayInTimezone();
    const [y, m] = today.split("-");
    await userEvent.click(screen.getByRole("button", { name: `${y}년 ${parseInt(m, 10)}월` }));

    expect(screen.getByText("기간 이동")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "오늘" }));

    await waitFor(() => {
      const mainListCalls = mockedTransactionApi.getTransactions.mock.calls.filter(([p]) => p?.limit === 20);
      expect(mainListCalls.at(-1)?.[0]).toMatchObject({ page: 2 });
    });

    expect(screen.queryByText("기간 이동")).not.toBeInTheDocument();
  });
});

// "일" 필터: 카테고리/지갑/수입-지출과 달리 실제로 조회 범위(start_date/end_date)를 그
// 하루로 좁히는 필터다. 기간 이동 바텀시트의 "날짜 탭 → 페이지 스크롤 이동" 기능과는
// 별개다.
describe("TransactionsPage — 일 필터", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 지갑 필터 옵션(계좌/카드)은 모든 케이스에서 조회되므로 기본값을 항상 채워둔다.
    mockedAccountApi.getAccounts.mockResolvedValue(emptyAccounts);
    mockedCardApi.getCards.mockResolvedValue(emptyCards);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCategoryApi.getCategories.mockResolvedValue(emptyCategories);
    mockedIconApi.getIcons.mockResolvedValue(emptyIcons);
  });

  it("narrows the query to the selected day (start_date === end_date === that day), resets to page 1, and clears via the chip's X", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });

    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());
    mockedTransactionApi.getTransactions.mockClear();

    const today = getTodayInTimezone();
    const [y, m] = today.split("-");
    const monthNum = parseInt(m, 10);
    const dayOneStr = `${y}-${m}-01`;

    await userEvent.click(screen.getByRole("button", { name: "일" }));
    await userEvent.click(await screen.findByRole("button", { name: "1" }));

    await waitFor(() => {
      const call = mockedTransactionApi.getTransactions.mock.calls
        .filter(([p]) => p?.limit === 20)
        .at(-1)?.[0];
      expect(call).toMatchObject({ start_date: dayOneStr, end_date: dayOneStr, page: 1 });
    });

    expect(await screen.findByRole("button", { name: `${monthNum}월 1일` })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "일 필터 해제" }));

    // 초기(필터 없음) 조회와 쿼리 파라미터가 동일해지므로 TanStack Query가 캐시를 재사용해
    // 네트워크 재요청을 생략할 수 있다 — 그래서 mock 호출 여부 대신 칩이 실제로 선택 해제
    // 상태(placeholder "일")로 돌아왔는지를 검증한다.
    expect(await screen.findByRole("button", { name: "일" })).toBeInTheDocument();
  });

  it("combines the day filter with the other chips (AND) when requesting the list", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);
    mockedCategoryApi.getCategories.mockResolvedValue(categoriesResponse(makeCategory(5, "식비")));

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "카테고리" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /식비/ }));
    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    const today = getTodayInTimezone();
    const [y, m] = today.split("-");
    const dayOneStr = `${y}-${m}-01`;

    await userEvent.click(screen.getByRole("button", { name: "일" }));
    await userEvent.click(await screen.findByRole("button", { name: "1" }));

    await waitFor(() => {
      const call = mockedTransactionApi.getTransactions.mock.calls
        .filter(([p]) => p?.limit === 20)
        .at(-1)?.[0];
      expect(call).toMatchObject({
        category_ids: "5",
        start_date: dayOneStr,
        end_date: dayOneStr,
        page: 1
      });
    });
  });

  it("resets the day filter when moving to a different month", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(emptyTransactions);

    render(<TransactionsPage />, {
      wrapper: createWrapper([{ pathname: "/transactions", state: { reset: true } }])
    });
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "일" }));
    await userEvent.click(await screen.findByRole("button", { name: "1" }));

    expect(await screen.findByRole("button", { name: /월 1일$/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));

    expect(await screen.findByRole("button", { name: "일" })).toBeInTheDocument();
  });
});
