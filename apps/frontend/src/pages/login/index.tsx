import React from 'react';
import { LoginForm } from '../../features/auth/login/LoginForm';

const LoginPage: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-indigo-600">KittyWallet</h1>
      <LoginForm />
    </div>
  </div>
);

export default LoginPage;
