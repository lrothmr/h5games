import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  autoSave: boolean;
  deviceId: string;
  login: (token: string, username: string) => void;
  logout: () => void;
  setAutoSave: (autoSave: boolean) => void;
}

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      autoSave: false,
      deviceId: getDeviceId(),
      login: (token, username) => {
        localStorage.setItem('userToken', token);
        set({ token, username, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('userToken');
        set({ token: null, username: null, isAuthenticated: false, autoSave: false });
      },
      setAutoSave: (autoSave) => set({ autoSave }),
    }),
    {
      name: 'user-storage',
    }
  )
);
