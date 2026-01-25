import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useIsOnline } from "@/hooks/useNetworkStatus";
import { Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
  onFadeComplete?: () => void;
  refreshing?: boolean;
}

export function HeaderTitle({ title, onFadeComplete, refreshing = false }: HeaderTitleProps) {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const refreshOpacity = useSharedValue(0);
  const isOnline = useIsOnline();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const subtitle = t("Feed", "Лента");

  useEffect(() => {
    refreshOpacity.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
  }, [refreshing]);

  useEffect(() => {
    // Call completion callback immediately since we removed animations
    if (onFadeComplete) {
      onFadeComplete();
    }
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    position: 'absolute' as const,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: withTiming(refreshing ? 0 : 1, { duration: 200 }),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.titleRow, contentStyle]}>
        {isOnline ? (
          <ThemedText style={styles.subtitleText}>{subtitle}</ThemedText>
        ) : (
          <OfflineIndicator />
        )}
      </Animated.View>
      <Animated.View style={[styles.greetingContainer, spinnerStyle]}>
        <ActivityIndicator size="small" color={theme.text} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingContainer: {
    position: 'absolute',
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  titleText: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitleText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
