import type { PropsWithChildren } from "react";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetCalculatorModal, BUDGET_CALCULATOR_SOURCE_QUERY_KEY } from "./BudgetCalculatorModal";
import { budgetCalculatorApi } from "../../../entities/dashboard/api/budgetCalculatorApi";
import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";
import { accountApi } from "../../../entities/account/api/accountApi";
import { settingsApi } from "../../../entities/settings/api/settingsApi";
import { usePwaStore } from "../../../pwa/state/pwa.store";

vi.mock("../../../entities/dashboard/api/budgetCalculatorApi", () => ({
  budgetCalculatorApi: { getSource: vi.fn() }
}));
vi.mock("../../../entities/account/api/accountApi", () => ({
  accountApi: { getAccounts: vi.fn() }
}));
vi.mock("../../../entities/settings/api/settingsApi", () => ({
  settingsApi: { getSettings: vi.fn() }
}));

const mockedBudgetApi = vi.mocked(budgetCalculatorApi);
const mockedAccountApi = vi.mocked(accountApi);
const mockedSettingsApi = vi.mocked(settingsApi);

const source: BudgetCalculatorSource = {
  base_period: { year: 2026, month: 9, start_date: "2026-09-01", end_date: "2026-09-30" },
  next_period: { year: 2026, month: 10, start_date: "2026-10-01", end_date: "2026-10-31" },
  balance_date: "2026-09-20",
  accounts: [
    { account_id: 1, account_name: "CMA_RP", balance: 3_000_000 },
    { account_id: 2, account_name: "생활비 통장", balance: 100_000 }
  ],
  cards: [{ card_id: 5, card_name: "신한카드" }],
  cash_same_use_expenses: [
    { transaction_id: 1, account_id: 2, account_name: "생활비 통장", category_name: "관리비", memo: null, transaction_date: "2026-09-10", amount: 300_000 }
  ],
  base_period_card_expenses: [
    { transaction_id: 2, card_id: 5, category_name: "쇼핑", memo: null, transaction_date: "2026-09-18", amount: 500_000, interest: 0, total_amount: 500_000 }
  ],
  next_period_installments: [
    { item_id: "installment-20-4", card_id: 5, category_name: "가전", memo: "냉장고", transaction_date: "2026-10-10", installment_seq: 4, total_amount: 100_000 }
  ],
  card_fixed_expenses: [
    { transaction_id: 3, card_id: 5, category_name: "통신", memo: null, transaction_date: "2026-09-25", total_amount: 50_000 }
  ]
};

let queryClient: QueryClient;
function createWrapper() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

function renderModal(onClose = vi.fn()) {
  const utils = render(<BudgetCalculatorModal onClose={onClose} />, { wrapper: createWrapper() });
  return { ...utils, onClose };
}

async function fillInputs(user: ReturnType<typeof userEvent.setup>, income = "3000000") {
  await screen.findByRole("option", { name: /CMA_RP/ });
  await user.selectOptions(screen.getByLabelText("기준 계좌"), "1");
  await user.type(screen.getByLabelText("최소 유지금액"), "3000000");
  await user.clear(screen.getByLabelText("다음 달 예상 수입"));
  await user.type(screen.getByLabelText("다음 달 예상 수입"), income);
}

function resultCards() {
  return within(screen.getByRole("list", { name: "계산 결과" })).getAllByRole("listitem");
}

