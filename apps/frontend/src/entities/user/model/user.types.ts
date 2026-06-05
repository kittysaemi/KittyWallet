import type { ApiResponse } from '../../auth/model/auth.types';

export interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  user_id: number;
  nickname: string;
  updated_at: string;
}

export interface WithdrawData {
  withdrawn: boolean;
  withdrawn_at: string;
}

export type UserProfileResponse = ApiResponse<UserProfile>;
export type UpdateProfileResponse = ApiResponse<UpdateProfileData>;
export type WithdrawResponse = ApiResponse<WithdrawData>;
