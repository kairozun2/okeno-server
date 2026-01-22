import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  runOnJS
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
  onFadeComplete?: () => void;
  refreshing?: boolean;
}

export function HeaderTitle({ title, onFadeComplete, refreshing = false }: HeaderTitleProps) {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const opacity = useSharedValue(1);
  const refreshOpacity = useSharedValue(0);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return t("Welcome", "Добро пожаловать");
    if (hour < 12) return t("Welcome", "Добро пожаловать");
    if (hour < 18) return t("Welcome", "Добро пожаловать");
    return t("Welcome", "Добро пожаловать");
  };

  const greeting = `${getGreeting()}, ${user?.username || t("guest", "гость")}`;

  useEffect(() => {
    opacity.value = withDelay(
      2000,
      withTiming(0, { duration: 1000 }, (finished) => {
        if (finished && onFadeComplete) {
          runOnJS(onFadeComplete)();
        }
      })
    );
  }, []);

  useEffect(() => {
    refreshOpacity.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
  }, [refreshing]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const mainTitleStyle = useAnimatedStyle(() => ({
    opacity: (1 - opacity.value) * (1 - refreshOpacity.value),
    transform: [{ translateY: (1 - opacity.value) * 0 }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.greetingContainer, animatedStyle]}>
        <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.greetingContainer, mainTitleStyle]}>
        <ThemedText style={styles.titleText}>{title}</ThemedText>
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
  greetingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  titleText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
