import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TransactionForm } from "./TransactionForm";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";

vi.mock("../../shared/hooks/useTimezone", () => ({ useTimezone: () => "Asia/Seoul" }));

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
vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: {
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    convertToInstallment: vi.fn()
  }
}));
vi.mock("../../pwa/cache/cacheInvalidation", () => ({
  invalidateTransactionCaches: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../pwa/sync/syncQueue.service", () => ({
  runSyncQueue: vi.fn().mockResolvedValue(undefined)
}));

const mockAccount = {
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
const mockCard = {
  card_id: 1,
  card_name: "삼성카드",
  icon_id: 0,
  use_yn: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z"
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
  vi.mocked(accountApi.getAccounts).mockResolvedValue(makeResponse([mockAccount]));
  vi.mocked(cardApi.getCards).mockResolvedValue(makeResponse([mockCard]));
  vi.mocked(categoryApi.getCategories).mockResolvedValue(makeResponse([]));
  vi.mocked(iconApi.getIcons).mockResolvedValue(makeResponse([]));
  vi.mocked(transactionApi.createTransaction).mockResolvedValue({
    success: true,
    data: null,
    error: null
  } as never);
});

describe("TransactionForm - 카드할부 UI 노출 규칙", () => {
  it("계좌 지갑 기본 상태에서 할부 개월수 입력이 노출되지 않는다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findByRole("button", { name: "지갑 선택" });
    expect(screen.queryByLabelText("할부 개월수")).not.toBeInTheDocument();
  });

  it("카드 지갑 선택 시 할부 개월수 입력이 노출된다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "지갑 선택" }));
    await userEvent.click(await screen.findByRole("button", { name: "삼성카드" }));
    expect(screen.getByLabelText("할부 개월수")).toBeInTheDocument();
  });

  it("수입 거래 유형 선택 시 할부 개월수 입력이 노출되지 않는다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findByRole("button", { name: "지갑 선택" });
    await userEvent.click(screen.getByRole("button", { name: "수입" }));
    expect(screen.queryByLabelText("할부 개월수")).not.toBeInTheDocument();
  });

  it("카드에서 계좌로 변경 후 재선택 시 할부 개월수가 일시불로 초기화된다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await userEvent.click(await screen.findByRole("button", { name: "지갑 선택" }));
    await userEvent.click(await screen.findByRole("button", { name: "삼성카드" }));
    await userEvent.selectOptions(screen.getByLabelText("할부 개월수"), "3");
    expect((screen.getByLabelText("할부 개월수") as HTMLSelectElement).value).toBe("3");
    await userEvent.click(screen.getByRole("button", { name: "삼성카드" }));
    await userEvent.click(await screen.findByRole("button", { name: "생활통장" }));
    expect(screen.queryByLabelText("할부 개월수")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "생활통장" }));
    await userEvent.click(await screen.findByRole("button", { name: "삼성카드" }));
    expect((screen.getByLabelText("할부 개월수") as HTMLSelectElement).value).toBe("");
  });
});

describe("TransactionForm - IME 힌트 (#353)", () => {
  function stubPointer(coarse: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(pointer: coarse)" ? coarse : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("메모 필드에 한글 IME 힌트 속성이 적용된다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const memo = await screen.findByLabelText("메모 (선택)");
    expect(memo).toHaveAttribute("lang", "ko");
    expect(memo).toHaveAttribute("inputmode", "text");
    expect(memo).toHaveAttribute("autocapitalize", "off");
    expect(memo).toHaveAttribute("autocorrect", "off");
    expect(memo).toHaveAttribute("spellcheck", "false");
  });

  it("화면 키보드가 없는 데스크톱에서는 금액 필드에 inputmode를 붙이지 않는다", async () => {
    // Windows TSF는 inputmode="numeric"을 IS_DIGITS 스코프로 변환해 한글 IME를
    // 직접 입력(영문) 모드로 끈다. 데스크톱에서는 inputmode의 이점이 없으므로 생략한다.
    stubPointer(false);
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const amount = await screen.findByLabelText("금액");
    expect(amount).not.toHaveAttribute("inputmode");
    expect(amount).toHaveAttribute("autocomplete", "off");
  });

  it("화면 키보드가 있는 기기에서는 금액 필드에 숫자 키패드를 유지한다", async () => {
    stubPointer(true);
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const amount = await screen.findByLabelText("금액");
    expect(amount).toHaveAttribute("inputmode", "numeric");
    expect(amount).toHaveAttribute("autocomplete", "off");
  });

  it("inputmode 없이도 금액 입력은 숫자만 받고 천 단위로 포맷된다", async () => {
    stubPointer(false);
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const amount = await screen.findByLabelText("금액");
    await userEvent.type(amount, "12a34ㄱ5");
    expect((amount as HTMLInputElement).value).toBe("12,345");
  });
});

