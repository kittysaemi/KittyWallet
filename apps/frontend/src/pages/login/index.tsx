import React from "react";
import { LoginForm } from "../../features/auth/login/LoginForm";

const LoginPage: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-6">
    <div className="w-full max-w-[480px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-[0_4px_16px_var(--color-card-shadow)]">
      <h1 className="mb-6 text-center text-2xl font-bold text-[var(--color-text-primary)]">
        KittyWallet
      </h1>
      <LoginForm />
    </div>
  </div>
);

export default LoginPage;
