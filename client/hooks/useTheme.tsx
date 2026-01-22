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

  // Calculate lighter version of accent for backgrounds
  const getLighterColor = (hex: string, factor: number = 0.15) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
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
    backgroundRoot: isDark ? baseTheme.backgroundRoot : getLighterColor(accentColor, 0.5),
    backgroundDefault: isDark ? baseTheme.backgroundDefault : getLighterColor(accentColor, 0.55),
    backgroundSecondary: isDark ? baseTheme.backgroundSecondary : getLighterColor(accentColor, 0.35),
    backgroundTertiary: isDark ? baseTheme.backgroundTertiary : getLighterColor(accentColor, 0.25),
    cardBackground: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.85)",
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
