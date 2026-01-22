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
  const { theme } = useTheme();
  const { user } = useAuth();
  const opacity = useSharedValue(1);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "Доброй ночи";
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  const greeting = `${getGreeting()}, ${user?.username || "гость"}`;

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

  const plusStyle = useAnimatedStyle(() => ({
    opacity: 1 - opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.greetingContainer, animatedStyle]}>
        <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
