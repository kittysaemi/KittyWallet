import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import { useAuthStore } from '../../../entities/auth/store/authStore';
import { SignupRequest } from '../../../entities/auth/model/auth.types';

export const useSignup = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setAuth(response.data.accessToken, response.data.user);
        navigate('/dashboard');
      }
    },
    onError: (error: AxiosError) => {
      console.error('Signup failed', error);
    },
  });
};
