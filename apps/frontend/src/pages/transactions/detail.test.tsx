import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TransactionDetailPage from "./detail";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { TransactionDetailItem } from "../../entities/transaction/model/transaction.types";

vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: { getTransaction: vi.fn(), deleteTransaction: vi.fn() }
}));
vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: { getAccounts: vi.fn() }
}));
vi.mock("../../entities/card/api/cardApi", () => ({
  cardApi: { getCards: vi.fn() }
}));
vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: { getCategories: vi.fn() }
}));
vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: { getIcons: vi.fn() }
}));

const mockedTransactionApi = vi.mocked(transactionApi);
const mockedAccountApi = vi.mocked(accountApi);
const mockedCardApi = vi.mocked(cardApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

const EMPTY_CATEGORIES = { success: true, data: { items: [] }, error: null };
const EMPTY_ICONS = { success: true, data: { items: [] }, error: null };
const EMPTY_ACCOUNTS = { success: true, data: { items: [] }, error: null };
const EMPTY_CARDS = { success: true, data: { items: [] }, error: null };

const makeTx = (overrides: Partial<TransactionDetailItem> = {}): TransactionDetailItem => ({
  transaction_id: 1,
  wallet_type: "ACCOUNT",
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_deleted: false,
  category_id: 10,
  category_name: "식비",
  transaction_type: "EXPENSE",
  amount: 12000,
  memo: null,
  transaction_date: "2026-06-01",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...overrides
});

const renderDetail = (locationState?: Record<string, unknown>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/transactions/1", state: locationState }]}>
        <Routes>
          <Route path="/transactions/:id" element={children} />
          <Route path="/transactions/:id/edit" element={<div>거래 수정 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(<TransactionDetailPage />, { wrapper: Wrapper });
};

describe("TransactionDetailPage — edit icon visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
    mockedAccountApi.getAccounts.mockResolvedValue(EMPTY_ACCOUNTS);
    mockedCardApi.getCards.mockResolvedValue(EMPTY_CARDS);
  });

  it("does not show the edit icon when entered without editable state (e.g. dashboard 최근 내역)", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetail();

    expect(await screen.findByText("식비")).toBeInTheDocument();
    expect(screen.queryByLabelText("거래 수정")).not.toBeInTheDocument();
  });

  it("shows the edit icon when entered from 지갑 거래내역 (editable state)", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetail({ editable: true });

    expect(await screen.findByLabelText("거래 수정")).toBeInTheDocument();
  });

  it("navigates to the edit page when the edit icon is clicked", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetail({ editable: true });

    await userEvent.click(await screen.findByLabelText("거래 수정"));
    expect(await screen.findByText("거래 수정 화면")).toBeInTheDocument();
  });

  it("does not show the edit icon for a deleted wallet's transaction even with editable state", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({ wallet_deleted: true }),
      error: null
    });

    renderDetail({ editable: true });

    expect(await screen.findByLabelText("거래 삭제")).toBeInTheDocument();
    expect(screen.queryByLabelText("거래 수정")).not.toBeInTheDocument();
  });
});
