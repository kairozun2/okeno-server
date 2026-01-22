import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

interface RefreshableTitleProps {
  title: string;
  refreshing?: boolean;
}

export function RefreshableTitle({ title, refreshing = false }: RefreshableTitleProps) {
  const { theme } = useTheme();
  const refreshOpacity = useSharedValue(0);

  useEffect(() => {
    refreshOpacity.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
  }, [refreshing]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: 1 - refreshOpacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centered, titleStyle]}>
        <ThemedText style={styles.titleText}>{title}</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.centered, spinnerStyle]}>
        <ActivityIndicator size="small" color={theme.text} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
