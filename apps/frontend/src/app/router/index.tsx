import React from "react";
import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../entities/auth/store/authStore";
import { BottomNav } from "../../shared/ui/BottomNav";
import DashboardPage from "../../pages/dashboard";
import TransactionsPage from "../../pages/transactions";
import TransactionNewPage from "../../pages/transactions/new";
import TransactionEditPage from "../../pages/transactions/edit";
import TransactionDetailPage from "../../pages/transactions/detail";
import TransactionSearchPage from "../../pages/transactions/search";
import StatisticsPage from "../../pages/statistics";
import ManagePage from "../../pages/manage";
import LoginPage from "../../pages/login";
import SignupPage from "../../pages/signup";
import ResetPasswordPage from "../../pages/reset-password";
import SettingsPage from "../../pages/settings";
import AppSettingsPage from "../../pages/settings/app";
import WalletTransactionsPage from "../../pages/wallet-transactions/WalletTransactionsPage";

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

const RootRedirect: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};

const NavLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg-primary)]">
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      {children}
    </div>
    <BottomNav />
  </div>
);

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
      path="/reset-password"
      element={
        <PublicOnlyRoute>
          <ResetPasswordPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <NavLayout><DashboardPage /></NavLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/manage"
      element={
        <ProtectedRoute>
          <NavLayout><ManagePage /></NavLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/statistics"
      element={
        <ProtectedRoute>
          <NavLayout><StatisticsPage /></NavLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/transactions"
      element={
        <ProtectedRoute>
          <NavLayout><TransactionsPage /></NavLayout>
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
      path="/transactions/search"
      element={
        <ProtectedRoute>
          <NavLayout><TransactionSearchPage /></NavLayout>
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
      path="/settings"
      element={
        <ProtectedRoute>
          <NavLayout><SettingsPage /></NavLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/app"
      element={
        <ProtectedRoute>
          <NavLayout><AppSettingsPage /></NavLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/accounts/:walletId/transactions"
      element={
        <ProtectedRoute>
          <WalletTransactionsPage walletType="ACCOUNT" />
        </ProtectedRoute>
      }
    />
    <Route
      path="/cards/:walletId/transactions"
      element={
        <ProtectedRoute>
          <WalletTransactionsPage walletType="CARD" />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
