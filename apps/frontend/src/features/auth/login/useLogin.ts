import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import { useAuthStore } from '../../../entities/auth/store/authStore';
import type { LoginRequest } from '../../../entities/auth/model/auth.types';
import { clearUserApiCaches } from '../../../pwa/cache/cacheInvalidation';
import { deleteDb } from '../../../pwa/indexed-db/indexedDb.client';

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async (response) => {
      if (response.success && response.data) {
        queryClient.clear();
        await clearUserApiCaches();
        await deleteDb();
        setAuth(response.data.access_token, response.data.user);
        const redirect = searchParams.get("redirect");
        const fromState = (location.state as { from?: Location })?.from;
        const from = redirect ?? fromState?.pathname ?? '/dashboard';
        navigate(from, { replace: true });
      }
    },
    onError: (error: AxiosError) => {
      console.error('Login failed', error);
    },
  });
};
