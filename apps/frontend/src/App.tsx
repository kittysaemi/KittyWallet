import React, { useEffect } from 'react';
import { Providers } from './app/providers/index';
import { AppRouter } from './app/router/index';
import { useAuthStore } from './entities/auth/store/authStore';
import { authApi } from './entities/auth/api/authApi';

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const response = await authApi.refresh();
        if (response.success && response.data) {
          setAuth(response.data.accessToken, response.data.user);
        }
      } catch {
        // Refresh 실패 = 비로그인 상태
      } finally {
        setInitialized();
      }
    };

    tryRefresh();
  }, [setAuth, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
