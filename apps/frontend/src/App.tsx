import React, { useEffect } from 'react';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import { authApi } from './entities/auth/api/authApi';
import { useAuthStore } from './entities/auth/store/authStore';

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authApi.refresh();
        if (response.success && response.data) {
          setAuth(response.data.accessToken, response.data.user);
        }
      } catch {
        // 비로그인 상태로 처리
      } finally {
        setInitialized();
      }
    };

    initAuth();
  }, [setAuth, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Providers>
      <AppInitializer>
        <AppRouter />
      </AppInitializer>
    </Providers>
  );
};

export default App;
