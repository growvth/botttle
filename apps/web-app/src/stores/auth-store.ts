import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const REFRESH_KEY = 'botttle_refresh_token';

export type User = {
  id: string;
  email: string;
  role: string;
  name: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
};

const ACCESS_TOKEN_KEY = 'botttle_access_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) => {
        try {
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          localStorage.setItem(REFRESH_KEY, refreshToken);
        } catch {
          // ignore
        }
        set({ accessToken, refreshToken, user });
      },
      clearAuth: () => {
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
        } catch {
          // ignore
        }
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'botttle-auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          try {
            localStorage.setItem(ACCESS_TOKEN_KEY, state.accessToken);
          } catch {
            // ignore
          }
        }
      },
    }
  )
);
