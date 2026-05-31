import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import { useAuthStore } from '../../../entities/auth/store/authStore';
import type { LoginRequest } from '../../../entities/auth/model/auth.types';

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setAuth(response.data.access_token, response.data.user);
        const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
        navigate(from, { replace: true });
      }
    },
    onError: (error: AxiosError) => {
      console.error('Login failed', error);
    },
  });
};
