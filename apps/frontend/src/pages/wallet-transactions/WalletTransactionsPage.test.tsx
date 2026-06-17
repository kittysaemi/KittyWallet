import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WalletTransactionsPage from "./WalletTransactionsPage";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";

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
        icon_id: null,
        initial_balance: 0,
        current_balance: 320000,
        allow_negative_balance: false,
        negative_balance_limit: null,
        use_yn: true,
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
        icon_id: null,
        use_yn: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z"
      }
    ]
  },
  error: null
};

const makeTxPage = (items = [] as object[], total_count = 0) => ({
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

const makeTx = (id: number) => ({
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
