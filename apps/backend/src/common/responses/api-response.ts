export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

export function errorResponse(code: string, message: string): ApiResponse<null> {
  return { success: false, data: null, error: { code, message } };
}
