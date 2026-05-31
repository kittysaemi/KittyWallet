import { apiClient } from '../../../shared/api/apiClient';
import { ApiResponse, LoginRequest, SignupRequest, User } from '../model/auth.types';

interface AuthData {
  accessToken: string;
  user: User;
}

interface SignupData {
  userId: number;
  email: string;
  nickname: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<AuthData>> => {
    const response = await apiClient.post<ApiResponse<AuthData>>('/auth/login', data);
    return response.data;
  },

  signup: async (data: SignupRequest): Promise<ApiResponse<SignupData>> => {
    const response = await apiClient.post<ApiResponse<SignupData>>('/auth/signup', data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<AuthData>> => {
    const response = await apiClient.post<ApiResponse<AuthData>>('/auth/refresh');
    return response.data;
  },
};
