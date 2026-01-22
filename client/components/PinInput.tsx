import React, { useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as Haptics from "expo-haptics";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

export function PinInput({
  value,
  onChange,
  length = 4,
  error = false,
}: PinInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      scale.value = withSpring(1.05, { damping: 2 }, () => {
        scale.value = withSpring(1);
      });
    }
  }, [error]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    inputRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress} style={styles.container}>
        {Array.from({ length }).map((_, index) => {
          const isFilled = index < value.length;
          const isActive = index === value.length;

          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: isFilled
                    ? theme.link
                    : theme.backgroundSecondary,
                  borderColor: error
                    ? theme.error
                    : isActive
                    ? theme.link
                    : "transparent",
                },
              ]}
            />
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        secureTextEntry
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
});
