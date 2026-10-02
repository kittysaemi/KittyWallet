import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoriteTransactionApi } from "../../entities/favorite-transaction/api/favoriteTransactionApi";
import type { FavoriteTransactionItem } from "../../entities/favorite-transaction/model/favoriteTransaction.types";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { FavoriteTransactionPickerSheet } from "./FavoriteTransactionPickerSheet";

vi.mock("../../entities/favorite-transaction/api/favoriteTransactionApi", () => ({
  FAVORITE_TRANSACTIONS_QUERY_KEY: ["favorite-transactions"],
  favoriteTransactionApi: { getFavoriteTransactions: vi.fn() }
}));

vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: { createTransaction: vi.fn() }
}));

vi.mock("../../shared/hooks/useTimezone", () => ({
  useTimezone: () => "Asia/Seoul"
}));

vi.mock("../../pwa/cache/cacheInvalidation", () => ({
  invalidateTransactionCaches: vi.fn()
}));

const mockedFavoriteTransactionApi = vi.mocked(favoriteTransactionApi);
const mockedTransactionApi = vi.mocked(transactionApi);

const makeFavorite = (
  overrides: Partial<FavoriteTransactionItem> = {}
): FavoriteTransactionItem => ({
  favorite_transaction_id: 1,
  transaction_type: "EXPENSE",
  wallet_type: "ACCOUNT",
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_use_yn: true,
  wallet_deleted: false,
  category_id: 1,
  category_name: "식비",
  category_show: true,
  amount: 9000,
  memo: "점심",
  balance_insufficient: false,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  ...overrides
});

function renderPicker(props: Partial<ComponentProps<typeof FavoriteTransactionPickerSheet>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const defaultProps: ComponentProps<typeof FavoriteTransactionPickerSheet> = {
    onClose: vi.fn(),
    onRegistered: vi.fn()
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <FavoriteTransactionPickerSheet {...defaultProps} {...props} />
      </QueryClientProvider>
    ),
    onClose: props.onClose ?? defaultProps.onClose,
    onRegistered: props.onRegistered ?? defaultProps.onRegistered
  };
}

describe("FavoriteTransactionPickerSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePwaStore.setState({ networkStatus: "online" });
    mockedFavoriteTransactionApi.getFavoriteTransactions.mockResolvedValue({
      success: true,
      data: { items: [makeFavorite()] },
      error: null
    });
  });

  it("선택한 항목을 오늘 날짜의 일반 거래로 등록하고 등록 완료를 알린다", async () => {
    mockedTransactionApi.createTransaction.mockResolvedValue({
      success: true,
      data: { transaction_id: 10, updated_at: "2026-10-02T00:00:00.000Z", synced_at: null },
      error: null
    });
    const onRegistered = vi.fn();
    renderPicker({ onRegistered });

    await userEvent.click(
      await screen.findByRole("button", { name: /지출.*9,000원.*생활통장.*식비.*점심/ })
    );

    await waitFor(() => expect(onRegistered).toHaveBeenCalledOnce());
    expect(mockedTransactionApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_type: "EXPENSE",
        wallet_type: "ACCOUNT",
        wallet_id: 1,
        category_id: 1,
        amount: 9000,
        memo: "점심",
        timezone: "Asia/Seoul",
        next_month_cash_yn: false,
        fixed_expense_yn: false
      })
    );
    expect(onRegistered.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("지갑 화면에서는 해당 지갑의 선택 가능 항목만 표시한다", async () => {
    mockedFavoriteTransactionApi.getFavoriteTransactions.mockResolvedValue({
      success: true,
      data: {
        items: [
          makeFavorite(),
          makeFavorite({
            favorite_transaction_id: 2,
            wallet_type: "CARD",
            wallet_id: 2,
            wallet_name: "신한카드",
            category_name: "교통",
            amount: 12000,
            memo: "버스"
          })
        ]
      },
      error: null
    });

    renderPicker({ wallet: { walletType: "CARD", walletId: 2 } });

    expect(await screen.findByText("신한카드")).toBeInTheDocument();
    expect(screen.queryByText("생활통장")).not.toBeInTheDocument();
  });

  it("오프라인 상태에서는 등록 선택이 비활성화된다", async () => {
    usePwaStore.setState({ networkStatus: "offline" });
    renderPicker();

    expect(
      await screen.findByRole("button", { name: /지출.*9,000원.*생활통장.*식비.*점심/ })
    ).toBeDisabled();
    expect(screen.getByText("오프라인에서는 자주 쓰는 거래를 등록할 수 없어요.")).toBeInTheDocument();
  });
});
