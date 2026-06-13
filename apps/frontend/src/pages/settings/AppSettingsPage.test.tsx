import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { settingsApi } from "../../entities/settings/api/settingsApi";
import AppSettingsPage from "./app";

vi.mock("../../entities/settings/api/settingsApi", () => ({
  settingsApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn()
  }
}));

const mockedSettingsApi = vi.mocked(settingsApi);

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("AppSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute("data-theme");
    mockedSettingsApi.getSettings.mockResolvedValue({
      success: true,
      data: {
        settings: {
          theme: "mint",
          currency: "KRW",
          sync_enabled: true,
          timezone: "Asia/Seoul",
          transaction_list_page_size: 20
        },
        updated_at: "2026-01-02T00:00:00.000Z"
      },
      error: null
    });
  });

  it("shows loaded app settings and applies the theme", async () => {
    renderPage();

    const mintTheme = await screen.findByRole("radio", { name: /민트/ });
    await waitFor(() => expect(mintTheme).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByRole("button", { name: "뒤로" })).toBeInTheDocument();
    expect(screen.getByLabelText("표시 통화")).toHaveValue("KRW");
    expect(screen.queryByLabelText("거래내역 표시 개수")).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("mint");
  });

  it("restores the saved theme when leaving without saving", async () => {
    const { unmount } = renderPage();

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("mint"));
    await userEvent.click(await screen.findByRole("radio", { name: /라벤더/ }));
    expect(document.documentElement.dataset.theme).toBe("lavender");

    unmount();

    expect(document.documentElement.dataset.theme).toBe("mint");
  });

  it("previews and saves changed settings", async () => {
    mockedSettingsApi.updateSettings.mockResolvedValue({
      success: true,
      data: {
        settings: {
          theme: "lavender",
          currency: "KRW",
          sync_enabled: true,
          timezone: "Asia/Seoul",
          transaction_list_page_size: 20
        },
        updated_at: "2026-01-03T00:00:00.000Z"
      },
      error: null
    });

    renderPage();

    await userEvent.click(await screen.findByRole("radio", { name: /라벤더/ }));
    expect(document.documentElement.dataset.theme).toBe("lavender");

    await userEvent.click(screen.getByRole("button", { name: "앱 설정 저장" }));

    await waitFor(() =>
      expect(mockedSettingsApi.updateSettings).toHaveBeenCalledWith({
        settings: {
          theme: "lavender",
          currency: "KRW",
          sync_enabled: true,
          timezone: "Asia/Seoul",
          transaction_list_page_size: 20
        }
      })
    );
    expect(await screen.findByText("설정이 저장되었습니다.")).toBeInTheDocument();
  });

  it("shows save failure state", async () => {
    mockedSettingsApi.updateSettings.mockRejectedValue({
      response: {
        data: {
          error: {
            message: "지원하지 않는 설정값입니다."
          }
        }
      }
    });

    renderPage();

    await userEvent.click(await screen.findByRole("radio", { name: /라벤더/ }));
    await userEvent.click(screen.getByRole("button", { name: "앱 설정 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 설정값입니다.");
  });
});
