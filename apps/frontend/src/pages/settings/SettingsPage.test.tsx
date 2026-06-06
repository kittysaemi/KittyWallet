import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SettingsPage from ".";
import { settingsApi } from "../../entities/settings/api/settingsApi";
import { userApi } from "../../entities/user/api/userApi";

vi.mock("../../entities/settings/api/settingsApi", () => ({
  settingsApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn()
  }
}));

vi.mock("../../entities/user/api/userApi", () => ({
  userApi: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    withdraw: vi.fn()
  }
}));

vi.mock("../../entities/auth/api/authApi", () => ({
  authApi: {
    logout: vi.fn()
  }
}));

vi.mock("../../shared/storage/syncQueue", () => ({
  getPendingSyncCount: vi.fn().mockResolvedValue(0)
}));

const mockedSettingsApi = vi.mocked(settingsApi);
const mockedUserApi = vi.mocked(userApi);

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
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("SettingsPage app settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUserApi.getMe.mockResolvedValue({
      success: true,
      data: {
        user_id: 1,
        email: "test@example.com",
        nickname: "테스트사용자",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      },
      error: null
    });
    mockedSettingsApi.getSettings.mockResolvedValue({
      success: true,
      data: {
        settings: {
          theme: "dark",
          currency: "KRW",
          sync_enabled: true,
          transaction_list_page_size: 20
        },
        updated_at: "2026-01-02T00:00:00.000Z"
      },
      error: null
    });
  });

  it("shows loaded app settings", async () => {
    renderPage();

    expect(await screen.findByRole("radio", { name: "다크" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByLabelText("표시 통화")).toHaveValue("KRW");
    expect(screen.getByLabelText("거래 목록 페이지 크기")).toHaveValue("20");
  });

  it("saves changed settings", async () => {
    mockedSettingsApi.updateSettings.mockResolvedValue({
      success: true,
      data: {
        settings: {
          theme: "light",
          currency: "KRW",
          sync_enabled: true,
          transaction_list_page_size: 20
        },
        updated_at: "2026-01-03T00:00:00.000Z"
      },
      error: null
    });

    renderPage();

    await userEvent.click(await screen.findByRole("radio", { name: "라이트" }));
    await userEvent.click(screen.getByRole("button", { name: "앱 설정 저장" }));

    await waitFor(() =>
      expect(mockedSettingsApi.updateSettings).toHaveBeenCalledWith({
        settings: {
          theme: "light",
          currency: "KRW",
          sync_enabled: true,
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

    await userEvent.click(await screen.findByRole("radio", { name: "라이트" }));
    await userEvent.click(screen.getByRole("button", { name: "앱 설정 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 설정값입니다.");
  });
});
