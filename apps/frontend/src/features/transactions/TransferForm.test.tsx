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

  it("계좌이동 카테고리 상태와 무관하게 고정 아이콘과 라벨을 폼 상단에 표시한다 (#409)", async () => {
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    expect(await screen.findByText("계좌금액이동")).toBeInTheDocument();
    // 카테고리/아이콘 조회 없이 고정 아이콘(TRANSFER_ICON)을 바로 렌더링하므로 svg 존재 여부로 확인한다.
    const badge = screen.getByText("계좌금액이동").previousElementSibling;
    expect(badge?.querySelector("svg")).toBeInTheDocument();
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

  it("계좌 선택 시 각 계좌 select 아래에 현재/예상 잔액을 표시한다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");

    // 계좌 선택 전: 안내 문구
    expect(screen.getAllByText("계좌를 선택해주세요.")).toHaveLength(2);

    await user.selectOptions(fromSelect, "1");
    await user.selectOptions(toSelect, "2");

    // 금액 입력 전: 현재 잔액 표시
    expect(screen.getByText("생활통장 현재 잔액 100,000원")).toBeInTheDocument();
    expect(screen.getByText("저축통장 현재 잔액 50,000원")).toBeInTheDocument();

    await user.type(screen.getByLabelText("이동 금액"), "10000");

    // 금액 입력 후: 이동 후 예상 잔액 표시 (보내는 계좌는 차감, 받는 계좌는 가산)
    expect(screen.getByText("생활통장 이동 후 예상 잔액 90,000원")).toBeInTheDocument();
    expect(screen.getByText("저축통장 이동 후 예상 잔액 60,000원")).toBeInTheDocument();
  });

  it("잔액 부족(마이너스 비허용 계좌)이면 등록 버튼이 비활성화되고 보내는 계좌 잔액 안내에 초과 문구가 표시된다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(fromSelect, "1"); // 잔액 100,000원, 마이너스 비허용
    await user.selectOptions(toSelect, "2");
    await user.type(screen.getByLabelText("이동 금액"), "200000"); // 잔액 초과

    expect(screen.getByRole("button", { name: "계좌이동 등록" })).toBeDisabled();
    expect(screen.getByText(/잔액\/한도를 초과해서 등록할 수 없습니다/)).toBeInTheDocument();
    // 받는 계좌는 부족 경고 대상이 아니다.
    expect(screen.getByText(/저축통장 이동 후 예상 잔액/)).not.toHaveClass("text-[var(--color-danger)]");
  });

  it("방향 전환 버튼을 누르면 보내는/받는 계좌가 서로 바뀌고 두 잔액 안내도 즉시 갱신된다", async () => {
    const user = userEvent.setup();
    render(<TransferForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findAllByText("생활통장", { selector: "option" });
    const [fromSelect, toSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(fromSelect, "1");
    await user.selectOptions(toSelect, "2");
    await user.type(screen.getByLabelText("이동 금액"), "10000");

    expect(screen.getByText("생활통장 이동 후 예상 잔액 90,000원")).toBeInTheDocument();
    expect(screen.getByText("저축통장 이동 후 예상 잔액 60,000원")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "보내는 계좌와 받는 계좌 서로 바꾸기" }));

    expect((fromSelect as HTMLSelectElement).value).toBe("2");
    expect((toSelect as HTMLSelectElement).value).toBe("1");
    // 스왑 후: 저축통장이 보내는 계좌(차감), 생활통장이 받는 계좌(가산)
    expect(screen.getByText("저축통장 이동 후 예상 잔액 40,000원")).toBeInTheDocument();
    expect(screen.getByText("생활통장 이동 후 예상 잔액 110,000원")).toBeInTheDocument();
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

  describe("삭제된 계좌가 포함된 수정 모드", () => {
    const baseInitialData = {
      transfer_group_id: "tg-1",
      from_account_id: 1,
      to_account_id: 2,
      amount: 10000,
      transaction_date: "2026-01-01",
      memo: "메모"
    };

    it("from_account_deleted가 true면 폼 전체가 읽기 전용으로 전환되고 삭제된 계좌명을 표시한다", async () => {
      render(
        <TransferForm
          onSuccess={vi.fn()}
          initialData={{
            ...baseInitialData,
            from_account_name: "폐쇄통장",
            from_account_deleted: true
          }}
        />,
        { wrapper: createWrapper() }
      );

      expect(await screen.findByText("삭제된 계좌가 포함된 내역이라 수정이 불가능합니다.")).toBeInTheDocument();
      expect(screen.getByText("폐쇄통장 [삭제됨]")).toBeInTheDocument();

      // select 대신 텍스트로 표시되므로 combobox는 받는 계좌 하나만 남는다.
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(1);
      expect(selects[0]).toBeDisabled();

      expect(screen.getByLabelText("이동 금액")).toBeDisabled();
      expect(screen.getByLabelText("날짜")).toBeDisabled();
      expect(screen.getByLabelText("메모 (선택)")).toBeDisabled();
      expect(screen.getByRole("button", { name: "수정 완료" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "보내는 계좌와 받는 계좌 서로 바꾸기" })).toBeDisabled();
    });

    it("to_account_deleted가 true면 폼 전체가 읽기 전용으로 전환되고 삭제된 계좌명을 표시한다", async () => {
      render(
        <TransferForm
          onSuccess={vi.fn()}
          initialData={{
            ...baseInitialData,
            to_account_name: "폐쇄통장2",
            to_account_deleted: true
          }}
        />,
        { wrapper: createWrapper() }
      );

      expect(await screen.findByText("삭제된 계좌가 포함된 내역이라 수정이 불가능합니다.")).toBeInTheDocument();
      expect(screen.getByText("폐쇄통장2 [삭제됨]")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "수정 완료" })).toBeDisabled();
    });

    it("삭제된 계좌가 없으면 읽기 전용 배너가 표시되지 않는다", async () => {
      render(
        <TransferForm
          onSuccess={vi.fn()}
          initialData={{ ...baseInitialData, from_account_deleted: false, to_account_deleted: false }}
        />,
        { wrapper: createWrapper() }
      );
      await screen.findAllByText("생활통장", { selector: "option" });
      expect(
        screen.queryByText("삭제된 계좌가 포함된 내역이라 수정이 불가능합니다.")
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "수정 완료" })).toBeEnabled();
    });
  });
});
