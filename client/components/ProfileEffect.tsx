import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EFFECT_HEIGHT = 280;

export type ProfileEffectType = "stars" | "rain" | null;

export const PROFILE_EFFECTS: { id: ProfileEffectType; label: string; labelRu: string }[] = [
  { id: null, label: "None", labelRu: "Нет" },
  { id: "stars", label: "Stars", labelRu: "Звёзды" },
  { id: "rain", label: "Rain", labelRu: "Дождь" },
];

function Star({ delay, duration, x, y, size, color }: { delay: number; duration: number; x: number; y: number; size: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{ scale: interpolate(p, [0, 0.5, 1], [0.3, 1, 0.3]) }],
      opacity: interpolate(p, [0, 0.3, 0.5, 0.7, 1], [0, 1, 0.4, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function RainDrop({ startX, delay, containerHeight }: { startX: number; delay: number; containerHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 800 + Math.random() * 400, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{ translateY: p * containerHeight }],
      opacity: interpolate(p, [0, 0.1, 0.9, 1], [0, 0.3, 0.3, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: -10,
          width: 1.5,
          height: 12,
          borderRadius: 1,
          backgroundColor: "rgba(150,200,255,0.5)",
        },
        animatedStyle,
      ]}
    />
  );
}

interface ProfileEffectProps {
  effect: ProfileEffectType;
  height?: number;
}

export function ProfileEffect({ effect, height = EFFECT_HEIGHT }: ProfileEffectProps) {
  if (!effect) return null;

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {effect === "stars" ? <StarsEffect height={height} /> : null}
      {effect === "rain" ? <RainEffect height={height} /> : null}
    </View>
  );
}

function StarsEffect({ height }: { height: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: i * 200,
      duration: 2000 + Math.random() * 2000,
      x: Math.random() * (SCREEN_WIDTH - 10),
      y: Math.random() * (height - 10),
      size: 2 + Math.random() * 3,
      color: `rgba(255, 255, ${200 + Math.floor(Math.random() * 55)}, 0.9)`,
    })),
    [height]
  );

  return (
    <>
      {particles.map((p) => (
        <Star key={p.id} {...p} />
      ))}
    </>
  );
}

function RainEffect({ height }: { height: number }) {
  const drops = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      delay: i * 100 + Math.random() * 300,
    })),
    []
  );

  return (
    <>
      {drops.map((d) => (
        <RainDrop key={d.id} startX={d.startX} delay={d.delay} containerHeight={height} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
