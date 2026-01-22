import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface AvatarProps {
  emoji: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ emoji, size = 48, style }: AvatarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.backgroundSecondary,
        },
        style,
      ]}
    >
      <ThemedText style={[styles.emoji, { fontSize: size * 0.5 }]}>
        {emoji}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    textAlign: "center",
  },
});
