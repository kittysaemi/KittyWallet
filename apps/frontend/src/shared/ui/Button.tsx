import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  fullWidth,
  disabled,
  className = '',
  ...props
}) => (
  <button
    {...props}
    disabled={disabled ?? isLoading}
    className={`rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 ${
      fullWidth ? 'w-full' : ''
    } ${className}`}
  >
    {isLoading ? '처리 중...' : children}
  </button>
);
