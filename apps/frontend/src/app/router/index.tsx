import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../entities/auth/store/authStore';
import LoginPage from '../../pages/login';
import SignupPage from '../../pages/signup';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-indigo-600">KittyWallet</h1>
        <p className="mb-2 text-lg text-gray-700">
          안녕하세요, <span className="font-semibold">{user?.nickname}</span>님!
        </p>
        <p className="mb-8 text-sm text-gray-500">대시보드 준비 중입니다.</p>
        <button
          onClick={clearAuth}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-300"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export const AppRouter: React.FC = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route
      path="/login"
      element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <PublicOnlyRoute>
          <SignupPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
