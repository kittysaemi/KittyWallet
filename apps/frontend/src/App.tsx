import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppRouter } from "./app/router";
import { authApi } from "./entities/auth/api/authApi";
import { useAuthStore } from "./entities/auth/store/authStore";
import { settingsApi } from "./entities/settings/api/settingsApi";
import { applyThemeSetting, DEFAULT_THEME } from "./entities/settings/model/theme";
import { SyncStatusNotice } from "./pwa/sync/SyncStatusNotice";
import { registerSyncQueueRunner } from "./pwa/sync/syncQueue.service";

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
  const { setAuth, setInitialized, isInitialized, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings,
    enabled: isInitialized && isAuthenticated,
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    applyThemeSetting(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return undefined;
    return registerSyncQueueRunner(queryClient);
  }, [isInitialized, isAuthenticated, queryClient]);

  // 인증 해제(로그아웃/토큰 만료) 시 기본 테마로 복원
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      applyThemeSetting(DEFAULT_THEME);
    }
  }, [isInitialized, isAuthenticated]);

  useEffect(() => {
    if (settingsQuery.data?.success) {
      applyThemeSetting(settingsQuery.data.data?.settings.theme);
    }
  }, [settingsQuery.data]);

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
          const incomingUserId = decodeUserId(access_token);
          // 이전과 다른 계정의 토큰이면 캐시를 비운다
          if (currentUser && incomingUserId && currentUser.userId !== incomingUserId) {
            queryClient.clear();
          }
          if (currentUser) {
            setAuth(access_token, { user_id: currentUser.userId, nickname: currentUser.nickname });
          } else {
            if (incomingUserId) {
              setAuth(access_token, { user_id: incomingUserId, nickname: "사용자" });
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

  return (
    <>
      <AppRouter />
      <SyncStatusNotice />
    </>
  );
};

export default App;
