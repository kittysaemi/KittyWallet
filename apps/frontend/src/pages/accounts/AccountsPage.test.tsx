import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AccountsPage from ".";
import { accountApi } from "../../entities/account/api/accountApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: {
    getAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

const mockedAccountApi = vi.mocked(accountApi);
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
      <MemoryRouter initialEntries={["/accounts"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const successAccounts = {
  success: true,
  data: {
    items: [
      {
        account_id: 1,
        account_name: "월급통장",
        icon_id: 10,
        initial_balance: 100000,
        current_balance: 120000,
        use_yn: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        account_id: 2,
        account_name: "비상금",
        icon_id: 11,
        initial_balance: 0,
        current_balance: 0,
        use_yn: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

const visibleIcons = {
  success: true,
  data: {
    items: [
      {
        icon_id: 10,
        icon_code: "wallet",
        provider_type: "lucide",
        provider_key: "wallet",
        show: true,
        is_default: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        icon_id: 11,
        icon_code: "piggy-bank",
        provider_type: "lucide",
        provider_key: "piggy-bank",
        show: true,
        is_default: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

describe("AccountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accounts and disables editing for inactive accounts", async () => {
    mockedAccountApi.getAccounts.mockResolvedValue(successAccounts);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<AccountsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("월급통장")).toBeInTheDocument();
    expect(screen.getByText("비상금")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "월급통장 이름 변경" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "비상금 이름 변경" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "비상금 아이콘 변경" })).toBeDisabled();
  });

  it("opens inline create form with 15 character name limit", async () => {
    mockedAccountApi.getAccounts.mockResolvedValue(successAccounts);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<AccountsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "계좌 등록" }));

    expect(screen.getByLabelText("계좌명")).toHaveAttribute("maxLength", "15");
    expect(screen.getByLabelText("초기 잔액")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계좌 아이콘 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("closes and resets inline account create form from cancel action", async () => {
    mockedAccountApi.getAccounts.mockResolvedValue(successAccounts);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<AccountsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "계좌 등록" }));
    await userEvent.type(screen.getByLabelText("계좌명"), "새계좌");
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByLabelText("계좌명")).not.toBeInTheDocument();
  });

  it("toggles account visibility from the row area", async () => {
    mockedAccountApi.getAccounts.mockResolvedValue(successAccounts);
    mockedAccountApi.updateAccount.mockResolvedValue({
      success: true,
      data: { account_id: 1, use_yn: false },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<AccountsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "월급통장 비활성화" }));

    await waitFor(() =>
      expect(mockedAccountApi.updateAccount).toHaveBeenCalledWith(1, { use_yn: false })
    );
  });

  it("edits active account name inline and opens icon picker popup", async () => {
    mockedAccountApi.getAccounts.mockResolvedValue(successAccounts);
    mockedAccountApi.updateAccount.mockResolvedValue({
      success: true,
      data: { account_id: 1, use_yn: true },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<AccountsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "월급통장 이름 변경" }));
    const input = screen.getByLabelText("월급통장 이름 수정");
    await userEvent.clear(input);
    await userEvent.type(input, "생활통장{enter}");

    await waitFor(() =>
      expect(mockedAccountApi.updateAccount).toHaveBeenCalledWith(1, {
        account_name: "생활통장"
      })
    );

    await userEvent.click(screen.getByRole("button", { name: "월급통장 아이콘 변경" }));
    expect(screen.getByText("계좌 아이콘 선택")).toBeInTheDocument();
  });
});
