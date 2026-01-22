import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
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
}

export function HeaderTitle({ title, onFadeComplete }: HeaderTitleProps) {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const opacity = useSharedValue(1);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return t("Good night", "Доброй ночи");
    if (hour < 12) return t("Good morning", "Доброе утро");
    if (hour < 18) return t("Good afternoon", "Добрый день");
    return t("Good evening", "Добрый вечер");
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const mainTitleStyle = useAnimatedStyle(() => ({
    opacity: 1 - opacity.value,
    transform: [{ translateY: (1 - opacity.value) * 0 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.greetingContainer, animatedStyle]}>
        <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.greetingContainer, mainTitleStyle]}>
        <ThemedText style={styles.titleText}>{title}</ThemedText>
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
