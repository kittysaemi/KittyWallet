import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionSearchPage from "./search";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import { transactionApi } from "../../entities/transaction/api/transactionApi";

vi.mock("../../shared/hooks/useTimezone", () => ({ useTimezone: () => "Asia/Seoul" }));
vi.mock("../../entities/account/api/accountApi", () => ({ accountApi: { getAccounts: vi.fn() } }));
vi.mock("../../entities/card/api/cardApi", () => ({ cardApi: { getCards: vi.fn() } }));
vi.mock("../../entities/category/api/categoryApi", () => ({ categoryApi: { getCategories: vi.fn() } }));
vi.mock("../../entities/icon/api/iconApi", () => ({ iconApi: { getIcons: vi.fn() } }));
vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: { getTransactions: vi.fn() }
}));

const empty = { success: true as const, data: { items: [] }, error: null };

const makeTx = (id: number, memo: string) => ({
  transaction_id: id,
  wallet_type: "CARD" as const,
  wallet_id: 1,
  wallet_name: "삼성카드",
  wallet_deleted: false,
  category_id: 1,
  category_name: "마운자로",
  transaction_type: "EXPENSE" as const,
  amount: 1000,
  memo,
  transaction_date: "2025-01-10",
  created_at: "2025-01-10T00:00:00.000Z",
  updated_at: "2025-01-10T00:00:00.000Z"
});

const listPage = (items: ReturnType<typeof makeTx>[], total: number, page: number) => ({
  success: true as const,
  data: { items, page, limit: 50, total_count: total },
  error: null
});

// jsdom에는 IntersectionObserver가 없으므로, 목록 끝 감지 요소가 보이는 상황을 직접 발생시킨다.
let intersect: (() => void) | null = null;
class MockIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    intersect = () =>
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  disconnect() {
    intersect = null;
  }
}

function createWrapper(tab: "browse" | "keyword" = "keyword") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/transactions/search?tab=${tab}`]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("거래 검색 - 키워드 검색 (#353)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.mocked(accountApi.getAccounts).mockResolvedValue(empty as never);
    vi.mocked(cardApi.getCards).mockResolvedValue(empty as never);
    vi.mocked(categoryApi.getCategories).mockResolvedValue(empty as never);
    vi.mocked(iconApi.getIcons).mockResolvedValue(empty as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("키워드를 서버 검색 조건으로 보내고, 최근 거래가 아니라 서버가 찾은 결과를 표시한다", async () => {
    vi.mocked(transactionApi.getTransactions).mockResolvedValue(
      listPage([makeTx(1, "오래된 처방")], 1, 1) as never
    );
    render(<TransactionSearchPage />, { wrapper: createWrapper() });

    // 검색 화면은 탭 상태를 모듈 캐시에 보관하므로 이전 테스트의 입력값을 비우고 입력한다.
    await userEvent.clear(screen.getByPlaceholderText("검색어를 입력하세요"));
    await userEvent.type(screen.getByPlaceholderText("검색어를 입력하세요"), "마운자로");
    await userEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("오래된 처방")).toBeInTheDocument();
    expect(transactionApi.getTransactions).toHaveBeenLastCalledWith({
      keyword: "마운자로",
      page: 1,
      limit: 50
    });
    expect(screen.getByText("총 1건")).toBeInTheDocument();
  });

  it("목록 끝까지 스크롤하면 다음 페이지를 자동으로 이어 불러온다", async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) => makeTx(i + 1, `메모 ${i + 1}`));
    vi.mocked(transactionApi.getTransactions).mockImplementation(async (params) =>
      (params?.page === 2 ? listPage([makeTx(51, "메모 51")], 51, 2) : listPage(firstPage, 51, 1)) as never
    );
    render(<TransactionSearchPage />, { wrapper: createWrapper() });

    // 검색 화면은 탭 상태를 모듈 캐시에 보관하므로 이전 테스트의 입력값을 비우고 입력한다.
    await userEvent.clear(screen.getByPlaceholderText("검색어를 입력하세요"));
    await userEvent.type(screen.getByPlaceholderText("검색어를 입력하세요"), "마운자로");
    await userEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("50건 표시 중")).toBeInTheDocument();
    expect(screen.queryByText("메모 51")).not.toBeInTheDocument();

    act(() => intersect?.());

    expect(await screen.findByText("메모 51")).toBeInTheDocument();
    expect(transactionApi.getTransactions).toHaveBeenLastCalledWith({
      keyword: "마운자로",
      page: 2,
      limit: 50
    });
    expect(screen.getByText("총 51건")).toBeInTheDocument();
  });
});

describe("거래 검색 - 조회 탭 (#353)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.mocked(accountApi.getAccounts).mockResolvedValue(empty as never);
    vi.mocked(cardApi.getCards).mockResolvedValue(empty as never);
    vi.mocked(categoryApi.getCategories).mockResolvedValue(empty as never);
    vi.mocked(iconApi.getIcons).mockResolvedValue(empty as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 탭 버튼과 제출 버튼의 이름이 모두 "조회"라서 폼 제출 버튼을 골라 누른다.
  const clickSubmit = () =>
    userEvent.click(
      screen.getAllByRole("button", { name: "조회" }).find((b) => b.getAttribute("type") === "submit")!
    );

  it("기간 내 거래가 100건을 넘어도 스크롤하면 다음 결과를 이어 불러와 빠짐없이 표시한다", async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) => makeTx(i + 1, `조회 ${i + 1}`));
    const secondPage = Array.from({ length: 50 }, (_, i) => makeTx(i + 51, `조회 ${i + 51}`));
    vi.mocked(transactionApi.getTransactions).mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      if (page === 1) return listPage(firstPage, 101, 1) as never;
      if (page === 2) return listPage(secondPage, 101, 2) as never;
      return listPage([makeTx(101, "조회 101")], 101, 3) as never;
    });
    render(<TransactionSearchPage />, { wrapper: createWrapper("browse") });

    await clickSubmit();

    expect(await screen.findByText("50건 표시 중")).toBeInTheDocument();
    expect(transactionApi.getTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 50, start_date: expect.any(String), end_date: expect.any(String) })
    );

    act(() => intersect?.());
    expect(await screen.findByText("100건 표시 중")).toBeInTheDocument();

    act(() => intersect?.());
    expect(await screen.findByText("조회 101")).toBeInTheDocument();
    expect(screen.getByText("총 101건")).toBeInTheDocument();
    expect(transactionApi.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, limit: 50 }));
  });

  it("결과를 모두 불러오면 더 불러오지 않고 총 건수를 표시한다", async () => {
    vi.mocked(transactionApi.getTransactions).mockResolvedValue(listPage([makeTx(1, "조회 단건")], 1, 1) as never);
    render(<TransactionSearchPage />, { wrapper: createWrapper("browse") });

    await clickSubmit();

    expect(await screen.findByText("조회 단건")).toBeInTheDocument();
    expect(screen.getByText("총 1건")).toBeInTheDocument();
    expect(intersect).toBeNull();
    expect(transactionApi.getTransactions).toHaveBeenCalledTimes(1);
  });
});
