import { create } from 'zustand';
import type { AuthUser } from '../model/auth.types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (accessToken: string, user: { user_id: number; nickname: string }) => void;
  clearAuth: () => void;
  setInitialized: () => void;
  updateNickname: (nickname: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (accessToken, rawUser) =>
    set({
      accessToken,
      user: { userId: rawUser.user_id, nickname: rawUser.nickname },
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    }),

  setInitialized: () => set({ isInitialized: true }),

  updateNickname: (nickname) =>
    set((state) => ({
      user: state.user ? { ...state.user, nickname } : null,
    })),
}));
