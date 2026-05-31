import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../../../entities/auth/api/authApi';
import { SignupRequest } from '../../../entities/auth/model/auth.types';

export const useSignup = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: (response) => {
      if (response.success) {
        // 회원가입 API는 토큰을 반환하지 않으므로 로그인 화면으로 이동
        navigate('/login');
      }
    },
    onError: (error: AxiosError) => {
      console.error('Signup failed', error);
    },
  });
};
