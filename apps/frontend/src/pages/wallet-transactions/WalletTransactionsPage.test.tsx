import { StrictMode } from "react";
import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, createMemoryRouter, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import WalletTransactionsPage from "./WalletTransactionsPage";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";

vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: { getAccounts: vi.fn() }
}));
vi.mock("../../entities/card/api/cardApi", () => ({
  cardApi: { getCards: vi.fn() }
}));
vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: { getTransactions: vi.fn() }
}));
vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: { getCategories: vi.fn() }
}));
vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: { getIcons: vi.fn() }
}));

const mockedAccountApi = vi.mocked(accountApi);
const mockedCardApi = vi.mocked(cardApi);
const mockedTransactionApi = vi.mocked(transactionApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

const EMPTY_CATEGORIES = { success: true, data: { items: [] }, error: null };
const EMPTY_ICONS = { success: true, data: { items: [] }, error: null };

const ACCOUNTS_DATA = {
  success: true,
  data: {
    items: [
      {
        account_id: 1,
        account_name: "생활통장",
        icon_id: 1,
        initial_balance: 0,
        current_balance: 320000,
        allow_negative_balance: false,
        negative_balance_limit: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z"
      }
    ]
  },
  error: null
};

const CARDS_DATA = {
  success: true,
  data: {
    items: [
      {
        card_id: 2,
        card_name: "신한카드",
        icon_id: 1,
        use_yn: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z"
      }
    ]
  },
  error: null
};

const makeTxPage = (items: TransactionItem[] = [], total_count = 0) => ({
  success: true,
  data: { items, total_count, page: 1, limit: 20, period_summary: null },
  error: null
});

const makeTxPageWithSummary = (total_expense: number) => ({
  success: true,
  data: {
    items: [],
    total_count: 0,
    page: 1,
    limit: 20,
    period_summary: { total_expense }
  },
  error: null
});

const makeTx = (id: number): TransactionItem => ({
  transaction_id: id,
  wallet_type: "ACCOUNT",
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_deleted: false,
  category_id: 10,
  category_name: "식비",
  transaction_type: "EXPENSE",
  amount: 5000 * id,
  memo: null,
  transaction_date: "2026-06-01",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z"
});

const createWrapper = (walletType: "ACCOUNT" | "CARD", walletId: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${walletType === "ACCOUNT" ? "accounts" : "cards"}/${walletId}/transactions`]}>
        <Routes>
          <Route
            path={`/${walletType === "ACCOUNT" ? "accounts" : "cards"}/:walletId/transactions`}
            element={children}
          />
          <Route path="/transactions/:id" element={<div>상세내역 화면</div>} />
          <Route path="/transactions/:id/edit" element={<div>거래 수정 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

describe("WalletTransactionsPage — ACCOUNT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedAccountApi.getAccounts.mockResolvedValue(ACCOUNTS_DATA);
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
  });

  it("shows 지갑 거래내역 header", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByText("지갑 거래내역")).toBeInTheDocument();
  });

  it("shows wallet name and account balance", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByText("생활통장")).toBeInTheDocument();
    expect(await screen.findByText(/320,000원/)).toBeInTheDocument();
  });

  it("renders empty state when no transactions", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByText("거래 내역이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("선택한 기간에 해당 계좌의 거래가 없어요.")).toBeInTheDocument();
  });

  it("renders transactions without wallet name (showWallet=false)", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage([makeTx(1)], 1));

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByText("식비")).toBeInTheDocument();
    // wallet name should NOT appear inside the transaction row (showWallet=false)
    // wallet name "생활통장" appears only in the header card, not in the tx row's sub-text
    const rows = screen.getAllByText("생활통장");
    // should appear exactly once (in the header, not in the row's wallet sub-label)
    expect(rows).toHaveLength(1);
  });

  it("navigates to the detail page on row click", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage([makeTx(1)], 1));

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    await userEvent.click(await screen.findByText("식비"));
    expect(await screen.findByText("상세내역 화면")).toBeInTheDocument();
  });

  it("renders loading skeleton while fetching", () => {
    mockedTransactionApi.getTransactions.mockReturnValue(new Promise(() => undefined));

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(screen.getByLabelText("거래 내역을 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("renders error state with retry button", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    mockedTransactionApi.getTransactions.mockRejectedValue(new Error("network"));

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("거래 내역을 불러오지 못했습니다.");
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeInTheDocument();
  });

  it("retries on error button click", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    mockedTransactionApi.getTransactions
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    await userEvent.click(await screen.findByRole("button", { name: /다시 시도/ }, { timeout: 5000 }));
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalledTimes(2));
  });

  it("switches between 년/월/주 period tabs", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    await userEvent.click(await screen.findByRole("button", { name: "주" }));
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "년" }));
    await waitFor(() => expect(mockedTransactionApi.getTransactions).toHaveBeenCalled());
  });

  it("navigates to the detail page with editable + returnTo state", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage([makeTx(1)], 1));

    const StateProbe = () => {
      const location = useLocation();
      const state = location.state as { editable?: boolean; returnTo?: string } | null;
      return <div>상세내역 화면 (editable: {String(!!state?.editable)}, returnTo: {state?.returnTo ?? "none"})</div>;
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/accounts/1/transactions"]}>
          <Routes>
            <Route path="/accounts/:walletId/transactions" element={<WalletTransactionsPage walletType="ACCOUNT" />} />
            <Route path="/transactions/:id" element={<StateProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.click(await screen.findByText("식비"));
    expect(
      await screen.findByText("상세내역 화면 (editable: true, returnTo: /accounts/1/transactions)")
    ).toBeInTheDocument();
  });

  it("shows 더보기 button when more pages exist", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue({
      success: true,
      data: {
        items: Array.from({ length: 20 }, (_, i) => makeTx(i + 1)),
        total_count: 25,
        page: 1,
        limit: 20,
        period_summary: null
      },
      error: null
    });

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: createWrapper("ACCOUNT", "1")
    });

    expect(await screen.findByRole("button", { name: "더보기" })).toBeInTheDocument();
  });
});

describe("WalletTransactionsPage — CARD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedCardApi.getCards.mockResolvedValue(CARDS_DATA);
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
  });

  it("shows card name and period expense amount", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPageWithSummary(48200));

    render(<WalletTransactionsPage walletType="CARD" />, {
      wrapper: createWrapper("CARD", "2")
    });

    expect(await screen.findByText("신한카드")).toBeInTheDocument();
    expect(await screen.findByText(/48,200원/)).toBeInTheDocument();
  });

  it("renders empty state for card wallet", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPageWithSummary(0));

    render(<WalletTransactionsPage walletType="CARD" />, {
      wrapper: createWrapper("CARD", "2")
    });

    expect(await screen.findByText("거래 내역이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("선택한 기간에 해당 카드의 거래가 없어요.")).toBeInTheDocument();
  });
});

// 상세화면으로 이동했다가 Back(=POP 네비게이션)으로 돌아왔을 때, 선택 시점의 기간(년/월/주 및
// 기준 날짜)과 스크롤 위치가 유지되는지 검증한다. 상세화면의 실제 "뒤로" 버튼도 navigate(-1)을
// 호출하므로, 여기서는 그 동작을 흉내내는 최소한의 스텁으로 실제 POP 네비게이션을 재현한다.
describe("WalletTransactionsPage — 상세화면 Back 시 기간/스크롤 복원", () => {
  const DetailBackStub = () => {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate(-1)}>
        뒤로(상세)
      </button>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    mockedAccountApi.getAccounts.mockResolvedValue(ACCOUNTS_DATA);
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
  });

  it("restores the previously selected period(주) and scroll position after Back from the detail page", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage([makeTx(1)], 1));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    const router = createMemoryRouter(
      [
        { path: "/accounts/:walletId/transactions", element: <WalletTransactionsPage walletType="ACCOUNT" /> },
        { path: "/transactions/:id", element: <DetailBackStub /> }
      ],
      { initialEntries: ["/accounts/1/transactions"] }
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    // 기본값(월)으로 로드된 뒤, "주" 탭으로 전환한다.
    await screen.findByText("식비");
    await userEvent.click(screen.getByRole("button", { name: "주" }));
    await waitFor(() => {
      const lastCall = mockedTransactionApi.getTransactions.mock.calls.at(-1)?.[0];
      // 주 단위 조회는 시작일-종료일 차이가 6일이어야 한다(월 단위 조회와 구분하기 위한 확인).
      const diffDays =
        lastCall &&
        (new Date(lastCall.end_date!).getTime() - new Date(lastCall.start_date!).getTime()) / 86_400_000;
      expect(diffDays).toBe(6);
    });
    const weekCallArgs = mockedTransactionApi.getTransactions.mock.calls.at(-1)?.[0];

    // 사용자가 아래로 스크롤한 상태에서 항목을 선택했다고 가정한다.
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
    window.dispatchEvent(new Event("scroll"));

    // 상세화면으로 이동(PUSH) 후 다시 Back(POP)으로 돌아온다.
    await userEvent.click(screen.getByText("식비"));
    await userEvent.click(await screen.findByRole("button", { name: "뒤로(상세)" }));

    // 지갑 거래내역 화면으로 돌아왔는지 확인.
    await screen.findByText("식비");

    // 스크롤 위치가 선택 시점 값(420)으로 복원되어야 한다.
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 420);
    });

    // 기간이 "월"로 리셋되지 않고 "주" 조회가 다시 수행되어야 한다(같은 날짜 범위).
    await waitFor(() => {
      const lastCall = mockedTransactionApi.getTransactions.mock.calls.at(-1)?.[0];
      expect(lastCall?.start_date).toBe(weekCallArgs?.start_date);
      expect(lastCall?.end_date).toBe(weekCallArgs?.end_date);
    });
  });

  it("does not restore state and scrolls to top on a fresh (PUSH) entry", async () => {
    // 다른 walletId를 사용해, 앞 테스트에서 모듈 스코프에 남아있는 저장 상태(key="ACCOUNT:1")와
    // 우연히 겹치지 않도록 한다. (실제 앱에서는 페이지 새로고침마다 모듈이 새로 로드되므로 이런
    // 겹침이 발생하지 않지만, 같은 테스트 파일 안에서는 모듈이 재사용되기 때문에 분리가 필요하다.)
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage([makeTx(1)], 1));
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/accounts/9/transactions"]}>
            <Routes>
              <Route path="/accounts/:walletId/transactions" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    });

    await screen.findByText("식비");
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    // 기본 기간(월)으로 조회되어야 한다(주 단위가 아님).
    const lastCall = mockedTransactionApi.getTransactions.mock.calls.at(-1)?.[0];
    const diffDays =
      lastCall && (new Date(lastCall.end_date!).getTime() - new Date(lastCall.start_date!).getTime()) / 86_400_000;
    expect(diffDays).not.toBe(6);
  });
});

// 새로고침(F5)해도 이전에 보던 기간(년/월/주 탭 및 기준 날짜)이 유지되어야 한다(#353).
// periodType/baseDate를 URL 쿼리 파라미터(period, date)로 옮겼으므로, 그 값이 담긴 URL로
// 처음 마운트하는 것만으로(POP 네비게이션이나 모듈 메모리 없이) 올바른 기간이 조회되는지
// 검증한다 — 이는 실제 브라우저 새로고침과 동일한 상황이다(모듈 메모리는 항상 비어있고,
// 브라우저가 같은 URL을 다시 요청한다).
describe("WalletTransactionsPage — 새로고침(F5) 시 기간 유지", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mockedAccountApi.getAccounts.mockResolvedValue(ACCOUNTS_DATA);
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
  });

  it("reads periodType/baseDate from the URL on a fresh mount instead of resetting to the current month", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    render(<WalletTransactionsPage walletType="ACCOUNT" />, {
      wrapper: ({ children }: PropsWithChildren) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        });
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/accounts/1/transactions?period=year&date=2026-03-15"]}>
              <Routes>
                <Route path="/accounts/:walletId/transactions" element={children} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        );
      }
    });

    await waitFor(() => {
      const lastCall = mockedTransactionApi.getTransactions.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ start_date: "2026-01-01", end_date: "2026-12-31" });
    });

    expect(await screen.findByRole("button", { name: "년" })).toHaveClass("bg-[var(--color-primary)]");
  });

  // 회귀 테스트(#353 후속): 개발 서버/E2E는 <React.StrictMode>로 감싸져 있어 effect가 마운트 시
  // 두 번 실행된다. "최초 마운트에는 스킵" 플래그를 단순 boolean으로만 구현하면, 첫 번째 실행에서
  // 이미 플래그가 true로 바뀌어 두 번째 실행이 "진짜 변경"으로 오인되어 URL에 ?period=&date=가
  // 붙어버렸다(TransactionsPage의 동일한 버그와 같은 원인). "마지막으로 URL에 반영한 기간" 값을
  // 비교해서만 실제로 갱신하도록 고쳤다.
  it("does not add a period/date query even when effects double-invoke under StrictMode (dev/E2E parity)", async () => {
    mockedTransactionApi.getTransactions.mockResolvedValue(makeTxPage());

    const LocationProbe = () => {
      const location = useLocation();
      return <div data-testid="loc">{location.pathname}{location.search}</div>;
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/accounts/1/transactions"]}>
            <Routes>
              <Route
                path="/accounts/:walletId/transactions"
                element={
                  <>
                    <WalletTransactionsPage walletType="ACCOUNT" />
                    <LocationProbe />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>
    );

    expect(await screen.findByText("지갑 거래내역")).toBeInTheDocument();
    expect(screen.getByTestId("loc")).toHaveTextContent("/accounts/1/transactions");
    expect(screen.getByTestId("loc")).not.toHaveTextContent("?");
  });
});
