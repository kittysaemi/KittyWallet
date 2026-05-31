import { create } from 'zustand';
import { User } from '../model/auth.types';

interface AuthState {
  // Access Token은 메모리에만 저장 (localStorage/sessionStorage 금지)
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // 앱 시작 시 refresh 시도 완료 여부

  setAuth: (accessToken: string, user: User) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (accessToken, user) =>
    set({
      accessToken,
      user,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    }),

  setInitialized: () => set({ isInitialized: true }),
}));
