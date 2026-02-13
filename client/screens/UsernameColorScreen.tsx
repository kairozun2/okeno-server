import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PremiumBadge } from "@/components/PremiumBadge";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SLIDER_WIDTH = SCREEN_WIDTH - Spacing.lg * 4;

const PRESET_COLORS = [
  "#FF6B6B", "#FF8C00", "#FFD700", "#FFEAA7",
  "#98FB98", "#4ECDC4", "#00CED1", "#45B7D1",
  "#7B68EE", "#DDA0DD", "#FF69B4", "#96CEB4",
  "#F0E68C", "#E8E8E8", "#FF4500", "#1E90FF",
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function HueSlider({ value, onValueChange, lightness, saturation }: { value: number; onValueChange: (v: number) => void; lightness: number; saturation: number }) {
  const { theme } = useTheme();
  const sliderWidth = useRef(SLIDER_WIDTH);
  const thumbX = useSharedValue((value / 360) * SLIDER_WIDTH);

  const updateFromX = useCallback((x: number) => {
    const clamped = Math.max(0, Math.min(x, sliderWidth.current));
    const newHue = Math.round((clamped / sliderWidth.current) * 360);
    thumbX.value = clamped;
    onValueChange(newHue);
  }, [onValueChange]);

  const gesture = Gesture.Pan()
    .onStart((e) => { updateFromX(e.x); })
    .onUpdate((e) => { updateFromX(e.x); })
    .hitSlop({ top: 20, bottom: 20 });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => { updateFromX(e.x); });

  const composed = Gesture.Race(gesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - 14 }],
  }));

  const hueColors = Array.from({ length: 12 }, (_, i) => hslToHex(i * 30, saturation, lightness));

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
        HUE
      </ThemedText>
      <GestureDetector gesture={composed}>
        <View
          style={styles.sliderTrack}
          onLayout={(e: LayoutChangeEvent) => {
            sliderWidth.current = e.nativeEvent.layout.width;
            thumbX.value = (value / 360) * e.nativeEvent.layout.width;
          }}
        >
          <View style={[StyleSheet.absoluteFill, styles.sliderGradient]}>
            {hueColors.map((color, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: color }} />
            ))}
          </View>
          <Animated.View style={[styles.sliderThumb, { borderColor: lightness > 50 ? "#222" : "#fff" }, thumbStyle]}>
            <View style={[styles.sliderThumbInner, { backgroundColor: hslToHex(value, saturation, lightness) }]} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

function SingleSlider({ label, value, min, max, onValueChange, getColor }: { label: string; value: number; min: number; max: number; onValueChange: (v: number) => void; getColor: (v: number) => string }) {
  const { theme } = useTheme();
  const sliderWidth = useRef(SLIDER_WIDTH);
  const range = max - min;
  const thumbX = useSharedValue(((value - min) / range) * SLIDER_WIDTH);

  const updateFromX = useCallback((x: number) => {
    const clamped = Math.max(0, Math.min(x, sliderWidth.current));
    const newVal = Math.round(min + (clamped / sliderWidth.current) * range);
    thumbX.value = clamped;
    onValueChange(newVal);
  }, [onValueChange, min, range]);

  const gesture = Gesture.Pan()
    .onStart((e) => { updateFromX(e.x); })
    .onUpdate((e) => { updateFromX(e.x); })
    .hitSlop({ top: 20, bottom: 20 });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => { updateFromX(e.x); });

  const composed = Gesture.Race(gesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - 14 }],
  }));

  const gradColors = [getColor(min), getColor(Math.round((min + max) / 2)), getColor(max)];

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
        {label}
      </ThemedText>
      <GestureDetector gesture={composed}>
        <View
          style={styles.sliderTrack}
          onLayout={(e: LayoutChangeEvent) => {
            sliderWidth.current = e.nativeEvent.layout.width;
            thumbX.value = ((value - min) / range) * e.nativeEvent.layout.width;
          }}
        >
          <View style={[StyleSheet.absoluteFill, styles.sliderGradient]}>
            {gradColors.map((color, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: color }} />
            ))}
          </View>
          <Animated.View style={[styles.sliderThumb, { borderColor: value > 50 ? "#222" : "#fff" }, thumbStyle]}>
            <View style={[styles.sliderThumbInner, { backgroundColor: getColor(value) }]} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

