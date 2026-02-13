import React, { useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  SharedValue,
  useDerivedValue,
  cancelAnimation,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EFFECT_HEIGHT = 280;

export type ProfileEffectType = "stars" | "rain" | "aurora" | "fireflies" | "sakura" | "nebula" | null;

export const PROFILE_EFFECTS: { id: ProfileEffectType; label: string; labelRu: string; emoji: string }[] = [
  { id: null, label: "None", labelRu: "Нет", emoji: "" },
  { id: "stars", label: "Stars", labelRu: "Звёзды", emoji: "✦" },
  { id: "rain", label: "Rain", labelRu: "Дождь", emoji: "☂" },
  { id: "aurora", label: "Aurora", labelRu: "Сияние", emoji: "❖" },
  { id: "fireflies", label: "Fireflies", labelRu: "Светлячки", emoji: "◉" },
  { id: "sakura", label: "Sakura", labelRu: "Сакура", emoji: "✿" },
  { id: "nebula", label: "Nebula", labelRu: "Туманность", emoji: "◆" },
];

function Star({ delay, duration, x, y, size, color, scrollSpeed }: { delay: number; duration: number; x: number; y: number; size: number; color: string; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const slowdown = Math.max(0.15, 1 - Math.abs(scrollSpeed.value) * 0.008);
    const scaleMod = interpolate(p, [0, 0.5, 1], [0.3, 1, 0.3]);
    return {
      transform: [{ scale: scaleMod * slowdown }],
      opacity: interpolate(p, [0, 0.3, 0.5, 0.7, 1], [0, 1, 0.4, 1, 0]) * slowdown,
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

function RainDrop({ startX, delay, containerHeight, baseDuration, scrollSpeed }: { startX: number; delay: number; containerHeight: number; baseDuration: number; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: baseDuration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const speedFactor = Math.abs(scrollSpeed.value) * 0.005;
    const slowdown = Math.max(0.2, 1 - speedFactor);
    return {
      transform: [{ translateY: p * containerHeight }],
      opacity: interpolate(p, [0, 0.1, 0.9, 1], [0, 0.35 * slowdown, 0.35 * slowdown, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: startX, top: -10, width: 1.5, height: 12, borderRadius: 1, backgroundColor: "rgba(150,200,255,0.5)" },
        animatedStyle,
      ]}
    />
  );
}

function AuroraWave({ index, width, height, scrollSpeed }: { index: number; width: number; height: number; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);
  const colors = [
    "rgba(0, 255, 128, 0.12)",
    "rgba(0, 200, 255, 0.10)",
    "rgba(128, 0, 255, 0.08)",
    "rgba(0, 255, 200, 0.10)",
    "rgba(64, 128, 255, 0.09)",
  ];
  const color = colors[index % colors.length];
  const duration = 4000 + index * 1200;
  const waveHeight = height * (0.25 + (index % 3) * 0.12);
  const yOffset = height * 0.2 + index * (height * 0.12);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const slowdown = Math.max(0.2, 1 - Math.abs(scrollSpeed.value) * 0.006);
    const translateX = interpolate(p, [0, 1], [-width * 0.3, width * 0.3]) * slowdown;
    const translateY = Math.sin(p * Math.PI * 2) * 8 * slowdown;
    const scaleX = interpolate(p, [0, 0.5, 1], [1, 1.15, 1]);
    return {
      transform: [{ translateX }, { translateY }, { scaleX }],
      opacity: interpolate(p, [0, 0.3, 0.7, 1], [0.4, 0.8, 0.8, 0.4]) * slowdown,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -width * 0.2,
          top: yOffset,
          width: width * 1.4,
          height: waveHeight,
          borderRadius: waveHeight / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function Firefly({ x, y, delay, scrollSpeed }: { x: number; y: number; delay: number; scrollSpeed: SharedValue<number> }) {
  const progressX = useSharedValue(0);
  const progressY = useSharedValue(0);
  const progressGlow = useSharedValue(0);
  const driftRangeX = 15 + Math.random() * 25;
  const driftRangeY = 10 + Math.random() * 20;

  useEffect(() => {
    progressX.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3500 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }), -1, true));
    progressY.value = withDelay(delay + 200, withRepeat(withTiming(1, { duration: 4000 + Math.random() * 2500, easing: Easing.inOut(Easing.sin) }), -1, true));
    progressGlow.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2000 + Math.random() * 1500, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => {
      cancelAnimation(progressX);
      cancelAnimation(progressY);
      cancelAnimation(progressGlow);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const slowdown = Math.max(0.15, 1 - Math.abs(scrollSpeed.value) * 0.007);
    const tx = interpolate(progressX.value, [0, 1], [-driftRangeX, driftRangeX]) * slowdown;
    const ty = interpolate(progressY.value, [0, 1], [-driftRangeY, driftRangeY]) * slowdown;
    const glowScale = interpolate(progressGlow.value, [0, 0.5, 1], [0.4, 1, 0.4]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale: glowScale * slowdown }],
      opacity: interpolate(progressGlow.value, [0, 0.3, 0.7, 1], [0.1, 0.85, 0.85, 0.1]) * slowdown,
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, alignItems: "center", justifyContent: "center" }, animatedStyle]}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255, 220, 100, 0.15)" }} />
      <View style={{ position: "absolute", width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255, 240, 150, 0.9)" }} />
    </Animated.View>
  );
}

