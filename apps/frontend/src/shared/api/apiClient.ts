import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../../entities/auth/store/authStore";

interface RefreshResponse {
  success: boolean;
  data: { access_token: string } | null;
  error: { code: string; message: string } | null;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

export const authExpiredRedirect = {
  redirect() {
    window.location.href = "/kittywallet/login?expired=1";
  }
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

const isOfflineRefreshFailure = (error: unknown): boolean =>
  typeof navigator !== "undefined" &&
  !navigator.onLine &&
  !(error as AxiosError | undefined)?.response;

export const apiClient = axios.create({
  baseURL: "/kittywallet/api/v1",
  withCredentials: true
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/signup");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<RefreshResponse>(
          "/kittywallet/api/v1/auth/refresh",
          {},
          { withCredentials: true }
        );

        if (response.data.success && response.data.data) {
          const { access_token } = response.data.data;
          const { user } = useAuthStore.getState();
          if (user) {
            useAuthStore
              .getState()
              .setAuth(access_token, { user_id: user.userId, nickname: user.nickname });
          }
          processQueue(null, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } else {
          throw new Error("Refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (isOfflineRefreshFailure(refreshError)) {
          return Promise.reject(refreshError);
        }
        useAuthStore.getState().clearAuth();
        authExpiredRedirect.redirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
