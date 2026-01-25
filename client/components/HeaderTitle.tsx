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
  const isOnline = useIsOnline();
  
  const [phase, setPhase] = useState<'greeting' | 'title' | 'subtitle'>('greeting');
  const opacity = useSharedValue(1);
  const refreshOpacity = useSharedValue(0);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const getGreeting = () => t("Welcome", "Добро пожаловать");
  const greeting = `${getGreeting()}, ${user?.username || t("guest", "гость")}`;
  const subtitle = t("Feed", "Лента");

  useEffect(() => {
    // Phase 1: Greeting
    opacity.value = 1;
    const timeout1 = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(setPhase)('title');
          opacity.value = withTiming(1, { duration: 500 });
        }
      });
    }, 2000);

    // Phase 2: Title
    const timeout2 = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(setPhase)('subtitle');
          opacity.value = withTiming(1, { duration: 500 }, (done) => {
            if (done && onFadeComplete) runOnJS(onFadeComplete)();
          });
        }
      });
    }, 4000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  useEffect(() => {
    refreshOpacity.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
  }, [refreshing]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - refreshOpacity.value),
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.greetingContainer, animatedStyle]}>
        {phase === 'greeting' && (
          <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
        )}
        {phase === 'title' && (
          <ThemedText style={styles.titleText}>{title}</ThemedText>
        )}
        {phase === 'subtitle' && (
          <View style={styles.titleRow}>
            {isOnline ? (
              <ThemedText style={styles.subtitleText}>{subtitle}</ThemedText>
            ) : (
              <OfflineIndicator />
            )}
          </View>
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
