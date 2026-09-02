import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TransferForm } from "./TransferForm";
import { accountApi } from "../../entities/account/api/accountApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";

vi.mock("../../shared/hooks/useTimezone", () => ({ useTimezone: () => "Asia/Seoul" }));

vi.mock("../../entities/account/api/accountApi", () => ({
  accountApi: { getAccounts: vi.fn() }
}));
vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: {
    createTransfer: vi.fn(),
    updateTransfer: vi.fn()
  }
}));

const accountA = {
  account_id: 1,
  account_name: "생활통장",
  icon_id: 0,
  initial_balance: 0,
  current_balance: 100000,
  allow_negative_balance: false,
  negative_balance_limit: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z"
};
const accountB = {
  ...accountA,
  account_id: 2,
  account_name: "저축통장",
  current_balance: 50000
};

const makeResponse = <T,>(items: T[]) => ({
  success: true as const,
  data: { items },
  error: null
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(accountApi.getAccounts).mockResolvedValue(makeResponse([accountA, accountB]));
});

describe("TransferForm", () => {
  it("renders 보내는/받는 계좌, 금액, 날짜, 메모 필드", async () => {
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    expect(await screen.findByText("보내는 계좌")).toBeInTheDocument();
    expect(screen.getByText("받는 계좌")).toBeInTheDocument();
    expect(screen.getByLabelText("이동 금액")).toBeInTheDocument();
    expect(screen.getByLabelText("날짜")).toBeInTheDocument();
    expect(screen.getByLabelText("메모 (선택)")).toBeInTheDocument();
  });

  it("보내는 계좌를 선택하면 받는 계좌 옵션에서 제외된다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await waitFor(() => expect(accountApi.getAccounts).toHaveBeenCalled());

    const selects = await screen.findAllByRole("combobox");
    const [fromSelect, toSelect] = selects;
    await user.selectOptions(fromSelect, "1");

    const toOptions = Array.from((toSelect as HTMLSelectElement).options).map((o) => o.value);
    expect(toOptions).not.toContain("1");
    expect(toOptions).toContain("2");
  });

  it("잔액 부족(마이너스 비허용 계좌)이면 등록 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(fromSelect, "1"); // 잔액 100,000원, 마이너스 비허용
    await user.selectOptions(toSelect, "2");
    await user.type(screen.getByLabelText("이동 금액"), "200000"); // 잔액 초과

    expect(screen.getByRole("button", { name: "계좌이동 등록" })).toBeDisabled();
    expect(screen.getByText(/잔액\/한도를 초과해서 등록할 수 없습니다/)).toBeInTheDocument();
  });

  it("방향 전환 버튼을 누르면 보내는/받는 계좌가 서로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(fromSelect, "1");
    await user.selectOptions(toSelect, "2");

    await user.click(screen.getByRole("button", { name: "보내는 계좌와 받는 계좌 서로 바꾸기" }));

    expect((fromSelect as HTMLSelectElement).value).toBe("2");
  });

  it("lockedFromAccountId가 있으면 보내는 계좌 선택이 비활성화된다", async () => {
    render(<TransferForm onSuccess={vi.fn()} lockedFromAccountId={1} />, { wrapper: createWrapper() });
    const [fromSelect] = await screen.findAllByRole("combobox");
    await waitFor(() => expect((fromSelect as HTMLSelectElement).value).toBe("1"));
    expect(fromSelect).toBeDisabled();
  });

  it("입력이 유효하면 저장 버튼이 활성화되고 제출 시 계좌이동 생성 API를 호출한다", async () => {
    const user = userEvent.setup();
    vi.mocked(transactionApi.createTransfer).mockResolvedValue({
      success: true,
      data: null,
      error: null
    });
    const onSuccess = vi.fn();
    render(<TransferForm onSuccess={onSuccess} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(fromSelect, "1");
    await user.selectOptions(toSelect, "2");
    await user.type(screen.getByLabelText("이동 금액"), "10000");

    const submitButton = screen.getByRole("button", { name: "계좌이동 등록" });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    await waitFor(() => expect(transactionApi.createTransfer).toHaveBeenCalled());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
