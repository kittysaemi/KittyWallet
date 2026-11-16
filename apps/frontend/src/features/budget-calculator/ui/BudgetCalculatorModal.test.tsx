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
  period: { start_date: "2026-09-01", end_date: "2026-09-30" },
  balance_date: "2026-09-20",
  accounts: [
    { account_id: 1, account_name: "CMA_RP", balance: 3_000_000 },
    { account_id: 2, account_name: "생활비 통장", balance: 100_000 }
  ],
  card_total_amount: 500_000,
  card_transaction_count: 3
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

type User = ReturnType<typeof userEvent.setup>;

async function fillInputs(
  user: User,
  { income = "1000000", cash = "300000", minimum = "4000000", account = "1" } = {}
) {
  await screen.findByRole("option", { name: /CMA_RP/ });
  await user.selectOptions(screen.getByLabelText("기준 계좌"), account);
  await user.clear(screen.getByLabelText("예상 수입"));
  await user.type(screen.getByLabelText("예상 수입"), income);
  await user.clear(screen.getByLabelText("현금 고정지출"));
  await user.type(screen.getByLabelText("현금 고정지출"), cash);
  await user.clear(screen.getByLabelText("최소 유지금액"));
  await user.type(screen.getByLabelText("최소 유지금액"), minimum);
}

function resultCards() {
  return within(screen.getByRole("list", { name: "계산 결과" })).getAllByRole("listitem");
}

describe("BudgetCalculatorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    // 사용자 시간대(Asia/Seoul) 기준 오늘은 2026-09-20이다.
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

  it("처음 열면 계산 기간이 이번 달 1일~말일로 채워지고 그 기간으로 조회한다", async () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "예산 계산기" })).toBeInTheDocument();
    expect(screen.getByLabelText("시작일")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("종료일")).toHaveValue("2026-09-30");
    await waitFor(() =>
      expect(mockedBudgetApi.getSource).toHaveBeenCalledWith("2026-09-01", "2026-09-30")
    );
    // 원본을 불러온 뒤 처음 결과 영역에는 결과 대신 입력 안내만 표시한다.
    expect(await screen.findByText("입력 후 계산하기를 누르면 결과가 표시됩니다.")).toBeInTheDocument();
  });

  it("시작일은 오늘까지만 선택할 수 있고 종료일의 미래 날짜는 허용한다", async () => {
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));

    expect(screen.getByLabelText("시작일")).toHaveAttribute("max", "2026-09-20");
    // 기본 종료일(2026-09-30)은 미래 날짜이지만 오류가 없다.
    expect(screen.queryByText(/시작일은/)).not.toBeInTheDocument();
    expect(screen.queryByText("계산 기간을 입력해 주세요.")).not.toBeInTheDocument();
  });

  it("시작일이 오늘 이후이면 오류를 표시하고 조회하지 않는다", async () => {
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-21" } });

    expect(screen.getByText("시작일은 오늘 이후 날짜로 선택할 수 없습니다.")).toBeInTheDocument();
    expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1);
  });

  it("시작일이 종료일보다 늦으면 오류를 표시하고 조회하지 않는다", async () => {
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-08-31" } });

    expect(screen.getByText("시작일은 종료일보다 늦을 수 없습니다.")).toBeInTheDocument();
    expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1);
  });

  it("기간을 비우면 입력 안내를 표시하고, 기간이 유효하지 않으면 계산하지 않는다", async () => {
    const user = userEvent.setup();
    renderModal();
    await fillInputs(user);

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "" } });
    expect(screen.getByText("계산 기간을 입력해 주세요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "계산하기" }));

    expect(screen.queryByRole("list", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("기간을 바꾸면 바뀐 기간으로 다시 조회한다", async () => {
    renderModal();
    await waitFor(() => expect(mockedBudgetApi.getSource).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-08-15" } });

    await waitFor(() =>
      expect(mockedBudgetApi.getSource).toHaveBeenCalledWith("2026-08-15", "2026-12-31")
    );
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
    expect(screen.getByText("예상 수입을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("현금 고정지출을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("최소 유지금액을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("세 결과를 정해진 순서와 공식으로 표시하고 계산에 쓴 항목 합계를 보여 준다", async () => {
    const user = userEvent.setup();
    renderModal();
    await fillInputs(user);

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    const cards = resultCards();
    expect(cards).toHaveLength(3);
    // 예산 3,000,000 + 1,000,000 = 4,000,000 / 지출 500,000 + 300,000 = 800,000 / 남는 금액 3,200,000
    expect(within(cards[0]).getByText("남는 금액")).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("3,200,000원");
    expect(cards[0]).toHaveTextContent("계산 기간 2026-09-01 ~ 2026-09-30");
    expect(cards[0]).toHaveTextContent("예산 4,000,000원");
    expect(cards[0]).toHaveTextContent("기준 잔액(2026-09-20) 3,000,000원");
    expect(cards[0]).toHaveTextContent("예상 수입 1,000,000원");
    expect(cards[0]).toHaveTextContent("지출 800,000원");
    expect(cards[0]).toHaveTextContent("카드 사용액 500,000원");
    expect(cards[0]).toHaveTextContent("현금 고정지출 300,000원");
    expect(cards[0]).toHaveTextContent("남는 돈");
    // 2번: max(0, 800,000 - 4,000,000) = 0
    expect(within(cards[1]).getByText("추가로 필요한 금액")).toBeInTheDocument();
    expect(within(cards[1]).getByText("0원")).toBeInTheDocument();
    // 3번: max(0, 4,000,000 - 3,200,000)
    // 제목에 입력한 최소 유지금액이 들어간다.
    expect(within(cards[2]).getByText("4,000,000원을 유지하기 위해 필요한 금액")).toBeInTheDocument();
    expect(within(cards[2]).getByText("800,000원")).toBeInTheDocument();
    expect(cards[2]).toHaveTextContent("최소 유지금액 4,000,000원");
    expect(cards[2]).toHaveTextContent("남는 금액 3,200,000원");
  });

  it("예산이 모자라면 남는 금액을 마이너스 그대로 표시하고 추가로 필요한 금액을 보여 준다", async () => {
    const user = userEvent.setup();
    renderModal();
    await fillInputs(user, { account: "2", income: "0", cash: "0", minimum: "0" });

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    const cards = resultCards();
    // 예산 100,000 / 지출 500,000 / 남는 금액 -400,000
    expect(within(cards[0]).getByText("-400,000원")).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("모자라는 돈");
    expect(within(cards[1]).getByText("400,000원")).toBeInTheDocument();
    // 3번: max(0, 0 - (-400,000)), 최소 유지금액 0원이 제목에 들어간다.
    expect(within(cards[2]).getByText("0원을 유지하기 위해 필요한 금액")).toBeInTheDocument();
    expect(within(cards[2]).getByText("400,000원")).toBeInTheDocument();
  });

  it("예상 수입을 바꾼 뒤 다시 계산하면 팝업을 닫지 않고 결과를 교체한다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await fillInputs(user);
    await user.click(screen.getByRole("button", { name: "계산하기" }));
    expect(within(resultCards()[0]).getByText("3,200,000원")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("예상 수입"));
    await user.type(screen.getByLabelText("예상 수입"), "0");
    // 계산하기를 다시 누르기 전에는 결과가 바뀌지 않는다.
    expect(within(resultCards()[0]).getByText("3,200,000원")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "계산하기" }));

    const cards = resultCards();
    expect(cards).toHaveLength(3);
    // 예산 3,000,000 - 지출 800,000
    expect(within(cards[0]).getByText("2,200,000원")).toBeInTheDocument();
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
