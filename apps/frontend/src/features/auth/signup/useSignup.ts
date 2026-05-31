import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import type { SignupRequest } from '../../../entities/auth/model/auth.types';

export const useSignup = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: (response) => {
      if (response.success) {
        navigate('/login', { replace: true });
      }
    },
    onError: (error: AxiosError) => {
      console.error('Signup failed', error);
    },
  });
};
