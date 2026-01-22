import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
  modal?: boolean;
}

export function useScreenOptions({
  transparent = true,
  modal = false,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const baseOptions: NativeStackNavigationOptions = {
    headerTitleAlign: "center",
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontWeight: "600",
      fontSize: 17,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };

  if (transparent) {
    return {
      ...baseOptions,
      headerTransparent: true,
      headerBlurEffect: isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight",
      headerStyle: {
        backgroundColor: "transparent",
      },
    };
  }

  return {
    ...baseOptions,
    headerTransparent: false,
    headerStyle: {
      backgroundColor: theme.backgroundDefault,
    },
  };
}

export function useModalScreenOptions(): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  return {
    presentation: "modal",
    headerTitleAlign: "center",
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontWeight: "600",
      fontSize: 17,
    },
    headerTransparent: true,
    headerBlurEffect: isDark ? "systemThinMaterialDark" : "systemThinMaterialLight",
    headerStyle: {
      backgroundColor: "transparent",
    },
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
    gestureEnabled: true,
  };
}
