import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from "axios";
import { toPublicErrorCode, type ApiErrorResponse, type ApiResponse, type HealthStatus } from "@kittywallet/shared-types";

export const API_V1_PREFIX = "/api/v1";

export type TokenProvider = () => string | null | Promise<string | null>;

export type RefreshTokenHandler = () => Promise<string | null>;

export type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: TokenProvider;
  refreshAccessToken?: RefreshTokenHandler;
};

export type KittyWalletApiClient = {
  http: AxiosInstance;
  health: {
    getHealth: () => Promise<HealthStatus>;
  };
};

export function buildApiUrl(path: string, baseUrl = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${normalizedBaseUrl}${API_V1_PREFIX}${normalizedPath}`;
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null
  };
}

export function createErrorResponse(code: string, message: string): ApiErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      code: toPublicErrorCode(code),
      message
    }
  };
}

export function createApiClient(options: ApiClientOptions = {}): KittyWalletApiClient {
  const http = axios.create({
    baseURL: buildApiUrl("", options.baseUrl),
    headers: {
      "Content-Type": "application/json"
    }
  });

  http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await options.getAccessToken?.();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (AxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (
        error.response?.status === 401 &&
        !originalRequest?._retry &&
        options.refreshAccessToken
      ) {
        const refreshedToken = await options.refreshAccessToken();

        if (refreshedToken && originalRequest) {
          originalRequest._retry = true;
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${refreshedToken}`
          };

          return http.request(originalRequest);
        }
      }

      const statusCode = error.response?.status ? String(error.response.status) : "NETWORK_ERROR";
      const message = error.message || "API request failed";

      return Promise.reject(createErrorResponse(statusCode, message));
    }
  );

  return {
    http,
    health: {
      async getHealth(): Promise<HealthStatus> {
        const response = await http.get<HealthStatus>("/health");

        return response.data;
      }
    }
  };
}
