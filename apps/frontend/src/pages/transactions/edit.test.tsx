import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate
} from "react-router-dom";
import TransactionEditPage from "./edit";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import type { TransactionDetailItem } from "../../entities/transaction/model/transaction.types";

vi.mock("../../entities/transaction/api/transactionApi", () => ({
  transactionApi: {
    getTransaction: vi.fn(),
    getTransfer: vi.fn(),
    deleteTransaction: vi.fn(),
    deleteTransfer: vi.fn()
  }
}));

vi.mock("../../entities/settings/api/settingsApi", () => ({
  settingsApi: { getSettings: vi.fn().mockResolvedValue({ success: true, data: null, error: null }) }
}));

vi.mock("../../pwa/cache/cacheInvalidation", () => ({
  invalidateTransactionCaches: vi.fn().mockResolvedValue(undefined)
}));

// 실제 입력/네트워크 없이 "저장 성공" 시점만 재현하면 되므로 폼을 버튼 하나로 대체한다.
vi.mock("../../features/transactions/TransactionForm", () => ({
  TransactionForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      저장 완료(테스트)
    </button>
  )
}));
vi.mock("../../features/transactions/TransferForm", () => ({
  TransferForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      계좌이동 저장 완료(테스트)
    </button>
  )
}));

const mockedTransactionApi = vi.mocked(transactionApi);

const WALLET_PATH = "/accounts/1/transactions";

const makeTx = (overrides: Partial<TransactionDetailItem> = {}): TransactionDetailItem => ({
  transaction_id: 1,
  wallet_type: "ACCOUNT",
  wallet_id: 1,
  wallet_name: "생활통장",
  wallet_deleted: false,
  category_id: 10,
  category_name: "식비",
  transaction_type: "EXPENSE",
  amount: 12000,
  memo: null,
  transaction_date: "2026-06-01",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...overrides
});

// 지갑 거래내역 화면 -> 상세화면 -> 수정화면 순으로 push 하는 실제 흐름을 그대로 재현한다.
const WalletScreenProbe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <div>지갑 거래내역 화면</div>
      <button
        type="button"
        onClick={() =>
          navigate("/transactions/1", {
            state: { editable: true, returnTo: `${location.pathname}${location.search}` }
          })
        }
      >
        내역 선택
      </button>
    </div>
  );
};

const DetailScreenProbe = () => {
  const navigate = useNavigate();
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo;
  return (
    <div>
      <div>상세내역 화면</div>
      <button
        type="button"
        onClick={() =>
          navigate("/transactions/1/edit", returnTo ? { state: { returnTo } } : undefined)
        }
      >
        거래 수정
      </button>
    </div>
  );
};

const renderRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const router = createMemoryRouter(
    [
      { path: "/manage", element: <div>관리 화면</div> },
      { path: "/accounts/:walletId/transactions", element: <WalletScreenProbe /> },
      { path: "/transactions/:id", element: <DetailScreenProbe /> },
      { path: "/transactions/:id/edit", element: <TransactionEditPage /> },
      { path: "/transactions", element: <div>거래내역 목록 화면</div> }
    ],
    { initialEntries: ["/manage", WALLET_PATH], initialIndex: 1 }
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return router;
};

// 지갑 -> 상세 -> 수정 -> 완료(navigate(-2)) 한 사이클을 수행한다.
const runCycle = async (finish: "저장" | "삭제") => {
  await userEvent.click(screen.getByText("내역 선택"));
  await userEvent.click(await screen.findByText("거래 수정"));

  if (finish === "저장") {
    await userEvent.click(await screen.findByText("저장 완료(테스트)"));
    return;
  }

  await userEvent.click(await screen.findByLabelText("거래 삭제"));
  await userEvent.click(await screen.findByRole("button", { name: "삭제" }));
};

describe("TransactionEditPage — 저장/삭제 완료 후 히스토리 (#353)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTransactionApi.getTransaction.mockResolvedValue({
      success: true,
      data: makeTx(),
      error: null
    });
    mockedTransactionApi.deleteTransaction.mockResolvedValue({
      success: true,
      data: null,
      error: null
    });
  });

  it("수정을 두 번 반복해도 지갑 화면에서 뒤로가기 한 번이면 이전 화면으로 나간다", async () => {
    const router = renderRouter();

    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();

    await runCycle("저장");
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(WALLET_PATH);

    await runCycle("저장");
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(WALLET_PATH);

    // navigate(-2)는 순증가가 0이므로 몇 번을 반복해도 뒤로가기 한 번이면 지갑 화면을 벗어난다.
    await router.navigate(-1);
    expect(await screen.findByText("관리 화면")).toBeInTheDocument();
  });

  it("삭제를 두 번 반복해도 지갑 화면에서 뒤로가기 한 번이면 이전 화면으로 나간다", async () => {
    const router = renderRouter();

    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();

    await runCycle("삭제");
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();

    await runCycle("삭제");
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(WALLET_PATH);

    await router.navigate(-1);
    expect(await screen.findByText("관리 화면")).toBeInTheDocument();
  });
});
