import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TransactionReadOnlyRow } from "./TransactionReadOnlyRow";
import type { TransactionItem } from "../model/transaction.types";
import type { IconItem } from "../../icon/model/icon.types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const makeTx = (overrides: Partial<TransactionItem> = {}): TransactionItem => ({
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

const emptyIconMap = new Map<number, IconItem>();
const emptyCategoryIconMap = new Map<number, number>();

const renderRow = (props: Partial<Parameters<typeof TransactionReadOnlyRow>[0]> = {}) =>
  render(
    <TransactionReadOnlyRow
      tx={makeTx()}
      iconMap={emptyIconMap}
      categoryIconMap={emptyCategoryIconMap}
      {...props}
    />,
    { wrapper: MemoryRouter }
  );

describe("TransactionReadOnlyRow", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renders category name and date", () => {
    renderRow();
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText(/6월 1일/)).toBeInTheDocument();
  });

  it("shows expense amount in red with minus sign", () => {
    renderRow();
    expect(screen.getByText("-12,000원")).toBeInTheDocument();
  });

  it("shows income amount in blue with plus sign", () => {
    renderRow({ tx: makeTx({ transaction_type: "INCOME", amount: 50000 }) });
    expect(screen.getByText("+50,000원")).toBeInTheDocument();
  });

  it("renders memo beside category name when provided", () => {
    renderRow({ tx: makeTx({ memo: "점심" }) });
    expect(screen.getByText("점심")).toBeInTheDocument();
  });

  it("shows wallet name when showWallet is true (default)", () => {
    renderRow();
    expect(screen.getByText("생활통장")).toBeInTheDocument();
  });

  it("hides wallet name when showWallet is false", () => {
    renderRow({ showWallet: false });
    expect(screen.queryByText("생활통장")).not.toBeInTheDocument();
  });

  it("shows 삭제된 지갑 badge when wallet_deleted is true and showWallet is true", () => {
    renderRow({ tx: makeTx({ wallet_deleted: true }) });
    expect(screen.getByText("삭제된 지갑")).toBeInTheDocument();
  });

  it("does not show 삭제된 지갑 badge when showWallet is false", () => {
    renderRow({ tx: makeTx({ wallet_deleted: true }), showWallet: false });
    expect(screen.queryByText("삭제된 지갑")).not.toBeInTheDocument();
  });

  it("navigates to /transactions/:id on click", async () => {
    renderRow();
    await userEvent.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith("/transactions/1");
  });

  it("navigates to /transactions/:id on Enter keydown", async () => {
    renderRow();
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith("/transactions/1");
  });

  it("shows first letter of category as fallback when no icon", () => {
    renderRow({ tx: makeTx({ category_name: "교통" }) });
    expect(screen.getByText("교")).toBeInTheDocument();
  });
});
