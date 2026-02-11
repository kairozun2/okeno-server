import { Platform } from "react-native";

// Blue palette for the app
const primaryBlue = "#3478F6";
const accentBlue = "#5A9CFF";

export const Colors = {
  light: {
    text: "#1C1C1E",
    textSecondary: "#6E6E73",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8E8E93",
    tabIconSelected: primaryBlue,
    link: primaryBlue,
    accent: accentBlue,
    backgroundRoot: "#F2F2F7",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#E5E5EA",
    backgroundTertiary: "#D1D1D6",
    border: "rgba(60, 60, 67, 0.12)",
    inputBackground: "rgba(255, 255, 255, 0.5)",
    cardBackground: "rgba(255, 255, 255, 0.4)",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
  },
  dark: {
    text: "#F5F5F7",
    textSecondary: "#98989D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#636366",
    tabIconSelected: "#5A9CFF",
    link: "#5A9CFF",
    accent: accentBlue,
    backgroundRoot: "#000000",
    backgroundDefault: "#1C1C1E",
    backgroundSecondary: "#2C2C2E",
    backgroundTertiary: "#3A3A3C",
    border: "rgba(84, 84, 88, 0.25)",
    inputBackground: "rgba(255, 255, 255, 0.08)",
    cardBackground: "rgba(255, 255, 255, 0.06)",
    success: "#30D158",
    error: "#FF453A",
    warning: "#FFD60A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 48,
  buttonHeight: 50,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: -0.2,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  link: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
    letterSpacing: -0.2,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  small: {
    shadowColor: "#2D3A2D",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: "#2D3A2D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: "#2D3A2D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const EMOJI_AVATARS = [
  "🐸", "🦊", "🐱", "🐶", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷",
  "🐵", "🐔", "🦄", "🐝", "🦋", "🐢", "🐙", "🦀", "🐬", "🦈",
  "🦅", "🦆", "🦉", "🐺", "🦝", "🦔", "🐿️", "🦜", "🦚", "🦩",
  "🐲", "🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🍀", "🌵", "🌴",
];

export function getRandomEmoji(): string {
  return EMOJI_AVATARS[Math.floor(Math.random() * EMOJI_AVATARS.length)];
}

export function getEmojiForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return EMOJI_AVATARS[Math.abs(hash) % EMOJI_AVATARS.length];
}
