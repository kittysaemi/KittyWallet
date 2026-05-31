import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, ...props }) => {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
        } ${props.className ?? ''}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
