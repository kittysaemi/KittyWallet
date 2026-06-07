import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { z } from "zod";
import type { ApiError } from "../../../entities/auth/model/auth.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { useRequestResetPassword } from "./useRequestResetPassword";

const requestResetPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다.")
});

type RequestResetPasswordFormData = z.infer<typeof requestResetPasswordSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_010: "잠시 후 다시 요청해주세요.",
  VALIDATION_001: "입력값을 확인해주세요."
};

export const RequestResetPasswordForm: React.FC = () => {
  const [formData, setFormData] = useState<RequestResetPasswordFormData>({ email: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RequestResetPasswordFormData, string>>>({});
  const requestMutation = useRequestResetPassword();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  const getServerError = (): string | null => {
    if (!requestMutation.error) return null;
    const axiosError = requestMutation.error as AxiosError<{ error: ApiError }>;
    const code = axiosError.response?.data?.error?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (axiosError.response?.data?.error?.message) return axiosError.response.data.error.message;
    return "재설정 요청에 실패했습니다. 다시 시도해주세요.";
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof RequestResetPasswordFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = requestResetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof RequestResetPasswordFormData, string>> = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0] as keyof RequestResetPasswordFormData;
        if (!errors[field]) errors[field] = error.message;
      });
      setFieldErrors(errors);
      return;
    }
    requestMutation.mutate({ email: formData.email });
  };

  const serverError = getServerError();

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
      {requestMutation.isSuccess && (
        <p className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          이메일을 확인해주세요.
        </p>
      )}
      {isOffline && (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          네트워크 연결 후 재설정을 요청할 수 있습니다.
        </p>
      )}
      {serverError && (
        <p className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {serverError}
        </p>
      )}
      <Button type="submit" fullWidth isLoading={requestMutation.isPending} disabled={isOffline} className="mt-2">
        재설정 링크 받기
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        비밀번호가 기억나셨나요?{" "}
        <Link
          to="/login"
          className="font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-primary)] underline-offset-4"
        >
          로그인
        </Link>
      </p>
    </form>
  );
};
