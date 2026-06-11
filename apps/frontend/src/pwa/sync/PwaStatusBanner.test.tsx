import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { PwaStatusBanner } from "./PwaStatusBanner";
import { usePwaStore } from "../state/pwa.store";

function renderBanner() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PwaStatusBanner />
    </QueryClientProvider>
  );
}

describe("PwaStatusBanner", () => {
  beforeEach(() => {
    usePwaStore.setState({
      networkStatus: "online",
      syncStatus: "synced"
    });
  });

  it("shows a global offline banner", () => {
    usePwaStore.setState({ networkStatus: "offline" });

    renderBanner();

    expect(screen.getByText("현재 오프라인 상태예요. 저장한 내용은 연결 후 동기화됩니다."))
      .toBeInTheDocument();
  });

  it("shows syncing status while queue upload is running", () => {
    usePwaStore.setState({ syncStatus: "syncing" });

    renderBanner();

    expect(screen.getByText("동기화 중")).toBeInTheDocument();
  });

  it("hides the banner after online recovery and synced state", () => {
    renderBanner();

    expect(screen.queryByText("현재 오프라인 상태예요. 저장한 내용은 연결 후 동기화됩니다."))
      .not.toBeInTheDocument();
    expect(screen.queryByText("동기화 중")).not.toBeInTheDocument();
  });
});
