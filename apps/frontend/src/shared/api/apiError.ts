import { isAxiosError } from "axios";
import { PUBLIC_ERROR_CODES, isPublicErrorCode } from "../../../../../packages/shared-types/src/errorCodes";

interface ApiErrorResponse {
  error?: { code?: string };
}

export const CLIENT_ERROR_CODES = {
  network: PUBLIC_ERROR_CODES.network,
  offline: PUBLIC_ERROR_CODES.offline,
  unknown: PUBLIC_ERROR_CODES.internal
} as const;

export function getApiErrorCode(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const code = error.response?.data?.error?.code;
    if (isPublicErrorCode(code)) return code;
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
