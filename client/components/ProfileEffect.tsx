import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  SharedValue,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EFFECT_HEIGHT = 280;

export type ProfileEffectType = "fireflies" | "aurora" | "bubbles" | "stars" | "snow" | "rain" | null;

export const PROFILE_EFFECTS: { id: ProfileEffectType; label: string; labelRu: string; preview: string }[] = [
  { id: null, label: "None", labelRu: "Нет", preview: "" },
  { id: "fireflies", label: "Fireflies", labelRu: "Светлячки", preview: "fireflies" },
  { id: "aurora", label: "Aurora", labelRu: "Аврора", preview: "aurora" },
  { id: "bubbles", label: "Bubbles", labelRu: "Пузыри", preview: "bubbles" },
  { id: "stars", label: "Stars", labelRu: "Звёзды", preview: "stars" },
  { id: "snow", label: "Snow", labelRu: "Снег", preview: "snow" },
  { id: "rain", label: "Rain", labelRu: "Дождь", preview: "rain" },
];

interface ParticleProps {
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  type: "float" | "fall" | "rise" | "twinkle" | "drift";
  containerHeight: number;
}

function Particle({ delay, duration, startX, startY, size, color, type, containerHeight }: ParticleProps) {
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

    if (type === "float") {
      return {
        transform: [
          { translateX: Math.sin(p * Math.PI * 2) * 20 },
          { translateY: Math.cos(p * Math.PI * 3) * 15 },
        ],
        opacity: interpolate(p, [0, 0.3, 0.7, 1], [0, 0.8, 0.8, 0]),
      };
    }

    if (type === "fall") {
      return {
        transform: [
          { translateX: Math.sin(p * Math.PI * 2) * 10 },
          { translateY: p * containerHeight },
        ],
        opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 0.6, 0.6, 0]),
      };
    }

    if (type === "rise") {
      return {
        transform: [
          { translateX: Math.sin(p * Math.PI * 4) * 8 },
          { translateY: -p * containerHeight * 0.8 },
          { scale: interpolate(p, [0, 0.5, 1], [0.5, 1, 0.3]) },
        ],
        opacity: interpolate(p, [0, 0.2, 0.7, 1], [0, 0.7, 0.5, 0]),
      };
    }

    if (type === "twinkle") {
      return {
        transform: [{ scale: interpolate(p, [0, 0.5, 1], [0.3, 1, 0.3]) }],
        opacity: interpolate(p, [0, 0.3, 0.5, 0.7, 1], [0, 1, 0.4, 1, 0]),
      };
    }

    if (type === "drift") {
      return {
        transform: [
          { translateX: p * 30 - 15 },
          { translateY: p * containerHeight * 0.7 },
        ],
        opacity: interpolate(p, [0, 0.15, 0.85, 1], [0, 0.4, 0.4, 0]),
      };
    }

    return {};
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: startY,
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

function AuroraWave({ index, color, containerHeight }: { index: number; color: string; containerHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 800,
      withRepeat(
        withTiming(1, { duration: 4000 + index * 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [-10, 10]) },
        { scaleX: interpolate(p, [0, 0.5, 1], [0.95, 1.05, 0.95]) },
      ],
      opacity: interpolate(p, [0, 0.5, 1], [0.15, 0.35, 0.15]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -20,
          right: -20,
          top: 60 + index * 40,
          height: 60,
          borderRadius: 30,
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
      {effect === "fireflies" ? <FirefliesEffect height={height} /> : null}
      {effect === "aurora" ? <AuroraEffect height={height} /> : null}
      {effect === "bubbles" ? <BubblesEffect height={height} /> : null}
      {effect === "stars" ? <StarsEffect height={height} /> : null}
      {effect === "snow" ? <SnowEffect height={height} /> : null}
      {effect === "rain" ? <RainEffect height={height} /> : null}
    </View>
  );
}

function FirefliesEffect({ height }: { height: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 300,
      duration: 3000 + Math.random() * 2000,
      startX: Math.random() * (SCREEN_WIDTH - 20),
      startY: Math.random() * (height - 20),
      size: 4 + Math.random() * 4,
      color: `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${50 + Math.floor(Math.random() * 100)}, 0.8)`,
    })),
    [height]
  );

  return (
    <>
      {particles.map((p) => (
        <Particle key={p.id} {...p} type="float" containerHeight={height} />
      ))}
    </>
  );
}

function AuroraEffect({ height }: { height: number }) {
  const colors = ["#00ff87", "#60efff", "#ff6bcb", "#7b68ee"];

  return (
    <>
      {colors.map((color, i) => (
        <AuroraWave key={i} index={i} color={color} containerHeight={height} />
      ))}
    </>
  );
}

function BubblesEffect({ height }: { height: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      delay: i * 500,
      duration: 4000 + Math.random() * 3000,
      startX: Math.random() * (SCREEN_WIDTH - 30),
      startY: height - 10,
      size: 8 + Math.random() * 16,
      color: `rgba(120, 200, 255, ${0.15 + Math.random() * 0.2})`,
    })),
    [height]
  );

  return (
    <>
      {particles.map((p) => (
        <Particle key={p.id} {...p} type="rise" containerHeight={height} />
      ))}
    </>
  );
}

function StarsEffect({ height }: { height: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: i * 200,
      duration: 2000 + Math.random() * 2000,
      startX: Math.random() * (SCREEN_WIDTH - 10),
      startY: Math.random() * (height - 10),
      size: 2 + Math.random() * 3,
      color: `rgba(255, 255, ${200 + Math.floor(Math.random() * 55)}, 0.9)`,
    })),
    [height]
  );

  return (
    <>
      {particles.map((p) => (
        <Particle key={p.id} {...p} type="twinkle" containerHeight={height} />
      ))}
    </>
  );
}

function SnowEffect({ height }: { height: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      delay: i * 400,
      duration: 5000 + Math.random() * 3000,
      startX: Math.random() * (SCREEN_WIDTH - 10),
      startY: -10,
      size: 3 + Math.random() * 4,
      color: "rgba(255, 255, 255, 0.6)",
    })),
    [height]
  );

  return (
    <>
      {particles.map((p) => (
        <Particle key={p.id} {...p} type="drift" containerHeight={height} />
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
