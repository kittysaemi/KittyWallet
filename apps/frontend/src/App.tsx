import React, { useEffect } from 'react';
import { authApi } from './entities/auth/api/authApi';
import { useAuthStore } from './entities/auth/store/authStore';
import { AppRouter } from './app/router';

const App: React.FC = () => {
  const { setAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    authApi
      .refresh()
      .then((res) => {
        if (res.success && res.data) {
          // refresh 성공 시 user 정보가 없으므로 기존 user 유지 또는 최소 토큰만 갱신
          // 초기 로딩 시 user 정보를 얻기 위해서는 /users/me 호출이 필요하지만
          // 해당 API는 다른 Epic에 있으므로 현재는 토큰만 저장
          const { access_token } = res.data;
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            setAuth(access_token, { user_id: currentUser.userId, nickname: currentUser.nickname });
          }
        }
      })
      .catch(() => {
        // Refresh Token 없음 또는 만료 → 비인증 상태 유지
      })
      .finally(() => {
        setInitialized();
      });
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return <AppRouter />;
};

export default App;
