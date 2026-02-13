import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { DeviceMotion } from "expo-sensors";
import { Avatar } from "@/components/Avatar";

interface ParallaxAvatarProps {
  emoji: string;
  size: number;
}

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 80,
  mass: 0.6,
  overshootClamping: true,
};

const TILT_RANGE = 6;
const UPDATE_INTERVAL = 80;

export function ParallaxAvatar({ emoji, size }: ParallaxAvatarProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useRef(true);

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
            const clampedGamma = Math.max(-1, Math.min(1, gamma));
            const clampedBeta = Math.max(-1, Math.min(1, beta));
            translateX.value = withSpring(clampedGamma * TILT_RANGE, SPRING_CONFIG);
            translateY.value = withSpring(clampedBeta * TILT_RANGE, SPRING_CONFIG);
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
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Avatar emoji={emoji} size={size} />
    </Animated.View>
  );
}
