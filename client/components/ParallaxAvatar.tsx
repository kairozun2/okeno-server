import React, { useEffect } from "react";
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
  damping: 15,
  stiffness: 120,
  mass: 0.8,
};

const TILT_RANGE = 8;

export function ParallaxAvatar({ emoji, size }: ParallaxAvatarProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let subscription: ReturnType<typeof DeviceMotion.addListener> | null = null;

    const startListening = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) return;

        DeviceMotion.setUpdateInterval(50);

        subscription = DeviceMotion.addListener((data: any) => {
          if (data.rotation) {
            const { beta, gamma } = data.rotation;
            translateX.value = withSpring(gamma * TILT_RANGE, SPRING_CONFIG);
            translateY.value = withSpring(beta * TILT_RANGE, SPRING_CONFIG);
          }
        });
      } catch {
      }
    };

    startListening();

    return () => {
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
