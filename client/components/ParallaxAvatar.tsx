import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { DeviceMotion } from "expo-sensors";
import { Avatar } from "@/components/Avatar";

interface ParallaxAvatarProps {
  emoji: string;
  size: number;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.4,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const TILT_RANGE = 5;
const UPDATE_INTERVAL = 16;
const SMOOTHING = 0.3;

export function ParallaxAvatar({ emoji, size }: ParallaxAvatarProps) {
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const isActive = useRef(true);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let subscription: ReturnType<typeof DeviceMotion.addListener> | null = null;

    const startListening = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) return;

        DeviceMotion.setUpdateInterval(UPDATE_INTERVAL);

        subscription = DeviceMotion.addListener((data: any) => {
          if (!isActive.current) return;
          if (data.rotation) {
            const { beta, gamma } = data.rotation;

            const rawX = Math.max(-1, Math.min(1, gamma)) * TILT_RANGE;
            const rawY = Math.max(-1, Math.min(1, beta)) * TILT_RANGE;

            const smoothedX = lastX.current + (rawX - lastX.current) * SMOOTHING;
            const smoothedY = lastY.current + (rawY - lastY.current) * SMOOTHING;
            lastX.current = smoothedX;
            lastY.current = smoothedY;

            targetX.value = withSpring(smoothedX, SPRING_CONFIG);
            targetY.value = withSpring(smoothedY, SPRING_CONFIG);
          }
        });
      } catch {
      }
    };

    startListening();

    return () => {
      isActive.current = false;
      if (subscription) {
        subscription.remove();
      }
      cancelAnimation(targetX);
      cancelAnimation(targetY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: targetX.value },
      { translateY: targetY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Avatar emoji={emoji} size={size} />
    </Animated.View>
  );
}
