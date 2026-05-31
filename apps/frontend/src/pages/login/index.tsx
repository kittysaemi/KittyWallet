import React from 'react';
import { AuthLayout } from '../../app/layouts/AuthLayout';
import { LoginForm } from '../../features/auth/login/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="로그인"
      subtitle="계정에 로그인하여 지출을 관리하세요"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
