import React from "react";
import { Cat } from "lucide-react";
import { SignupForm } from "../../features/auth/signup/SignupForm";

const SignupPage: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-6">
    <div className="w-full max-w-[480px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-[0_4px_16px_var(--color-card-shadow)]">
      <h1
        className="mb-6 flex items-center justify-center gap-2 text-[1.95rem] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-brand)", fontWeight: "bold", WebkitTextStroke: "0.5px currentColor" }}
      >
        KittyWallet
        <Cat size={26} className="text-[var(--color-primary)]" strokeWidth={1.8} />
      </h1>
      <SignupForm />
    </div>
  </div>
);

export default SignupPage;
