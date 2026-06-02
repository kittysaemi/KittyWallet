import React, { useEffect } from "react";
import { AppRouter } from "./app/router";
import { authApi } from "./entities/auth/api/authApi";
import { useAuthStore } from "./entities/auth/store/authStore";

const App: React.FC = () => {
  const { setAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    authApi
      .refresh()
      .then((res) => {
        if (res.success && res.data) {
          const { access_token } = res.data;
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            setAuth(access_token, { user_id: currentUser.userId, nickname: currentUser.nickname });
          }
        }
      })
      .catch(() => {
        // Refresh 실패 시 비인증 상태를 유지한다.
      })
      .finally(() => {
        setInitialized();
      });
  }, [setAuth, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-[var(--color-text-secondary)]">로딩 중...</p>
      </div>
    );
  }

  return <AppRouter />;
};

export default App;