describe("BudgetCalculatorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T03:00:00.000Z"));
    usePwaStore.setState({ networkStatus: "online" });
    mockedSettingsApi.getSettings.mockResolvedValue({
      success: true,
      data: { settings: { timezone: "Asia/Seoul" } },
      error: null
    } as never);
    mockedAccountApi.getAccounts.mockResolvedValue({
      success: true,
      data: {
        items: [
          { account_id: 1, account_name: "CMA_RP", icon_id: 1, initial_balance: 0, current_balance: 1_200_000, allow_negative_balance: false, negative_balance_limit: 0, created_at: "", updated_at: "" },
          { account_id: 2, account_name: "생활비 통장", icon_id: 1, initial_balance: 0, current_balance: 0, allow_negative_balance: false, negative_balance_limit: 0, created_at: "", updated_at: "" }
        ]
      },
      error: null
    });
    mockedBudgetApi.getSource.mockResolvedValue({ success: true, data: source, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("처음 열면 이번 달을 선택하고 오늘 기준 잔액으로 조회하며, 다음 달로 이동할 수 없다", async () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "예산 계산기" })).toBeInTheDocument();
    expect(screen.getByText("2026년 9월")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 달" })).toBeDisabled();
    expect(screen.queryByLabelText("잔액 기준일")).not.toBeInTheDocument();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledWith("2026-09", undefined));
    // 원본을 불러온 뒤 처음 결과 영역에는 결과 대신 입력 안내만 표시한다.
    expect(await screen.findByText("입력 후 계산하기를 누르면 결과가 표시됩니다.")).toBeInTheDocument();
  });

  it("지난달까지만 이동할 수 있고, 지난달이면 잔액 기준일을 입력해야 조회한다", async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "이전 달" }));

    expect(screen.getByText("2026년 8월")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 달" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음 달" })).toBeEnabled();
    const baseDateInput = screen.getByLabelText("잔액 기준일");
    expect(baseDateInput).toHaveAttribute("max", "2026-09-20");
    expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1);

    // 기준일 없이 계산하기를 누르면 입력 안내를 표시한다.
    await user.click(screen.getByRole("button", { name: "계산하기" }));
    expect(screen.getByText("잔액 기준일을 입력해 주세요.")).toBeInTheDocument();

    fireEvent.change(baseDateInput, { target: { value: "2026-08-31" } });

    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledWith("2026-08", "2026-08-31"));
  });

  it("오늘 이후 잔액 기준일은 막고 조회하지 않는다", async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "이전 달" }));

    fireEvent.change(screen.getByLabelText("잔액 기준일"), { target: { value: "2026-09-21" } });

    expect(screen.getByText("오늘 이후 날짜는 잔액 기준일로 선택할 수 없습니다.")).toBeInTheDocument();
    expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1);
  });

  it("기준 계좌 목록에 계좌명과 현재 잔액을 함께 표시한다", async () => {
    renderModal();

    expect(await screen.findByRole("option", { name: "CMA_RP · 1,200,000원" })).toBeInTheDocument();
  });

  it("필수 입력이 없으면 계산하지 않고 필드별 오류를 표시한다", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByRole("option", { name: /CMA_RP/ });

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    expect(screen.getByText("기준 계좌를 선택해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("최소 유지금액을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("다음 달 예상 수입을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("세 결과를 정해진 순서와 공식으로 표시하고 계산에 쓴 항목 합계를 보여 준다", async () => {
    const user = userEvent.setup();
    renderModal();
    await fillInputs(user);

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    const cards = resultCards();
    // 1번: 3,000,000 - 300,000 - 500,000
    expect(cards[0]).toHaveTextContent("다음 달 수입 전 CMA_RP 예상 잔여금");
    expect(cards[0]).toHaveTextContent("2,200,000원");
    expect(cards[0]).toHaveTextContent("기준 잔액(2026-09-20) 3,000,000원");
    expect(cards[0]).toHaveTextContent("현금 동일 사용 300,000원");
    expect(cards[0]).toHaveTextContent("카드 사용액 500,000원");
    expect(cards[0]).toHaveTextContent("기준 계좌 재원으로 충당한다고 가정한 추정값");
    // 2번: max(0, 3,000,000 - 2,200,000)
    expect(cards[1]).toHaveTextContent("최소 유지금액을 지키기 위해 필요한 추가 예상 수입");
    expect(cards[1]).toHaveTextContent("800,000원");
    // 3번: max(0, 3,000,000 - 300,000 - 100,000 - 50,000) — 최소 유지금액을 빼지 않는다
    expect(cards[2]).toHaveTextContent("다음 달 추가 카드 사용 여유");
    expect(cards[2]).toHaveTextContent("2,550,000원");
    expect(cards[2]).toHaveTextContent("다음 달 할부 100,000원");
    expect(cards[2]).toHaveTextContent("카드 고정지출 50,000원");
  });

  it("1번이 마이너스이면 마이너스 그대로 표시한다", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByRole("option", { name: /생활비 통장/ });
    await user.selectOptions(screen.getByLabelText("기준 계좌"), "2");
    await user.type(screen.getByLabelText("최소 유지금액"), "0");
    await user.type(screen.getByLabelText("다음 달 예상 수입"), "0");

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    // 100,000 - 300,000 - 500,000
    expect(resultCards()[0]).toHaveTextContent("-700,000원");
  });

  it("예상 수입을 바꾼 뒤 다시 계산하면 팝업을 닫지 않고 결과를 교체한다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await fillInputs(user);
    await user.click(screen.getByRole("button", { name: "계산하기" }));

    await user.clear(screen.getByLabelText("다음 달 예상 수입"));
    await user.type(screen.getByLabelText("다음 달 예상 수입"), "2000000");
    // 계산하기를 다시 누르기 전에는 결과가 바뀌지 않는다.
    expect(resultCards()[2]).toHaveTextContent("2,550,000원");

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    const cards = resultCards();
    expect(cards).toHaveLength(3);
    // 2,000,000 - 300,000 - 100,000 - 50,000
    expect(cards[2]).toHaveTextContent("1,550,000원");
    expect(cards[0]).toHaveTextContent("2,200,000원");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("원본 조회에 실패하면 입력은 유지하고 재시도를 표시한다", async () => {
    const user = userEvent.setup();
    mockedBudgetApi.getSource.mockRejectedValueOnce(new Error("500"));
    renderModal();

    expect(await screen.findByText("계산에 필요한 내역을 불러오지 못했습니다. 다시 시도해 주세요.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("최소 유지금액"), "1000");
    expect(screen.getByRole("button", { name: "계산하기" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("option", { name: /CMA_RP/ })).toBeInTheDocument();
    expect(screen.getByLabelText("최소 유지금액")).toHaveValue("1,000");
  });

  it("팝업이 열린 상태에서 오프라인이 되면 계산을 막고 이전 결과를 표시하지 않는다", async () => {
    const user = userEvent.setup();
    renderModal();
    await fillInputs(user);
    await user.click(screen.getByRole("button", { name: "계산하기" }));
    expect(screen.getByRole("list", { name: "계산 결과" })).toBeInTheDocument();

    act(() => usePwaStore.setState({ networkStatus: "offline" }));

    expect(screen.getByText("온라인에서 계산할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계산하기" })).toBeDisabled();
    expect(screen.queryByRole("list", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("닫기 버튼·ESC·배경 탭으로 닫는다", async () => {
    const user = userEvent.setup();
    const { onClose, container } = renderModal();

    await user.click(screen.getByRole("button", { name: "닫기" }));
    await user.keyboard("{Escape}");
    await user.click(container.firstElementChild as HTMLElement);
    // 팝업 내부를 눌러도 닫히지 않는다.
    await user.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("배경 스크롤을 잠그고, 닫으면 원본 Query를 제거하며 입력·결과를 브라우저 저장소에 남기지 않는다", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe("hidden");

    await fillInputs(user);
    await user.click(screen.getByRole("button", { name: "계산하기" }));
    expect(queryClient.getQueryCache().findAll({ queryKey: BUDGET_CALCULATOR_SOURCE_QUERY_KEY })).toHaveLength(1);

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(queryClient.getQueryCache().findAll({ queryKey: BUDGET_CALCULATOR_SOURCE_QUERY_KEY })).toHaveLength(0);
    expect(setItem).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    setItem.mockRestore();
  });
});
