import { Platform, View, StyleSheet } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import React from "react";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const baseOptions: NativeStackNavigationOptions = {
    headerTitleAlign: "center",
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontWeight: "600",
      fontSize: 16,
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
      fontSize: 16,
    },
    headerTransparent: false,
    headerStyle: {
      backgroundColor: theme.backgroundRoot,
    },
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
    gestureEnabled: true,
  };
}
