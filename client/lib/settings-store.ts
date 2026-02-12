import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeKey = 'forest' | 'feldgrau' | 'midnight' | 'merlot' | 'wheat' | 'mint' | 'apricot';

export interface NotificationPreferences {
  messages: boolean;
  groupMessages: boolean;
  likes: boolean;
  comments: boolean;
  calls: boolean;
}

export interface SettingsState {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  notifications: NotificationPreferences;
  setNotificationPref: (key: keyof NotificationPreferences, value: boolean) => void;
  _hasHydrated: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => set({ theme }),
      notifications: {
        messages: true,
        groupMessages: true,
        likes: true,
        comments: true,
        calls: true,
      },
      setNotificationPref: (key, value) => set((state) => ({
        notifications: { ...state.notifications, [key]: value },
      })),
      _hasHydrated: false,
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        notifications: state.notifications,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
