import { Platform } from "react-native";

// Soft sage green palette matching screenshots
const primaryGreen = "#5C7A5C";
const accentGreen = "#6B8E6B";

export const Colors = {
  light: {
    text: "#2D3A2D",
    textSecondary: "#5C6E5C",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8A9A8A",
    tabIconSelected: primaryGreen,
    link: primaryGreen,
    accent: accentGreen,
    backgroundRoot: "#E8EDE8",
    backgroundDefault: "#F0F4F0",
    backgroundSecondary: "#D8E0D8",
    backgroundTertiary: "#C8D4C8",
    border: "rgba(92, 122, 92, 0.15)",
    inputBackground: "rgba(255, 255, 255, 0.5)",
    cardBackground: "rgba(255, 255, 255, 0.4)",
    success: "#4A7A4A",
    error: "#A85454",
    warning: "#A88A54",
  },
  dark: {
    text: "#E8EDE8",
    textSecondary: "#A8B8A8",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6A7A6A",
    tabIconSelected: "#8AAA8A",
    link: "#8AAA8A",
    accent: accentGreen,
    backgroundRoot: "#1A221A",
    backgroundDefault: "#222A22",
    backgroundSecondary: "#2A342A",
    backgroundTertiary: "#323E32",
    border: "rgba(138, 170, 138, 0.15)",
    inputBackground: "rgba(255, 255, 255, 0.08)",
    cardBackground: "rgba(255, 255, 255, 0.06)",
    success: "#6A9A6A",
    error: "#C87070",
    warning: "#C8A870",
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
