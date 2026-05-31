import { apiClient } from '../../../shared/api/apiClient';
import type { LoginRequest, SignupRequest, AuthData, SignupData, ApiResponse } from '../model/auth.types';

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<AuthData>> => {
    const res = await apiClient.post<ApiResponse<AuthData>>('/auth/login', data);
    return res.data;
  },

  signup: async (data: SignupRequest): Promise<ApiResponse<SignupData>> => {
    const res = await apiClient.post<ApiResponse<SignupData>>('/auth/signup', data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<ApiResponse<{ access_token: string }>> => {
    const res = await apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh');
    return res.data;
  },
};
