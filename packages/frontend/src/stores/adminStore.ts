import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      login: (token, username) => {
        localStorage.setItem('adminToken', token);
        set({ token, username, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        set({ token: null, username: null, isAuthenticated: false });
      },
    }),
    {
      name: 'admin-storage',
      onRehydrateStorage: () => (state) => {
        const token = localStorage.getItem('adminToken');
        if (token && state) {
          state.token = token;
          state.isAuthenticated = true;
        }
      },
    }
  )
);
