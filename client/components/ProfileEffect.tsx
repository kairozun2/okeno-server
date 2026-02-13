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
  SharedValue,
  useDerivedValue,
  cancelAnimation,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EFFECT_HEIGHT = 280;

export type ProfileEffectType = "stars" | "rain" | "aurora" | "fireflies" | "sakura" | "nebula" | null;

export const PROFILE_EFFECTS: { id: ProfileEffectType; label: string; labelRu: string; emoji: string }[] = [
  { id: null, label: "None", labelRu: "Нет", emoji: "" },
  { id: "stars", label: "Starfall", labelRu: "Звездопад", emoji: "✦" },
  { id: "rain", label: "Rain", labelRu: "Дождь", emoji: "☂" },
  { id: "aurora", label: "Northern Lights", labelRu: "Северное сияние", emoji: "❖" },
  { id: "fireflies", label: "Fireflies", labelRu: "Светлячки", emoji: "◉" },
  { id: "sakura", label: "Sakura", labelRu: "Сакура", emoji: "✿" },
  { id: "nebula", label: "Nebula", labelRu: "Туманность", emoji: "◆" },
];

function StarParticle({ delay, duration, startX, size, height, scrollSpeed }: { delay: number; duration: number; startX: number; size: number; height: number; scrollSpeed: SharedValue<number> }) {
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
    const slowdown = Math.max(0.3, 1 - Math.abs(scrollSpeed.value) * 0.005);
    const fallY = p * (height + 30);
    const drift = Math.sin(p * Math.PI * 2.5) * 15;
    const twinkle = interpolate(
      Math.sin(p * Math.PI * 6),
      [-1, 1],
      [0.3, 1]
    );
    return {
      transform: [
        { translateY: fallY },
        { translateX: drift * slowdown },
        { scale: twinkle * 0.8 + 0.2 },
      ],
      opacity: interpolate(p, [0, 0.03, 0.85, 1], [0, 0.9, 0.7, 0]) * slowdown,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: -10,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(255, 255, ${220 + Math.floor(Math.random() * 35)}, 0.95)`,
        },
        animatedStyle,
      ]}
    />
  );
}

function RainDrop({ startX, delay, containerHeight, baseDuration, width, scrollSpeed }: { startX: number; delay: number; containerHeight: number; baseDuration: number; width: number; scrollSpeed: SharedValue<number> }) {
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
    const slowdown = Math.max(0.3, 1 - Math.abs(scrollSpeed.value) * 0.004);
    return {
      transform: [
        { translateY: p * containerHeight },
        { translateX: p * 3 },
      ],
      opacity: interpolate(p, [0, 0.05, 0.8, 1], [0, 0.25 * slowdown, 0.2 * slowdown, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: -20,
          width: width,
          height: 18 + Math.random() * 10,
          borderRadius: 1,
          backgroundColor: "rgba(160, 210, 255, 0.4)",
        },
        animatedStyle,
      ]}
    />
  );
}

function AuroraBand({ index, width, height, scrollSpeed }: { index: number; width: number; height: number; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);
  const colors = [
    "rgba(40, 255, 160, 0.06)",
    "rgba(20, 180, 255, 0.05)",
    "rgba(100, 60, 255, 0.04)",
    "rgba(50, 220, 200, 0.05)",
  ];
  const color = colors[index % colors.length];
  const duration = 6000 + index * 2000;
  const bandHeight = height * (0.35 + (index % 3) * 0.1);
  const yOffset = height * 0.15 + index * (height * 0.15);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const slowdown = Math.max(0.3, 1 - Math.abs(scrollSpeed.value) * 0.004);
    const translateX = interpolate(p, [0, 1], [-width * 0.15, width * 0.15]) * slowdown;
    const scaleY = interpolate(p, [0, 0.5, 1], [0.8, 1.1, 0.8]);
    return {
      transform: [{ translateX }, { scaleY }],
      opacity: interpolate(p, [0, 0.4, 0.6, 1], [0.3, 0.7, 0.7, 0.3]) * slowdown,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -width * 0.15,
          top: yOffset,
          width: width * 1.3,
          height: bandHeight,
          borderRadius: bandHeight,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function FireflyDot({ x, y, delay, scrollSpeed }: { x: number; y: number; delay: number; scrollSpeed: SharedValue<number> }) {
  const progressMove = useSharedValue(0);
  const progressGlow = useSharedValue(0);
  const driftX = 20 + Math.random() * 30;
  const driftY = 15 + Math.random() * 20;
  const glowSize = 3 + Math.random() * 3;

  useEffect(() => {
    progressMove.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 5000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
    progressGlow.value = withDelay(
      delay + 100,
      withRepeat(
        withTiming(1, { duration: 2500 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(progressMove);
      cancelAnimation(progressGlow);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const slowdown = Math.max(0.2, 1 - Math.abs(scrollSpeed.value) * 0.005);
    const tx = interpolate(progressMove.value, [0, 1], [-driftX, driftX]) * slowdown;
    const ty = interpolate(progressMove.value, [0, 0.5, 1], [-driftY, driftY * 0.5, -driftY]) * slowdown;
    const glow = interpolate(progressGlow.value, [0, 0.5, 1], [0.15, 1, 0.15]);
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: glow * 0.7 + 0.3 },
      ],
      opacity: glow * 0.8 * slowdown,
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, alignItems: "center", justifyContent: "center" }, animatedStyle]}>
      <View style={{ width: glowSize * 3, height: glowSize * 3, borderRadius: glowSize * 1.5, backgroundColor: "rgba(255, 230, 100, 0.08)" }} />
      <View style={{ position: "absolute", width: glowSize, height: glowSize, borderRadius: glowSize / 2, backgroundColor: "rgba(255, 245, 170, 0.85)" }} />
    </Animated.View>
  );
}

function SakuraPetal({ x, delay, containerHeight, scrollSpeed }: { x: number; delay: number; containerHeight: number; scrollSpeed: SharedValue<number> }) {
  const progress = useSharedValue(0);
  const swayPhase = Math.random() * Math.PI * 2;
  const fallDuration = 5000 + Math.random() * 3000;
  const swayAmount = 25 + Math.random() * 35;
  const petalSize = 6 + Math.random() * 4;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: fallDuration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const slowdown = Math.max(0.3, 1 - Math.abs(scrollSpeed.value) * 0.004);
    const fallY = p * (containerHeight + 30) * slowdown;
    const sway = Math.sin(p * Math.PI * 2 + swayPhase) * swayAmount * slowdown;
    const rotation = p * 200 + swayPhase * 57;
    const flipX = interpolate(Math.sin(p * Math.PI * 1.5 + swayPhase), [-1, 1], [0.4, 1]);
    return {
      transform: [
        { translateY: fallY },
        { translateX: sway },
        { rotate: `${rotation}deg` },
        { scaleX: flipX },
      ],
      opacity: interpolate(p, [0, 0.04, 0.8, 1], [0, 0.55 * slowdown, 0.5 * slowdown, 0]),
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: -15 }, animatedStyle]}>
      <View style={{
        width: petalSize,
        height: petalSize * 1.3,
        borderTopLeftRadius: petalSize,
        borderTopRightRadius: petalSize * 0.3,
        borderBottomLeftRadius: petalSize * 0.3,
        borderBottomRightRadius: petalSize,
        backgroundColor: "rgba(255, 183, 197, 0.55)",
      }} />
    </Animated.View>
  );
}

function NebulaCloud({ x, y, size, color, delay, scrollSpeed }: { x: number; y: number; size: number; color: string; delay: number; scrollSpeed: SharedValue<number> }) {
  const progressPulse = useSharedValue(0);
  const progressDrift = useSharedValue(0);

  useEffect(() => {
    progressPulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 6000 + Math.random() * 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
    progressDrift.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 10000 + Math.random() * 5000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(progressPulse);
      cancelAnimation(progressDrift);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const slowdown = Math.max(0.3, 1 - Math.abs(scrollSpeed.value) * 0.004);
    const scale = interpolate(progressPulse.value, [0, 0.5, 1], [0.85, 1.15, 0.85]);
    const tx = interpolate(progressDrift.value, [0, 1], [-8, 8]) * slowdown;
    const ty = interpolate(progressDrift.value, [0, 0.5, 1], [-5, 5, -5]) * slowdown;
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale: scale * slowdown }],
      opacity: interpolate(progressPulse.value, [0, 0.5, 1], [0.15, 0.35, 0.15]) * slowdown,
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
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 350 + Math.random() * 300,
      duration: 3000 + Math.random() * 2500,
      startX: Math.random() * (SCREEN_WIDTH - 5),
      size: 1.5 + Math.random() * 2,
    })),
    []
  );

  return (
    <>
      {particles.map((p) => (
        <StarParticle key={p.id} {...p} height={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function RainEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const drops = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      delay: i * 80 + Math.random() * 200,
      baseDuration: 600 + Math.random() * 300,
      width: 1 + Math.random() * 0.5,
    })),
    []
  );

  return (
    <>
      {drops.map((d) => (
        <RainDrop key={d.id} {...d} containerHeight={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function AuroraEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const bands = useMemo(() => Array.from({ length: 4 }, (_, i) => i), []);

  return (
    <>
      {bands.map((i) => (
        <AuroraBand key={i} index={i} width={SCREEN_WIDTH} height={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function FirefliesEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const flies = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * (SCREEN_WIDTH - 30),
      y: 15 + Math.random() * (height - 30),
      delay: i * 400 + Math.random() * 600,
    })),
    [height]
  );

  return (
    <>
      {flies.map((f) => (
        <FireflyDot key={f.id} {...f} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function SakuraEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const petals = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      delay: i * 500 + Math.random() * 1000,
    })),
    []
  );

  return (
    <>
      {petals.map((p) => (
        <SakuraPetal key={p.id} {...p} containerHeight={height} scrollSpeed={scrollSpeed} />
      ))}
    </>
  );
}

function NebulaEffect({ height, scrollSpeed }: { height: number; scrollSpeed: SharedValue<number> }) {
  const clouds = useMemo(() => {
    const colors = [
      "rgba(100, 40, 180, 0.12)",
      "rgba(50, 80, 220, 0.10)",
      "rgba(170, 40, 130, 0.08)",
      "rgba(60, 150, 220, 0.10)",
      "rgba(130, 50, 200, 0.09)",
      "rgba(40, 120, 180, 0.08)",
    ];
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: SCREEN_WIDTH * 0.15 + Math.random() * (SCREEN_WIDTH * 0.7),
      y: height * 0.1 + Math.random() * (height * 0.8),
      size: 50 + Math.random() * 70,
      color: colors[i % colors.length],
      delay: i * 500,
    }));
  }, [height]);

  return (
    <>
      {clouds.map((c) => (
        <NebulaCloud key={c.id} {...c} scrollSpeed={scrollSpeed} />
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
