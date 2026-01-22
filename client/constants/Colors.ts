import { Spacing, BorderRadius } from "./theme";

export const Colors = {
  // Deep Blue Liquid Glass Palette
  primary: "#0A84FF",
  background: "#0A1628", // Deep blue background
  backgroundSecondary: "rgba(255, 255, 255, 0.08)",
  backgroundRoot: "#0A1628",
  backgroundDefault: "#0A1628",
  
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.6)",
  
  border: "rgba(255, 255, 255, 0.1)",
  inputBackground: "rgba(255, 255, 255, 0.05)",
  
  link: "#0A84FF",
  error: "#FF453A",
  success: "#32D74B",
  accent: "#BF5AF2",
  
  cardBackground: "rgba(255, 255, 255, 0.06)",
  
  // Tab Bar
  tabIconDefault: "rgba(255, 255, 255, 0.4)",
  tabIconSelected: "#FFFFFF",
  
  // Liquid Glass Specific
  glassTint: "rgba(10, 132, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
};

export const Theme = {
  dark: {
    colors: Colors,
  },
  light: {
    colors: Colors, // Mobile app is dark blue by design
  },
};
