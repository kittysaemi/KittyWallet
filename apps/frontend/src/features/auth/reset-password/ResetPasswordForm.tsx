import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { z } from "zod";
import type { ApiError } from "../../../entities/auth/model/auth.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { useResetPassword } from "./useResetPassword";

const resetPasswordSchema = z
  .object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    newPasswordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요.")
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["newPasswordConfirm"]
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_005: "비밀번호가 일치하지 않습니다.",
  AUTH_007: "재설정 링크가 만료되었거나 유효하지 않습니다.",
  AUTH_008: "비밀번호를 재설정할 수 없습니다.",
  VALIDATION_001: "입력값을 확인해주세요."
};

interface ResetPasswordFormProps {
  resetToken: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ resetToken }) => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    email: "",
    newPassword: "",
    newPasswordConfirm: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const resetMutation = useResetPassword();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  const getServerError = (): string | null => {
    if (!resetMutation.error) return null;
    const axiosError = resetMutation.error as AxiosError<{ error: ApiError }>;
    const code = axiosError.response?.data?.error?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (axiosError.response?.data?.error?.message) return axiosError.response.data.error.message;
    return "비밀번호 변경에 실패했습니다. 다시 시도해주세요.";
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof ResetPasswordFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = resetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0] as keyof ResetPasswordFormData;
        if (!errors[field]) errors[field] = error.message;
      });
      setFieldErrors(errors);
      return;
    }
    resetMutation.mutate({
      email: formData.email,
      reset_token: resetToken,
      new_password: formData.newPassword,
      new_password_confirm: formData.newPasswordConfirm
    });
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
      <Input
        label="새 비밀번호"
        type="password"
        name="newPassword"
        value={formData.newPassword}
        onChange={handleChange}
        placeholder="8자 이상 입력해주세요."
        error={fieldErrors.newPassword}
        autoComplete="new-password"
      />
      <Input
        label="새 비밀번호 확인"
        type="password"
        name="newPasswordConfirm"
        value={formData.newPasswordConfirm}
        onChange={handleChange}
        placeholder="비밀번호를 다시 입력해주세요."
        error={fieldErrors.newPasswordConfirm}
        autoComplete="new-password"
      />
      {isOffline && (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          네트워크 연결 후 비밀번호를 변경할 수 있습니다.
        </p>
      )}
      {serverError && (
        <p className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {serverError}
        </p>
      )}
      <Button type="submit" fullWidth isLoading={resetMutation.isPending} disabled={isOffline} className="mt-2">
        비밀번호 변경
      </Button>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        다시 요청이 필요하신가요?{" "}
        <Link
          to="/reset-password"
          className="font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-primary)] underline-offset-4"
        >
          재설정 요청
        </Link>
      </p>
    </form>
  );
};
