import { apiClient } from '../../../shared/api/apiClient';
import type { UserProfileResponse, UpdateProfileResponse, WithdrawResponse } from '../model/user.types';

export const userApi = {
  getMe: async (): Promise<UserProfileResponse> => {
    const res = await apiClient.get<UserProfileResponse>('/users/me');
    return res.data;
  },

  updateProfile: async (nickname: string): Promise<UpdateProfileResponse> => {
    const res = await apiClient.put<UpdateProfileResponse>('/users/profile', { nickname });
    return res.data;
  },

  withdraw: async (): Promise<WithdrawResponse> => {
    const res = await apiClient.delete<WithdrawResponse>('/users/me', {
      data: { confirm_text: '탈퇴' },
    });
    return res.data;
  },
};
