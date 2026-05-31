export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  password_confirm: string;
  nickname: string;
}

export interface AuthUser {
  userId: number;
  nickname: string;
}

export interface AuthData {
  access_token: string;
  user: { user_id: number; nickname: string };
}

export interface SignupData {
  userId: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}