export default function UsernameColorScreen({ navigation }: any) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const initialColor = (user as any)?.usernameColor || null;
  const [selected, setSelected] = useState<string | null>(initialColor);
  const [hue, setHue] = useState<number>(() => {
    if (initialColor) { const [h] = hexToHsl(initialColor); return h; }
    return 0;
  });
  const [saturation, setSaturation] = useState<number>(() => {
    if (initialColor) { const [, s] = hexToHsl(initialColor); return s; }
    return 80;
  });
  const [lightness, setLightness] = useState<number>(() => {
    if (initialColor) { const [, , l] = hexToHsl(initialColor); return l; }
    return 55;
  });

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const mutation = useMutation({
    mutationFn: async (color: string | null) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/username-color`, { color });
      return res.json();
    },
    onSuccess: () => {
      if (refreshUser) refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate(selected);
  };

  const handleHueChange = useCallback((h: number) => {
    setHue(h);
    setSelected(hslToHex(h, saturation, lightness));
  }, [saturation, lightness]);

  const handleSatChange = useCallback((s: number) => {
    setSaturation(s);
    setSelected(hslToHex(hue, s, lightness));
  }, [hue, lightness]);

  const handleLightChange = useCallback((l: number) => {
    setLightness(l);
    setSelected(hslToHex(hue, saturation, l));
  }, [hue, saturation]);

  const currentColor = selected || hslToHex(hue, saturation, lightness);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl * 2,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.preview}>
          <View style={[styles.previewCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ThemedText type="h2" style={selected ? { color: selected } : undefined}>
                {user?.username || "Username"}
              </ThemedText>
              {(user as any)?.isVerified ? (
                <Feather name="check-circle" size={18} color="#007AFF" />
              ) : null}
              {(user as any)?.isPremium ? <PremiumBadge size={16} /> : null}
            </View>
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {t("Preview of your username color", "Предпросмотр цвета имени")}
          </ThemedText>
        </View>

        <View style={[styles.slidersCard, { backgroundColor: theme.backgroundSecondary }]}>
          <HueSlider
            value={hue}
            onValueChange={handleHueChange}
            lightness={lightness}
            saturation={saturation}
          />
          <SingleSlider
            label={t("SATURATION", "НАСЫЩЕННОСТЬ")}
            value={saturation}
            min={0}
            max={100}
            onValueChange={handleSatChange}
            getColor={(s) => hslToHex(hue, s, lightness)}
          />
          <SingleSlider
            label={t("BRIGHTNESS", "ЯРКОСТЬ")}
            value={lightness}
            min={15}
            max={85}
            onValueChange={handleLightChange}
            getColor={(l) => hslToHex(hue, saturation, l)}
          />
        </View>

        {selected ? (
          <View style={[styles.hexDisplay, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.hexSwatch, { backgroundColor: selected }]} />
            <ThemedText type="body" style={{ fontFamily: "monospace" }}>{selected.toUpperCase()}</ThemedText>
          </View>
        ) : null}

        <ThemedText type="body" style={{ fontWeight: "600", marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          {t("Quick Colors", "Быстрые цвета")}
        </ThemedText>
        <View style={styles.presetsGrid}>
          <Pressable
            style={[
              styles.presetItem,
              { backgroundColor: theme.backgroundSecondary },
              selected === null ? { borderColor: theme.accent, borderWidth: 2 } : { borderWidth: 2, borderColor: "transparent" },
            ]}
            onPress={() => {
              setSelected(null);
              if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
          {PRESET_COLORS.map((color) => (
            <Pressable
              key={color}
              style={[
                styles.presetItem,
                { backgroundColor: theme.backgroundSecondary },
                selected === color ? { borderColor: color, borderWidth: 2 } : { borderWidth: 2, borderColor: "transparent" },
              ]}
              onPress={() => {
                setSelected(color);
                const [h, s, l] = hexToHsl(color);
                setHue(h);
                setSaturation(s);
                setLightness(l);
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={[styles.presetSwatch, { backgroundColor: color }]} />
            </Pressable>
          ))}
        </View>

        <Button onPress={handleSave} style={{ backgroundColor: theme.accent, marginTop: Spacing.xl }}>
          <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
            {mutation.isPending ? t("Saving...", "Сохранение...") : t("Save", "Сохранить")}
          </ThemedText>
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  previewCard: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  slidersCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sliderTrack: {
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
  },
  sliderGradient: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
  },
  sliderThumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  sliderThumbInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  presetItem: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  presetSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  hexDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  hexSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
