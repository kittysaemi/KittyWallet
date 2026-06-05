import React, { useEffect } from "react";
import { AppRouter } from "./app/router";
import { authApi } from "./entities/auth/api/authApi";
import { useAuthStore } from "./entities/auth/store/authStore";

const AUTH_REFRESH_TIMEOUT_MS = 5000;

function decodeUserId(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized)) as { sub?: string };
    return decoded.sub ? Number(decoded.sub) : null;
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const { setAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    const refreshTimeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Auth refresh timed out"));
      }, AUTH_REFRESH_TIMEOUT_MS);
    });

    Promise.race([authApi.refresh(), refreshTimeout])
      .then((res) => {
        if (res.success && res.data) {
          const { access_token } = res.data;
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            setAuth(access_token, { user_id: currentUser.userId, nickname: currentUser.nickname });
          } else {
            const userId = decodeUserId(access_token);
            if (userId) {
              setAuth(access_token, { user_id: userId, nickname: "사용자" });
            }
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
