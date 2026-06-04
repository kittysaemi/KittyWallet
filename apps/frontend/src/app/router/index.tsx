import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "../../entities/auth/store/authStore";
import DashboardPage from "../../pages/dashboard";
import AccountsPage from "../../pages/accounts";
import TransactionsPage from "../../pages/transactions";
import TransactionNewPage from "../../pages/transactions/new";
import TransactionEditPage from "../../pages/transactions/edit";
import TransactionDetailPage from "../../pages/transactions/detail";
import TransactionSearchPage from "../../pages/transactions/search";
import CardsPage from "../../pages/cards";
import CategoriesPage from "../../pages/categories";
import IconsPage from "../../pages/icons";
import LoginPage from "../../pages/login";
import SignupPage from "../../pages/signup";

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
      path="/transactions/search"
      element={
        <ProtectedRoute>
          <TransactionSearchPage />
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
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
