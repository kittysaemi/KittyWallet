import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TransactionDetailPage from "./detail";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { TransactionDetailItem } from "../../entities/transaction/model/transaction.types";

vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: { getTransaction: vi.fn(), deleteTransaction: vi.fn(), getTransfer: vi.fn() }
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

// 편집화면으로 넘어갈 때 location.state의 returnTo가 실제로 전달되는지 확인하기 위한 헬퍼.
// edit 라우트 엘리먼트가 자신이 받은 location.state.returnTo 값을 화면에 그대로 출력한다.
const EditRouteStateProbe = () => {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  return <div>거래 수정 화면 (returnTo: {returnTo ?? "none"})</div>;
};

const renderDetailWithEditProbe = (locationState?: Record<string, unknown>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/transactions/1", state: locationState }]}>
        <Routes>
          <Route path="/transactions/:id" element={children} />
          <Route path="/transactions/:id/edit" element={<EditRouteStateProbe />} />
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

  it("forwards returnTo to the edit page (e.g. 지갑 거래내역 화면 경로) so it can navigate back there after saving", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetailWithEditProbe({ editable: true, returnTo: "/accounts/1/transactions" });

    await userEvent.click(await screen.findByLabelText("거래 수정"));
    expect(await screen.findByText("거래 수정 화면 (returnTo: /accounts/1/transactions)")).toBeInTheDocument();
  });

  it("does not pass a returnTo when the detail page itself was not given one", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetailWithEditProbe({ editable: true });

    await userEvent.click(await screen.findByLabelText("거래 수정"));
    expect(await screen.findByText("거래 수정 화면 (returnTo: none)")).toBeInTheDocument();
  });
});

describe("TransactionDetailPage — 계좌이동 표시 (#409)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
    mockedAccountApi.getAccounts.mockResolvedValue(EMPTY_ACCOUNTS);
    mockedCardApi.getCards.mockResolvedValue(EMPTY_CARDS);
  });

  const transferResult = {
    transfer_group_id: "tg-1",
    from_transaction_id: 101,
    to_transaction_id: 102,
    from_account_id: 1,
    from_account_name: "생활통장",
    from_account_deleted: false,
    to_account_id: 2,
    to_account_name: "저축통장",
    to_account_deleted: false,
    amount: 30000,
    transaction_date: "2026-06-01",
    updated_at: "2026-06-01T00:00:00Z"
  };

  it("shows '계좌이동' as the transaction type (not 지출) when viewing the 출금 side", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({
        transaction_id: 101,
        category_name: "계좌금액이동",
        transaction_type: "EXPENSE",
        transfer_group_id: "tg-1"
      }),
      error: null
    });
    mockedTransactionApi.getTransfer.mockResolvedValue({ success: true, data: transferResult, error: null });

    renderDetail();

    expect(await screen.findByText("계좌이동")).toBeInTheDocument();
    expect(screen.queryByText("지출")).not.toBeInTheDocument();
    expect(mockedTransactionApi.getTransfer).toHaveBeenCalledWith("tg-1");
  });

  it("shows the 이동 경로 row (from → to) when viewing the 출금 side", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({
        transaction_id: 101,
        category_name: "계좌금액이동",
        transaction_type: "EXPENSE",
        transfer_group_id: "tg-1"
      }),
      error: null
    });
    mockedTransactionApi.getTransfer.mockResolvedValue({ success: true, data: transferResult, error: null });

    renderDetail();

    const label = await screen.findByText("이동 경로");
    const row = label.closest("div");
    expect(row?.textContent).toContain("생활통장");
    expect(row?.textContent).toContain("저축통장");
  });

  it("shows the 이동 경로 row in the same from → to order when viewing the 입금 side", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({
        transaction_id: 102,
        wallet_id: 2,
        wallet_name: "저축통장",
        category_name: "계좌금액이동",
        transaction_type: "INCOME",
        transfer_group_id: "tg-1"
      }),
      error: null
    });
    mockedTransactionApi.getTransfer.mockResolvedValue({ success: true, data: transferResult, error: null });

    renderDetail();

    expect(await screen.findByText("계좌이동")).toBeInTheDocument();
    expect(screen.queryByText("수입")).not.toBeInTheDocument();
    expect(await screen.findByText("이동 경로")).toBeInTheDocument();
    // from_account_id가 항상 "보낸 계좌"를 가리키므로 입금 쪽에서 봐도 순서는 그대로 생활통장 → 저축통장
    const row = (await screen.findByText("이동 경로")).closest("div");
    expect(row?.textContent).toContain("생활통장");
    expect(row?.textContent).toContain("저축통장");
    expect(row?.textContent?.indexOf("생활통장")).toBeLessThan(row?.textContent?.indexOf("저축통장") ?? -1);
  });

  it("appends [삭제됨] to a deleted account's name in 이동 경로", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({
        transaction_id: 101,
        category_name: "계좌금액이동",
        transaction_type: "EXPENSE",
        transfer_group_id: "tg-1"
      }),
      error: null
    });
    mockedTransactionApi.getTransfer.mockResolvedValue({
      success: true,
      data: { ...transferResult, to_account_deleted: true },
      error: null
    });

    renderDetail();

    expect(await screen.findByText(/저축통장 \[삭제됨\]/)).toBeInTheDocument();
  });

  it("omits the 이동 경로 row for a legacy transfer without transfer_group_id (category-name fallback)", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx({
        category_name: "계좌금액이동",
        transaction_type: "EXPENSE",
        transfer_group_id: null
      }),
      error: null
    });

    renderDetail();

    expect(await screen.findByText("계좌이동")).toBeInTheDocument();
    expect(mockedTransactionApi.getTransfer).not.toHaveBeenCalled();
    expect(screen.queryByText("이동 경로")).not.toBeInTheDocument();
  });

  it("shows 수입/지출 as before for a non-transfer transaction", async () => {
    mockedTransactionApi.getTransaction.mockResolvedValue({ success: true, data: makeTx(), error: null });

    renderDetail();

    expect(await screen.findByText("지출")).toBeInTheDocument();
    expect(screen.queryByText("계좌이동")).not.toBeInTheDocument();
    expect(screen.queryByText("이동 경로")).not.toBeInTheDocument();
    expect(mockedTransactionApi.getTransfer).not.toHaveBeenCalled();
  });
});
