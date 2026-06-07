import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Cat } from "lucide-react";
import { RequestResetPasswordForm } from "../../features/auth/reset-password/RequestResetPasswordForm";
import { ResetPasswordForm } from "../../features/auth/reset-password/ResetPasswordForm";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="w-full max-w-[480px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-[0_4px_16px_var(--color-card-shadow)]">
        <h1
          className="mb-6 flex items-center justify-center gap-2 text-[1.95rem] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-brand)", fontWeight: "bold", WebkitTextStroke: "0.5px currentColor" }}
        >
          KittyWallet
          <Cat size={26} className="text-[var(--color-primary)]" strokeWidth={1.8} />
        </h1>
        {resetToken ? (
          <ResetPasswordForm resetToken={resetToken} />
        ) : (
          <>
            <RequestResetPasswordForm />
            <p className="mt-4 text-center text-xs text-[var(--color-text-caption)]">
              재설정 링크가 없으면 이메일로 새 링크를 요청해주세요.
            </p>
          </>
        )}
        <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          <Link
            to="/login"
            className="font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-primary)] underline-offset-4"
          >
            로그인 화면으로 이동
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
