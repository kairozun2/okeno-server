import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSequence,
  runOnJS
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
  const greetingOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const refreshOpacity = useSharedValue(0);
  const [animationPhase, setAnimationPhase] = useState<'greeting' | 'title' | 'subtitle'>('greeting');

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return t("Welcome", "Добро пожаловать");
    if (hour < 12) return t("Welcome", "Добро пожаловать");
    if (hour < 18) return t("Welcome", "Добро пожаловать");
    return t("Welcome", "Добро пожаловать");
  };

  const greeting = `${getGreeting()}, ${user?.username || t("guest", "гость")}`;
  const subtitle = t("Feed", "Лента");

  useEffect(() => {
    greetingOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 800 }, (finished) => {
        if (finished) {
          runOnJS(setAnimationPhase)('title');
        }
      })
    );

    titleOpacity.value = withDelay(
      2800,
      withTiming(1, { duration: 600 }, (finished) => {
        if (finished) {
          titleOpacity.value = withDelay(
            1500,
            withTiming(0, { duration: 600 }, (done) => {
              if (done) {
                runOnJS(setAnimationPhase)('subtitle');
              }
            })
          );
        }
      })
    );

    subtitleOpacity.value = withDelay(
      5500,
      withTiming(1, { duration: 600 }, (finished) => {
        if (finished && onFadeComplete) {
          runOnJS(onFadeComplete)();
        }
      })
    );
  }, []);

  useEffect(() => {
    refreshOpacity.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
  }, [refreshing]);

  const isOnline = useIsOnline();

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value * (1 - refreshOpacity.value),
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value * (1 - refreshOpacity.value) * (isOnline ? 1 : 0),
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.greetingContainer, greetingStyle]}>
        <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.greetingContainer, titleStyle]}>
        <ThemedText style={styles.titleText}>{title}</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.titleRow]}>
        <Animated.View style={subtitleStyle}>
          <ThemedText style={styles.subtitleText}>{subtitle}</ThemedText>
        </Animated.View>
        <OfflineIndicator />
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
