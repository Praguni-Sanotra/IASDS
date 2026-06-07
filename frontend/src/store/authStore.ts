import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  department?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isLoading: false }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),

      setAccessToken: (accessToken) =>
        set({ accessToken, isAuthenticated: !!accessToken }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      // Persist to sessionStorage for better security than localStorage
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
