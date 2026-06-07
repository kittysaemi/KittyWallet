import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { authApi } from "../../entities/auth/api/authApi";
import ResetPasswordPage from ".";

vi.mock("../../entities/auth/api/authApi", () => ({
  authApi: {
    requestResetPassword: vi.fn(),
    resetPassword: vi.fn()
  }
}));

const mockedAuthApi = vi.mocked(authApi);

const renderPage = (initialEntry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>로그인 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
  });

  it("shows success guidance after requesting a reset link", async () => {
    mockedAuthApi.requestResetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null
    });

    renderPage("/reset-password");

    await userEvent.type(screen.getByLabelText("이메일"), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "재설정 링크 받기" }));

    await waitFor(() =>
      expect(mockedAuthApi.requestResetPassword).toHaveBeenCalledWith({
        email: "test@example.com"
      })
    );
    expect(await screen.findByText("이메일을 확인해주세요.")).toBeInTheDocument();
  });

  it("passes the URL token to the reset password API and moves to login on success", async () => {
    mockedAuthApi.resetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null
    });

    renderPage("/reset-password?token=reset-token-123");

    await userEvent.type(screen.getByLabelText("이메일"), "test@example.com");
    await userEvent.type(screen.getByLabelText("새 비밀번호"), "newPassword123");
    await userEvent.type(screen.getByLabelText("새 비밀번호 확인"), "newPassword123");
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    await waitFor(() =>
      expect(mockedAuthApi.resetPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        reset_token: "reset-token-123",
        new_password: "newPassword123",
        new_password_confirm: "newPassword123"
      })
    );
    expect(await screen.findByText("로그인 화면")).toBeInTheDocument();
  });

  it("shows validation errors before API calls", async () => {
    renderPage("/reset-password?token=reset-token-123");

    await userEvent.type(screen.getByLabelText("이메일"), "not-email");
    await userEvent.type(screen.getByLabelText("새 비밀번호"), "short");
    await userEvent.type(screen.getByLabelText("새 비밀번호 확인"), "other");
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    expect(await screen.findByText("올바른 이메일 형식이 아닙니다.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호는 8자 이상이어야 합니다.")).toBeInTheDocument();
    expect(mockedAuthApi.resetPassword).not.toHaveBeenCalled();
  });
});
