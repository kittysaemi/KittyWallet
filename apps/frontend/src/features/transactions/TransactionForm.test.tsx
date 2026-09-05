import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

describe("TransactionForm - 모바일 IME 힌트 (#353)", () => {
  it("메모 필드에 한글 IME 힌트 속성이 적용된다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const memo = await screen.findByLabelText("메모 (선택)");
    // 금액(inputmode=numeric, TYPE_CLASS_NUMBER)에서 메모(TYPE_CLASS_TEXT)로 포커스가
    // 옮겨갈 때 EditorInfo에 라틴 전용 힌트가 섞이지 않도록 한다.
    expect(memo).toHaveAttribute("lang", "ko");
    expect(memo).toHaveAttribute("inputmode", "text");
    expect(memo).toHaveAttribute("autocapitalize", "off");
    expect(memo).toHaveAttribute("autocorrect", "off");
    expect(memo).toHaveAttribute("spellcheck", "false");
  });

  it("금액 필드는 숫자 키패드를 유지하면서 라틴 입력 보조 기능을 끈다", async () => {
    render(<TransactionForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    const amount = await screen.findByLabelText("금액");
    expect(amount).toHaveAttribute("inputmode", "numeric");
    expect(amount).toHaveAttribute("autocapitalize", "off");
    expect(amount).toHaveAttribute("autocorrect", "off");
    expect(amount).toHaveAttribute("autocomplete", "off");
  });
});
