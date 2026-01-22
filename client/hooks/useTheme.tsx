import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/theme";
import { useColorScheme } from "./useColorScheme";

type ThemeContextType = {
  theme: typeof Colors.light;
  isDark: boolean;
  accentColor: string | null;
  setAccentColor: (color: string | null) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_ACCENT_KEY = "theme_accent_color";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [accentColor, setAccentState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAccent() {
      try {
        const saved = await AsyncStorage.getItem(THEME_ACCENT_KEY);
        if (saved) setAccentState(saved);
      } catch (e) {
        console.error("Load accent color error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccent();
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

  const isDark = colorScheme === "dark";
  const baseTheme = Colors[colorScheme ?? "light"];

  const theme = accentColor ? {
    ...baseTheme,
    tabIconSelected: accentColor,
    link: accentColor,
    accent: accentColor,
    success: accentColor,
    backgroundRoot: isDark ? baseTheme.backgroundRoot : accentColor,
    backgroundDefault: isDark ? baseTheme.backgroundDefault : accentColor,
    cardBackground: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.95)",
  } : baseTheme;

  if (isLoading) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, accentColor, setAccentColor }}>
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
