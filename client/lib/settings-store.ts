import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeKey = 'forest' | 'feldgrau' | 'midnight' | 'merlot' | 'wheat' | 'mint' | 'apricot';

export interface SettingsState {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  _hasHydrated: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => set({ theme }),
      _hasHydrated: false,
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
