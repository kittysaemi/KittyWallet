import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../../entities/auth/store/authStore";

const axiosMocks = vi.hoisted(() => {
  const client = vi.fn();
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  Object.assign(client, {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse }
    }
  });

  return {
    client,
    create: vi.fn(() => client),
    post: vi.fn(),
    requestUse,
    responseUse
  };
});

vi.mock("axios", () => ({
  default: {
    create: axiosMocks.create,
    post: axiosMocks.post
  }
}));

import { apiClient, authExpiredRedirect } from "./apiClient";

describe("apiClient auth error handling", () => {
  beforeEach(() => {
    axiosMocks.client.mockReset();
    axiosMocks.post.mockReset();
    useAuthStore.getState().clearAuth();
  });

  it("clears auth and redirects to login when token refresh fails", async () => {
    const redirectSpy = vi.spyOn(authExpiredRedirect, "redirect").mockImplementation(() => {});
    useAuthStore.getState().setAuth("expired-token", { user_id: 1, nickname: "테스터" });
    axiosMocks.post.mockRejectedValueOnce(new Error("refresh expired"));

    const [, handleResponseError] = axiosMocks.responseUse.mock.calls[0] as [
      unknown,
      (error: AxiosError) => Promise<unknown>
    ];
    const originalRequest = {
      url: "/transactions",
      headers: {}
    } as InternalAxiosRequestConfig & { _retry?: boolean };

    await expect(
      handleResponseError({
        config: originalRequest,
        response: { status: 401 }
      } as AxiosError)
    ).rejects.toThrow("refresh expired");

    expect(apiClient).toBe(axiosMocks.client as unknown as AxiosInstance);
    expect(axiosMocks.post).toHaveBeenCalledWith(
      "/kittywallet/api/v1/auth/refresh",
      {},
      { withCredentials: true }
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired access token and retries the original request", async () => {
    useAuthStore.getState().setAuth("expired-token", { user_id: 1, nickname: "테스터" });
    axiosMocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { access_token: "new-token" },
        error: null
      }
    });
    axiosMocks.client.mockResolvedValueOnce({ data: { success: true, data: null, error: null } });

    const [, handleResponseError] = axiosMocks.responseUse.mock.calls[0] as [
      unknown,
      (error: AxiosError) => Promise<unknown>
    ];
    const originalRequest = {
      url: "/transactions",
      headers: {}
    } as InternalAxiosRequestConfig & { _retry?: boolean };

    await handleResponseError({
      config: originalRequest,
      response: { status: 401 }
    } as AxiosError);

    expect(apiClient).toBe(axiosMocks.client as unknown as AxiosInstance);
    expect(useAuthStore.getState().accessToken).toBe("new-token");
    expect(originalRequest.headers.Authorization).toBe("Bearer new-token");
    expect(axiosMocks.client).toHaveBeenCalledWith(originalRequest);
  });
});
