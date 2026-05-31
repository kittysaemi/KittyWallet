import React from 'react';
import { AuthLayout } from '../../app/layouts/AuthLayout';
import { SignupForm } from '../../features/auth/signup/SignupForm';

const SignupPage: React.FC = () => {
  return (
    <AuthLayout
      title="회원가입"
      subtitle="계정을 만들고 지출을 관리하세요"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default SignupPage;
