import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/Avatar";

const { width, height } = Dimensions.get("window");

interface LoadingScreenProps {
  emoji?: string;
  onFinish: () => void;
  isReady: boolean;
}

export function LoadingScreen({ emoji = "🐸", onFinish, isReady }: LoadingScreenProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isReady) {
      scale.value = withTiming(1.2, { duration: 200, easing: Easing.out(Easing.cubic) });
      opacity.value = withDelay(
        200,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        })
      );
    }
  }, [isReady, opacity, scale, onFinish]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot },
        containerStyle,
      ]}
      pointerEvents={isReady ? "none" : "auto"}
    >
      <Animated.View style={animatedStyle}>
        <Avatar emoji={emoji} size={80} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
