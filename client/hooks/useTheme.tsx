import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/theme";
import { useColorScheme } from "./useColorScheme";

type ThemeContextType = {
  theme: typeof Colors.light;
  isDark: boolean;
  accentColor: string | null;
  language: "en" | "ru";
  hapticsEnabled: boolean;
  setAccentColor: (color: string | null) => Promise<void>;
  setLanguage: (lang: "en" | "ru") => Promise<void>;
  toggleHaptics: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_ACCENT_KEY = "theme_accent_color";
const THEME_LANGUAGE_KEY = "theme_language";
const THEME_HAPTICS_KEY = "theme_haptics_enabled";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [accentColor, setAccentState] = useState<string | null>(null);
  const [language, setLanguageState] = useState<"en" | "ru">("ru");
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [savedAccent, savedLang, savedHaptics] = await Promise.all([
          AsyncStorage.getItem(THEME_ACCENT_KEY),
          AsyncStorage.getItem(THEME_LANGUAGE_KEY),
          AsyncStorage.getItem(THEME_HAPTICS_KEY),
        ]);
        if (savedAccent) setAccentState(savedAccent);
        if (savedLang) setLanguageState(savedLang as "en" | "ru");
        if (savedHaptics !== null) setHapticsEnabled(savedHaptics === "true");
      } catch (e) {
        console.error("Load theme settings error:", e);
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
    } catch (e) {
      console.error("Save accent color error:", e);
    }
  };

  const setLanguage = async (lang: "en" | "ru") => {
    try {
      await AsyncStorage.setItem(THEME_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (e) {
      console.error("Save language error:", e);
    }
  };

  const toggleHaptics = async () => {
    try {
      const newState = !hapticsEnabled;
      await AsyncStorage.setItem(THEME_HAPTICS_KEY, newState.toString());
      setHapticsEnabled(newState);
    } catch (e) {
      console.error("Save haptics error:", e);
    }
  };

  const isDark = colorScheme === "dark";
  const baseTheme = Colors[colorScheme ?? "light"];

  // Helper for color modification
  const modifyColor = (hex: string, factor: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // For backgrounds in light mode, we want it VERY light (mix with white)
    const newR = Math.min(255, Math.round(r + (255 - r) * factor));
    const newG = Math.min(255, Math.round(g + (255 - g) * factor));
    const newB = Math.min(255, Math.round(b + (255 - b) * factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const theme = accentColor ? {
    ...baseTheme,
    tabIconSelected: accentColor,
    link: accentColor,
    accent: accentColor,
    success: accentColor,
    backgroundRoot: isDark ? baseTheme.backgroundRoot : modifyColor(accentColor, 0.92),
    backgroundDefault: isDark ? baseTheme.backgroundDefault : modifyColor(accentColor, 0.95),
    backgroundSecondary: isDark ? baseTheme.backgroundSecondary : modifyColor(accentColor, 0.85),
    backgroundTertiary: isDark ? baseTheme.backgroundTertiary : modifyColor(accentColor, 0.75),
    cardBackground: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.7)",
  } : baseTheme;

  if (isLoading) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, accentColor, language, hapticsEnabled, setAccentColor, setLanguage, toggleHaptics }}>
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
