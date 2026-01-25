import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/theme";
import { useColorScheme } from "./useColorScheme";
import { useSettingsStore } from "@/lib/settings-store";
import { getTheme } from "@/lib/themes";

type ThemeContextType = {
  theme: any;
  isDark: boolean;
  accentColor: string | null;
  language: "en" | "ru";
  hapticsEnabled: boolean;
  chatFullscreen: boolean;
  setAccentColor: (color: string | null) => Promise<void>;
  setLanguage: (lang: "en" | "ru") => Promise<void>;
  toggleHaptics: () => Promise<void>;
  toggleChatFullscreen: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_ACCENT_KEY = "theme_accent_color";
const THEME_LANGUAGE_KEY = "theme_language";
const THEME_HAPTICS_KEY = "theme_haptics_enabled";
const THEME_CHAT_FULLSCREEN_KEY = "theme_chat_fullscreen";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeKey = useSettingsStore(s => s.theme);
  const currentTheme = getTheme(themeKey);
  const colorScheme = useColorScheme();
  const [accentColor, setAccentState] = useState<string | null>(null);
  const [language, setLanguageState] = useState<"en" | "ru">("ru");
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [chatFullscreen, setChatFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [savedAccent, savedLang, savedHaptics, savedChatFullscreen] = await Promise.all([
          AsyncStorage.getItem(THEME_ACCENT_KEY),
          AsyncStorage.getItem(THEME_LANGUAGE_KEY),
          AsyncStorage.getItem(THEME_HAPTICS_KEY),
          AsyncStorage.getItem(THEME_CHAT_FULLSCREEN_KEY),
        ]);
        if (savedAccent) setAccentState(savedAccent);
        if (savedLang) setLanguageState(savedLang as "en" | "ru");
        if (savedHaptics !== null) setHapticsEnabled(savedHaptics === "true");
        if (savedChatFullscreen !== null) setChatFullscreen(savedChatFullscreen === "true");
      } catch {
        // Silent fail - use defaults
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const setAccentColor = async (color: string | null) => {
    try {
      if (color) {
        await AsyncStorage.setItem(THEME_ACCENT_KEY, color);
      } else {
        await AsyncStorage.removeItem(THEME_ACCENT_KEY);
      }
      setAccentState(color);
    } catch {
      // Silent fail
    }
  };

  const setLanguage = async (lang: "en" | "ru") => {
    try {
      await AsyncStorage.setItem(THEME_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch {
      // Silent fail
    }
  };

  const toggleHaptics = async () => {
    try {
      const newState = !hapticsEnabled;
      await AsyncStorage.setItem(THEME_HAPTICS_KEY, newState.toString());
      setHapticsEnabled(newState);
    } catch {
      // Silent fail
    }
  };

  const toggleChatFullscreen = async () => {
    try {
      const newState = !chatFullscreen;
      await AsyncStorage.setItem(THEME_CHAT_FULLSCREEN_KEY, newState.toString());
      setChatFullscreen(newState);
    } catch {
      // Silent fail
    }
  };

  const isDark = colorScheme === "dark";
  
  // Use colors from our new theme system
  const theme = {
    ...Colors[colorScheme ?? "light"],
    ...currentTheme.colors,
    // Keep some functional colors from original system if needed
    tabIconSelected: currentTheme.colors.accent,
    link: currentTheme.colors.accent,
    accent: currentTheme.colors.accent,
    success: currentTheme.colors.accent,
    backgroundRoot: currentTheme.colors.background,
    backgroundDefault: currentTheme.colors.primary,
    backgroundSecondary: currentTheme.colors.primaryLight,
    backgroundTertiary: currentTheme.colors.primaryDark,
    cardBackground: currentTheme.colors.card,
    border: currentTheme.colors.border,
  };

  if (isLoading) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, accentColor, language, hapticsEnabled, chatFullscreen, setAccentColor, setLanguage, toggleHaptics, toggleChatFullscreen }}>
      {children}
    </ThemeContext.Provider>
  );
}

  if (isLoading) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, accentColor, language, hapticsEnabled, chatFullscreen, setAccentColor, setLanguage, toggleHaptics, toggleChatFullscreen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
