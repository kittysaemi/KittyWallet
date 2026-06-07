import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import type { ResetPasswordRequest } from '../../../entities/auth/model/auth.types';

export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: (response) => {
      if (response.success) {
        navigate('/login', { replace: true });
      }
    },
    onError: (error: AxiosError) => {
      console.error('Reset password failed', error);
    },
  });
};
