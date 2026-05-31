import React from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">KittyWallet</h1>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-8">
          {children}
        </div>
      </div>
    </div>
  );
};
