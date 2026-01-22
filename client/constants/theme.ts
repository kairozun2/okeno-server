import { Platform } from "react-native";

// Dark blue theme matching the screenshots
const primaryBlue = "#0A84FF";
const accentGold = "#FFD60A";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: primaryBlue,
    link: primaryBlue,
    accent: accentGold,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F2F2F7",
    backgroundSecondary: "#E5E5EA",
    backgroundTertiary: "#D1D1D6",
    border: "#C6C6C8",
    inputBackground: "#F2F2F7",
    cardBackground: "#FFFFFF",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8E8E93",
    tabIconSelected: primaryBlue,
    link: primaryBlue,
    accent: accentGold,
    backgroundRoot: "#0A1628",
    backgroundDefault: "#0F1E36",
    backgroundSecondary: "#152742",
    backgroundTertiary: "#1C3250",
    border: "#2C3E50",
    inputBackground: "#152742",
    cardBackground: "#0F1E36",
    success: "#30D158",
    error: "#FF453A",
    warning: "#FF9F0A",
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
  inputHeight: 52,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
    letterSpacing: 0.37,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: 0.36,
  },
  h3: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: 0.35,
  },
  h4: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600" as const,
    letterSpacing: 0.38,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: -0.41,
  },
  small: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
    letterSpacing: -0.24,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: -0.08,
  },
  link: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: -0.41,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Emoji avatars for users
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
