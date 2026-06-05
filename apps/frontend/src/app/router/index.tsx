import React from "react";
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../entities/auth/store/authStore";
import AccountsPage from "../../pages/accounts";
import TransactionsPage from "../../pages/transactions";
import TransactionNewPage from "../../pages/transactions/new";
import TransactionEditPage from "../../pages/transactions/edit";
import TransactionDetailPage from "../../pages/transactions/detail";
import TransactionSearchPage from "../../pages/transactions/search";
import StatisticsPage from "../../pages/statistics";
import CardsPage from "../../pages/cards";
import CategoriesPage from "../../pages/categories";
import IconsPage from "../../pages/icons";
import LoginPage from "../../pages/login";
import SignupPage from "../../pages/signup";
import { Button } from "../../shared/ui/Button";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
        state={{ from: location }}
        replace
      />
    );
  }
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchParams] = useSearchParams();
  if (isAuthenticated) {
    return <Navigate to={searchParams.get("redirect") ?? "/dashboard"} replace />;
  }
  return <>{children}</>;
};

const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="w-full max-w-[480px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 text-center shadow-[0_4px_16px_var(--color-card-shadow)]">
        <h1 className="mb-4 text-3xl font-bold text-[var(--color-text-primary)]">KittyWallet</h1>
        <p className="mb-2 text-lg text-[var(--color-text-primary)]">
          안녕하세요, <span className="font-semibold">{user?.nickname}</span>님
        </p>
        <p className="mb-8 text-sm text-[var(--color-text-secondary)]">대시보드 준비 중입니다.</p>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/transactions"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            거래 내역
          </Link>
          <Link
            to="/accounts"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            계좌 관리
          </Link>
          <Link
            to="/cards"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            카드 관리
          </Link>
          <Link
            to="/categories"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            카테고리 관리
          </Link>
          <Link
            to="/icons"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            아이콘 관리
          </Link>
        </div>
        <Button type="button" variant="secondary" onClick={clearAuth}>
          로그아웃
        </Button>
      </div>
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
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
    <Route
      path="/accounts"
      element={
        <ProtectedRoute>
          <AccountsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/cards"
      element={
        <ProtectedRoute>
          <CardsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/icons"
      element={
        <ProtectedRoute>
          <IconsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/categories"
      element={
        <ProtectedRoute>
          <CategoriesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/statistics"
      element={
        <ProtectedRoute>
          <StatisticsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions"
      element={
        <ProtectedRoute>
          <TransactionsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions/new"
      element={
        <ProtectedRoute>
          <TransactionNewPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions/:id"
      element={
        <ProtectedRoute>
          <TransactionDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions/:id/edit"
      element={
        <ProtectedRoute>
          <TransactionEditPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions/search"
      element={
        <ProtectedRoute>
          <TransactionSearchPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
