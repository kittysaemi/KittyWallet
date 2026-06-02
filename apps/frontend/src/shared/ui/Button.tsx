import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  fullWidth,
  variant = "primary",
  disabled,
  className = "",
  ...props
}) => {
  const variantClass = {
    primary:
      "bg-[var(--color-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
    secondary:
      "border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]",
    danger: "bg-[var(--color-danger)] text-white hover:brightness-95"
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled ?? isLoading}
      className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? "w-full" : ""
      } ${variantClass} ${className}`}
    >
      {isLoading ? "처리 중..." : children}
    </button>
  );
};
