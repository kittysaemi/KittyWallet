import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ManagePage from ".";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: { getAccounts: vi.fn(), updateAccount: vi.fn(), deleteAccount: vi.fn(), createAccount: vi.fn() }
}));
vi.mock("../../entities/card/api/cardApi", () => ({
  cardApi: { getCards: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn(), createCard: vi.fn() }
}));
vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: { getCategories: vi.fn(), updateCategory: vi.fn(), createCategory: vi.fn() }
}));
vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn(),
    getCleanupCandidates: vi.fn(),
    deleteUnusedIcons: vi.fn()
  }
}));
vi.mock("../../pwa/cache/cacheInvalidation", () => ({
  invalidateAccountCaches: vi.fn(),
  invalidateCardCaches: vi.fn(),
  invalidateCategoryCaches: vi.fn()
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockedAccountApi = vi.mocked(accountApi);
const mockedCardApi = vi.mocked(cardApi);
const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

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

const EMPTY_CATEGORIES = { success: true, data: { items: [] }, error: null };
const EMPTY_ICONS = { success: true, data: { items: [] }, error: null };
const CLEANUP_CANDIDATES = {
  success: true,
  data: {
    items: [{ icon_id: 12, icon_code: "icon-old-edit", provider_type: "lucide", provider_key: "edit-2", preview: null, is_provider_available: false, can_register_again: false, created_at: "2026-01-01T00:00:00Z" }]
  },
  error: null
};

const createWrapper = (tab: "accounts" | "cards" | "icons" = "accounts") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/manage?tab=${tab}`]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

describe("ManagePage — 계좌/카드 거래내역 네비게이션 (#284)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockedAccountApi.getAccounts.mockResolvedValue(ACCOUNTS_DATA);
    mockedCardApi.getCards.mockResolvedValue(CARDS_DATA);
    mockedCategoryApi.getCategories.mockResolvedValue(EMPTY_CATEGORIES);
    mockedIconApi.getIcons.mockResolvedValue(EMPTY_ICONS);
    mockedIconApi.getCleanupCandidates.mockResolvedValue(CLEANUP_CANDIDATES);
    mockedIconApi.deleteUnusedIcons.mockResolvedValue({
      success: true,
      data: { deleted_count: 1, deleted_icon_ids: [12] },
      error: null
    });
  });

  it("계좌 항목 클릭 시 /accounts/:id/transactions 로 이동", async () => {
    render(<ManagePage />, { wrapper: createWrapper("accounts") });

    const accountItem = await screen.findByRole("button", { name: "생활통장 거래 내역으로 이동" });
    await userEvent.click(accountItem);

    expect(mockNavigate).toHaveBeenCalledWith("/accounts/1/transactions");
  });

  it("카드 항목 클릭 시 /cards/:id/transactions 로 이동", async () => {
    render(<ManagePage />, { wrapper: createWrapper("cards") });

    const cardItem = await screen.findByRole("button", { name: "신한카드 거래 내역으로 이동" });
    await userEvent.click(cardItem);

    expect(mockNavigate).toHaveBeenCalledWith("/cards/2/transactions");
  });

  it("계좌 아이콘 변경 버튼은 navigate를 호출하지 않음 (stopPropagation)", async () => {
    render(<ManagePage />, { wrapper: createWrapper("accounts") });

    await screen.findByRole("button", { name: "생활통장 거래 내역으로 이동" });
    const iconBtn = screen.getByRole("button", { name: "생활통장 아이콘 변경" });
    await userEvent.click(iconBtn);

    expect(mockNavigate).not.toHaveBeenCalledWith("/accounts/1/transactions");
  });

  it("계좌 삭제 버튼은 navigate를 호출하지 않음 (stopPropagation)", async () => {
    render(<ManagePage />, { wrapper: createWrapper("accounts") });

    await screen.findByRole("button", { name: "생활통장 거래 내역으로 이동" });
    const deleteBtn = screen.getByRole("button", { name: "생활통장 삭제" });
    await userEvent.click(deleteBtn);

    expect(mockNavigate).not.toHaveBeenCalledWith("/accounts/1/transactions");
  });

  it("카드 아이콘 변경 버튼은 navigate를 호출하지 않음 (stopPropagation)", async () => {
    render(<ManagePage />, { wrapper: createWrapper("cards") });

    await screen.findByRole("button", { name: "신한카드 거래 내역으로 이동" });
    const iconBtn = screen.getByRole("button", { name: "신한카드 아이콘 변경" });
    await userEvent.click(iconBtn);

    expect(mockNavigate).not.toHaveBeenCalledWith("/cards/2/transactions");
  });

  it("카드 삭제 버튼은 navigate를 호출하지 않음 (stopPropagation)", async () => {
    render(<ManagePage />, { wrapper: createWrapper("cards") });

    await screen.findByRole("button", { name: "신한카드 거래 내역으로 이동" });
    const deleteBtn = screen.getByRole("button", { name: "신한카드 삭제" });
    await userEvent.click(deleteBtn);

    expect(mockNavigate).not.toHaveBeenCalledWith("/cards/2/transactions");
  });

  it("계좌 이름 수정 버튼은 navigate를 호출하지 않음 (stopPropagation)", async () => {
    render(<ManagePage />, { wrapper: createWrapper("accounts") });

    await screen.findByRole("button", { name: "생활통장 거래 내역으로 이동" });
    const nameBtn = screen.getByRole("button", { name: "생활통장 이름 변경" });
    await userEvent.click(nameBtn);

    expect(mockNavigate).not.toHaveBeenCalledWith("/accounts/1/transactions");
  });

  it("계좌 목록이 렌더링된다", async () => {
    render(<ManagePage />, { wrapper: createWrapper("accounts") });

    expect(await screen.findByText("생활통장")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("계좌 목록")).toBeInTheDocument()
    );
  });

  it("카드 목록이 렌더링된다", async () => {
    render(<ManagePage />, { wrapper: createWrapper("cards") });

    expect(await screen.findByText("신한카드")).toBeInTheDocument();
  });

  it("미사용 아이콘을 선택하고 확인 후 삭제한다", async () => {
    const user = userEvent.setup();
    render(<ManagePage />, { wrapper: createWrapper("icons") });

    await user.click(await screen.findByRole("button", { name: "사용하지 않는 아이콘 정리" }));
    await user.click(await screen.findByRole("button", { name: "icon-old-edit 선택" }));
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));

    expect(screen.getByText("현재 아이콘 API에서 제공하지 않는 아이콘은 삭제 후 다시 등록할 수 없습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(mockedIconApi.deleteUnusedIcons).toHaveBeenCalledWith({ icon_ids: [12] })
    );
    expect(await screen.findByText("1개의 아이콘을 삭제했습니다.")).toBeInTheDocument();
  });
});
