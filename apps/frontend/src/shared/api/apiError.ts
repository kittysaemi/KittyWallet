import { isAxiosError } from "axios";

interface ApiErrorResponse {
  error?: { code?: string };
}

export const CLIENT_ERROR_CODES = {
  network: "NETWORK_001",
  offline: "OFFLINE_001",
  unknown: "INTERNAL_001"
} as const;

export function getApiErrorCode(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const code = error.response?.data?.error?.code;
    if (code) return code;
    if (!error.response) return CLIENT_ERROR_CODES.network;
  }
  return CLIENT_ERROR_CODES.unknown;
}

export function formatSupportError(code: string): string {
  return `오류입니다 #${code} 관리자에 문의하세요.`;
}

export function toSupportErrorMessage(error: unknown): string {
  return formatSupportError(getApiErrorCode(error));
}
