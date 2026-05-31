import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';
import { useSignup } from './useSignup';
import { ApiError } from '../../../entities/auth/model/auth.types';

const signupSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    nickname: z
      .string()
      .min(1, '닉네임을 입력해주세요.')
      .max(30, '닉네임은 30자 이하여야 합니다.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_001: '이미 가입된 이메일입니다.',
  AUTH_005: '비밀번호가 일치하지 않습니다.',
  VALIDATION_001: '입력값을 확인해주세요.',
};

export const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});

  const signupMutation = useSignup();

  const getServerError = (): string | null => {
    if (!signupMutation.error) return null;
    const axiosError = signupMutation.error as AxiosError<ApiError>;
    const code = axiosError.response?.data?.error?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (axiosError.response?.data?.error?.message) return axiosError.response.data.error.message;
    return '회원가입에 실패했습니다. 다시 시도해주세요.';
  };

  const getResponseError = (): string | null => {
    const mutationData = signupMutation.data;
    if (mutationData && !mutationData.success && mutationData.error) {
      const errCode = mutationData.error.code;
      return ERROR_MESSAGES[errCode] || mutationData.error.message;
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof SignupFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof SignupFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignupFormData;
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }
    signupMutation.mutate({
      email: formData.email,
      password: formData.password,
      password_confirm: formData.passwordConfirm,
      nickname: formData.nickname,
    });
  };

  const serverError = getServerError() || getResponseError();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="이메일"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="example@email.com"
        error={fieldErrors.email}
        autoComplete="email"
      />
      <Input
        label="비밀번호"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="8자 이상 입력하세요"
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <Input
        label="비밀번호 확인"
        type="password"
        name="passwordConfirm"
        value={formData.passwordConfirm}
        onChange={handleChange}
        placeholder="비밀번호를 다시 입력하세요"
        error={fieldErrors.passwordConfirm}
        autoComplete="new-password"
      />
      <Input
        label="닉네임"
        type="text"
        name="nickname"
        value={formData.nickname}
        onChange={handleChange}
        placeholder="닉네임을 입력하세요 (30자 이하)"
        error={fieldErrors.nickname}
        autoComplete="username"
      />

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        isLoading={signupMutation.isPending}
        className="mt-2"
      >
        회원가입
      </Button>

      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          로그인
        </Link>
      </p>
    </form>
  );
};