function SakuraPetal({ x, delay, containerHeight, scrollSpeed }: { x: number; delay: number; containerHeight: number; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);
  const swayPhase = Math.random() * Math.PI * 2;
  const fallDuration = 3500 + Math.random() * 2500;
  const swayAmount = 30 + Math.random() * 40;
  const rotateStart = Math.random() * 360;

  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration: fallDuration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const slowdown = Math.max(0.2, 1 - Math.abs(scrollSpeed.value) * 0.006);
    const translateY = p * (containerHeight + 20) * slowdown;
    const sway = Math.sin((p * Math.PI * 3) + swayPhase) * swayAmount * slowdown;
    const rotate = rotateStart + p * 360 * slowdown;
    return {
      transform: [
        { translateY },
        { translateX: sway },
        { rotate: `${rotate}deg` },
        { scaleX: interpolate(Math.sin(p * Math.PI * 2), [-1, 1], [0.6, 1]) },
      ],
      opacity: interpolate(p, [0, 0.05, 0.85, 1], [0, 0.7 * slowdown, 0.7 * slowdown, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, top: -15 },
        animatedStyle,
      ]}
    >
      <View style={{ width: 8, height: 10, borderTopLeftRadius: 8, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 8, backgroundColor: "rgba(255, 183, 197, 0.7)" }} />
    </Animated.View>
  );
}

function NebulaOrb({ x, y, size, color, delay, scrollSpeed }: { x: number; y: number; size: number; color: string; delay: number; scrollSpeed: SharedValue<number> }) {
  const progressScale = useSharedValue(0);
  const progressDrift = useSharedValue(0);
  const driftRange = 10 + Math.random() * 15;

  useEffect(() => {
    progressScale.value = withDelay(delay, withRepeat(withTiming(1, { duration: 4000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }), -1, true));
    progressDrift.value = withDelay(delay, withRepeat(withTiming(1, { duration: 6000 + Math.random() * 4000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(progressScale);
      cancelAnimation(progressDrift);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const slowdown = Math.max(0.2, 1 - Math.abs(scrollSpeed.value) * 0.006);
    const scale = interpolate(progressScale.value, [0, 0.5, 1], [0.6, 1.2, 0.6]);
    const tx = interpolate(progressDrift.value, [0, 1], [-driftRange, driftRange]) * slowdown;
    const ty = Math.sin(progressDrift.value * Math.PI) * driftRange * 0.6 * slowdown;
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale: scale * slowdown }],
      opacity: interpolate(progressScale.value, [0, 0.4, 0.6, 1], [0.2, 0.6, 0.6, 0.2]) * slowdown,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
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

interface ProfileEffectProps {
  effect: ProfileEffectType;
  height?: number;
  scrollY?: SharedValue<number>;
}

export function ProfileEffect({ effect, height = EFFECT_HEIGHT, scrollY }: ProfileEffectProps) {
  const fallbackScroll = useSharedValue(0);
  const prevScrollY = useSharedValue(0);
  const scrollSpeed = useSharedValue(0);

  const activeScrollY = scrollY || fallbackScroll;

  useDerivedValue(() => {
    scrollSpeed.value = activeScrollY.value - prevScrollY.value;
    prevScrollY.value = activeScrollY.value;
  });

  if (!effect) return null;

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {effect === "stars" ? <StarsEffect height={height} scrollSpeed={scrollSpeed} /> : null}
      {effect === "rain" ? <RainEffect height={height} scrollSpeed={scrollSpeed} /> : null}
      {effect === "aurora" ? <AuroraEffect height={height} scrollSpeed={scrollSpeed} /> : null}
      {effect === "fireflies" ? <FirefliesEffect height={height} scrollSpeed={scrollSpeed} /> : null}
      {effect === "sakura" ? <SakuraEffect height={height} scrollSpeed={scrollSpeed} /> : null}
      {effect === "nebula" ? <NebulaEffect height={height} scrollSpeed={scrollSpeed} /> : null}
    </View>
  );
}

function StarsEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      delay: i * 250,
      duration: 2200 + Math.random() * 2000,
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
        <Star key={p.id} {...p} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function RainEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const drops = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      delay: i * 120 + Math.random() * 300,
      baseDuration: 800 + Math.random() * 400,
    })),
    []
  );

  return (
    <>
      {drops.map((d) => (
        <RainDrop key={d.id} startX={d.startX} delay={d.delay} containerHeight={height} baseDuration={d.baseDuration} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function AuroraEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const waves = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  return (
    <>
      {waves.map((i) => (
        <AuroraWave key={i} index={i} width={SCREEN_WIDTH} height={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function FirefliesEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const flies = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * (SCREEN_WIDTH - 40),
      y: 20 + Math.random() * (height - 40),
      delay: i * 300 + Math.random() * 500,
    })),
    [height]
  );

  return (
    <>
      {flies.map((f) => (
        <Firefly key={f.id} x={f.x} y={f.y} delay={f.delay} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function SakuraEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const petals = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      delay: i * 400 + Math.random() * 800,
    })),
    []
  );

  return (
    <>
      {petals.map((p) => (
        <SakuraPetal key={p.id} x={p.x} delay={p.delay} containerHeight={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function NebulaEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const orbs = useMemo(() => {
    const colors = [
      "rgba(120, 50, 200, 0.15)",
      "rgba(60, 100, 255, 0.12)",
      "rgba(200, 50, 150, 0.10)",
      "rgba(80, 180, 255, 0.12)",
      "rgba(150, 60, 220, 0.10)",
      "rgba(40, 150, 200, 0.10)",
      "rgba(180, 80, 180, 0.08)",
      "rgba(100, 60, 255, 0.10)",
    ];
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * height,
      size: 40 + Math.random() * 60,
      color: colors[i % colors.length],
      delay: i * 400,
    }));
  }, [height]);

  return (
    <>
      {orbs.map((o) => (
        <NebulaOrb key={o.id} {...o} scrollSpeed={scrollSpeed} />
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
