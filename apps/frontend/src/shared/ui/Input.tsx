import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, ...props }) => {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        className={`min-h-11 rounded-xl border bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-caption)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] ${
          error
            ? "border-[var(--color-danger)] focus:ring-[var(--color-danger-soft)]"
            : "border-[var(--color-border-primary)]"
        } ${props.className ?? ""}`}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
};
