import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import { useAuthStore } from '../../../entities/auth/store/authStore';
import { LoginRequest } from '../../../entities/auth/model/auth.types';

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setAuth(response.data.accessToken, response.data.user);
        // 원래 접근하려던 페이지로 이동, 없으면 /dashboard
        const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
        navigate(from, { replace: true });
      }
    },
    onError: (error: AxiosError) => {
      console.error('Login failed', error);
    },
  });
};
