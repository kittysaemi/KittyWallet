import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import type { RequestResetPasswordRequest } from '../../../entities/auth/model/auth.types';

export const useRequestResetPassword = () =>
  useMutation({
    mutationFn: (data: RequestResetPasswordRequest) => authApi.requestResetPassword(data),
    onError: (error: AxiosError) => {
      console.error('Request reset password failed', error);
    },
  });