describe("TransactionForm - n월 현금 동일 사용 (#426)", () => {
  const mockCategory = { category_id: 1, category_name: "식비", icon_id: 0 };

  async function selectWallet(name: string) {
    await userEvent.click(await screen.findByRole("button", { name: "지갑 선택" }));
    await userEvent.click(await screen.findByRole("button", { name }));
  }

  it("지갑을 고르기 전에는 체크박스가 없고, 계좌 지출을 고르면 노출된다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await screen.findByRole("button", { name: "지갑 선택" });
    expect(screen.queryByRole("checkbox", { name: /현금 동일 사용/ })).not.toBeInTheDocument();

    await selectWallet("생활통장");
    expect(screen.getByRole("checkbox", { name: /현금 동일 사용/ })).not.toBeChecked();
  });

  it("라벨의 n은 거래 날짜의 다음 달이며 날짜를 바꾸면 갱신된다(12월 → 1월)", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await selectWallet("생활통장");

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-15" } });
    expect(screen.getByRole("checkbox", { name: "10월 현금 동일 사용" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2025-12-03" } });
    expect(screen.getByRole("checkbox", { name: "1월 현금 동일 사용" })).toBeInTheDocument();
  });

  it("카드 지갑이나 수입으로 바꾸면 체크박스를 숨긴다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await selectWallet("생활통장");
    expect(screen.getByRole("checkbox", { name: /현금 동일 사용/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "수입" }));
    expect(screen.queryByRole("checkbox", { name: /현금 동일 사용/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "지출" }));
    await userEvent.click(screen.getByRole("button", { name: "생활통장" }));
    await userEvent.click(await screen.findByRole("button", { name: "삼성카드" }));
    expect(screen.queryByRole("checkbox", { name: /현금 동일 사용/ })).not.toBeInTheDocument();
  });

  it("계좌 지출에서 체크 후 등록하면 next_month_cash_yn=true로 전송한다", async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue(makeResponse([mockCategory]) as never);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    await userEvent.type(screen.getByLabelText("금액"), "30000");
    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-15" } });
    await selectWallet("생활통장");
    await userEvent.click(screen.getByRole("button", { name: "카테고리 선택" }));
    await userEvent.click(await screen.findByRole("button", { name: "식비" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "10월 현금 동일 사용" }));
    await userEvent.click(screen.getByRole("button", { name: "거래 등록" }));

    expect(vi.mocked(transactionApi.createTransaction).mock.calls[0][0]).toMatchObject(
      { wallet_type: "ACCOUNT", amount: 30000, next_month_cash_yn: true }
    );
  });

  it("체크 후 카드로 바꿔 등록하면 next_month_cash_yn=false로 전송한다", async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue(makeResponse([mockCategory]) as never);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    await userEvent.type(screen.getByLabelText("금액"), "30000");
    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-15" } });
    await selectWallet("생활통장");
    await userEvent.click(screen.getByRole("checkbox", { name: "10월 현금 동일 사용" }));
    await userEvent.click(screen.getByRole("button", { name: "생활통장" }));
    await userEvent.click(await screen.findByRole("button", { name: "삼성카드" }));
    await userEvent.click(screen.getByRole("button", { name: "카테고리 선택" }));
    await userEvent.click(await screen.findByRole("button", { name: "식비" }));
    await userEvent.click(screen.getByRole("button", { name: "거래 등록" }));

    expect(vi.mocked(transactionApi.createTransaction).mock.calls[0][0]).toMatchObject(
      { wallet_type: "CARD", next_month_cash_yn: false }
    );
  });

  it("수정 화면에서는 저장된 체크 상태를 그대로 표시한다", async () => {
    render(
      <TransactionForm
        onSuccess={vi.fn()}
        transactionId={100}
        initialData={{
          transaction_id: 100,
          wallet_type: "ACCOUNT",
          wallet_id: 1,
          wallet_name: "생활통장",
          wallet_deleted: false,
          category_id: 1,
          category_name: "식비",
          transaction_type: "EXPENSE",
          amount: 30000,
          memo: null,
          transaction_date: "2026-09-15",
          next_month_cash_yn: true,
          created_at: "2026-09-15T00:00:00Z",
          updated_at: "2026-09-15T00:00:00Z"
        }}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole("checkbox", { name: "10월 현금 동일 사용" })).toBeChecked();
  });
});

describe("TransactionForm - 카테고리 선택 목록 정렬 (#353)", () => {
  it("기본/사용자 구분 없이 카테고리명 가나다순으로 표시한다", async () => {
    // API는 등록순(categoryId 오름차순)으로 반환한다
    vi.mocked(categoryApi.getCategories).mockResolvedValue(
      makeResponse([
        { category_id: 1, category_name: "식비", icon_id: 0 },
        { category_id: 2, category_name: "교통비", icon_id: 0 },
        { category_id: 20, category_name: "하늘", icon_id: 0 },
        { category_id: 21, category_name: "가게", icon_id: 0 }
      ]) as never
    );
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리 선택" }));
    await screen.findByRole("button", { name: "가게" });

    const expected = ["가게", "교통비", "식비", "하늘"];
    const optionNames = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "")
      .filter((name) => expected.includes(name));
    expect(optionNames).toEqual(expected);
  });
});
