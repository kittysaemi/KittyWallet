import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { z } from "zod";
import type { ApiError } from "../../../entities/auth/model/auth.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { useLogin } from "./useLogin";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요.")
});

type LoginFormData = z.infer<typeof loginSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_002: "가입되어 있지 않은 계정입니다.",
};

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  const loginMutation = useLogin();

  const getServerError = (): string | null => {
    if (!loginMutation.error) return null;
    const axiosError = loginMutation.error as AxiosError<{ error: ApiError }>;
    const code = axiosError.response?.data?.error?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (axiosError.response?.data?.error?.message) return axiosError.response.data.error.message;
    return "로그인에 실패했습니다. 다시 시도해주세요.";
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof LoginFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0] as keyof LoginFormData;
        if (!errors[field]) errors[field] = error.message;
      });
      setFieldErrors(errors);
      return;
    }
    loginMutation.mutate(formData);
  };

  const serverError = getServerError();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {isExpired && (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          인증이 만료되었습니다. 다시 로그인해주세요.
        </p>
      )}
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
        placeholder="비밀번호를 입력해주세요."
        error={fieldErrors.password}
        autoComplete="current-password"
      />
      {serverError && (
        <p className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {serverError}
        </p>
      )}
      <Button type="submit" fullWidth isLoading={loginMutation.isPending} className="mt-2">
        로그인
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        계정이 없으신가요?{" "}
        <Link
          to="/signup"
          className="font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-primary)] underline-offset-4"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
};
