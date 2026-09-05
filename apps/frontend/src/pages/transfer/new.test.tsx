import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate
} from "react-router-dom";
import TransferNewPage from "./new";

// 실제 입력/네트워크 없이 "계좌이동 등록 성공" 시점만 재현하면 되므로 폼을 버튼 하나로 대체한다.
vi.mock("../../features/transactions/TransferForm", () => ({
  TransferForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      계좌이동 완료(테스트)
    </button>
  )
}));

const WALLET_PATH = "/accounts/1/transactions";

// 실제 WalletTransactionsPage의 "계좌이동" 버튼과 동일하게 push + state.returnTo 로 진입한다.
const WalletScreenProbe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <div>지갑 거래내역 화면</div>
      <button
        type="button"
        onClick={() =>
          navigate("/transfer/new?fromAccountId=1", {
            state: { returnTo: `${location.pathname}${location.search}` }
          })
        }
      >
        계좌이동
      </button>
    </div>
  );
};

const renderRouter = (initialEntries: string[], initialIndex: number) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const router = createMemoryRouter(
    [
      { path: "/manage", element: <div>관리 화면</div> },
      { path: "/accounts/:walletId/transactions", element: <WalletScreenProbe /> },
      { path: "/transfer/new", element: <TransferNewPage /> },
      { path: "/transactions", element: <div>거래내역 목록 화면</div> }
    ],
    { initialEntries, initialIndex }
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return router;
};

describe("TransferNewPage — 등록 완료 후 히스토리 (#353)", () => {
  it("계좌이동 등록을 두 번 반복해도 지갑 화면에서 뒤로가기 한 번이면 이전 화면으로 나간다", async () => {
    const router = renderRouter(["/manage", WALLET_PATH], 1);

    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();

    await userEvent.click(screen.getByText("계좌이동"));
    await userEvent.click(await screen.findByText("계좌이동 완료(테스트)"));
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(WALLET_PATH);

    await userEvent.click(screen.getByText("계좌이동"));
    await userEvent.click(await screen.findByText("계좌이동 완료(테스트)"));
    expect(await screen.findByText("지갑 거래내역 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(WALLET_PATH);

    // 두 번 등록했어도 뒤로가기 한 번이면 지갑 화면을 완전히 벗어난다.
    await router.navigate(-1);
    expect(await screen.findByText("관리 화면")).toBeInTheDocument();
  });

  it("returnTo 없이 진입한 경우에는 기존처럼 거래내역 목록으로 이동한다", async () => {
    const router = renderRouter(["/manage", "/transfer/new"], 1);

    await userEvent.click(await screen.findByText("계좌이동 완료(테스트)"));

    expect(await screen.findByText("거래내역 목록 화면")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/transactions");

    await router.navigate(-1);
    expect(await screen.findByText("관리 화면")).toBeInTheDocument();
  });
});
