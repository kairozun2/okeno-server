import React, { useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Pressable, PanResponder, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PremiumBadge } from "@/components/PremiumBadge";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const WHEEL_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 280);
const WHEEL_RADIUS = WHEEL_SIZE / 2;

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

export default function UsernameColorScreen({ navigation }: any) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const initialColor = (user as any)?.usernameColor || null;
  const [selected, setSelected] = useState<string | null>(initialColor);
  const [hue, setHue] = useState<number>(() => {
    if (initialColor) {
      const [h] = hexToHsl(initialColor);
      return h;
    }
    return 0;
  });
  const [saturation, setSaturation] = useState<number>(() => {
    if (initialColor) {
      const [, s] = hexToHsl(initialColor);
      return s;
    }
    return 80;
  });
  const [lightness, setLightness] = useState<number>(() => {
    if (initialColor) {
      const [, , l] = hexToHsl(initialColor);
      return l;
    }
    return 55;
  });

  const wheelRef = useRef<View>(null);

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

  const handleWheelTouch = (x: number, y: number) => {
    const cx = x - WHEEL_RADIUS;
    const cy = y - WHEEL_RADIUS;
    const dist = Math.sqrt(cx * cx + cy * cy);
    if (dist > WHEEL_RADIUS) return;

    let angle = Math.atan2(cy, cx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const newHue = Math.round(angle);
    const newSat = Math.round(Math.min(dist / WHEEL_RADIUS, 1) * 100);
    setHue(newHue);
    setSaturation(newSat);
    const hex = hslToHex(newHue, newSat, lightness);
    setSelected(hex);
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const wheelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleWheelTouch(locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleWheelTouch(locationX, locationY);
      },
    })
  ).current;

  const handleLightnessChange = (lx: number, width: number) => {
    const newL = Math.round(Math.max(15, Math.min(85, (lx / width) * 100)));
    setLightness(newL);
    if (selected) {
      const hex = hslToHex(hue, saturation, newL);
      setSelected(hex);
    }
  };

  const lightnessPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleLightnessChange(evt.nativeEvent.locationX, WHEEL_SIZE);
      },
      onPanResponderMove: (evt) => {
        handleLightnessChange(evt.nativeEvent.locationX, WHEEL_SIZE);
      },
    })
  ).current;

  const renderColorWheel = () => {
    const segments = 36;
    const segmentAngle = 360 / segments;
    const rings = 5;

    return (
      <View
        ref={wheelRef}
        style={[styles.wheel, { width: WHEEL_SIZE, height: WHEEL_SIZE }]}
        {...wheelPanResponder.panHandlers}
      >
        {Array.from({ length: segments }).map((_, i) => {
          const angle = i * segmentAngle;
          return Array.from({ length: rings }).map((_, r) => {
            const ringRadius = ((r + 1) / rings) * WHEEL_RADIUS;
            const sat = ((r + 1) / rings) * 100;
            const rad = (angle * Math.PI) / 180;
            const x = WHEEL_RADIUS + Math.cos(rad) * ringRadius * 0.85 - 8;
            const y = WHEEL_RADIUS + Math.sin(rad) * ringRadius * 0.85 - 8;
            const color = hslToHex(angle, sat, lightness);
            return (
              <View
                key={`${i}-${r}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: color,
                }}
              />
            );
          });
        })}
        {selected ? (
          <View style={[styles.wheelIndicator, { borderColor: lightness > 50 ? "#000" : "#fff" }]}>
            <View style={[styles.wheelIndicatorInner, { backgroundColor: selected }]} />
          </View>
        ) : null}
      </View>
    );
  };

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ThemedText type="h2" style={selected ? { color: selected } : undefined}>
              {user?.username || "Username"}
            </ThemedText>
            {(user as any)?.isVerified ? (
              <View style={{ marginLeft: 2 }}>
                <Feather name="check-circle" size={18} color="#007AFF" />
              </View>
            ) : null}
            {(user as any)?.isPremium ? <PremiumBadge size={16} /> : null}
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {t("Preview of your username color", "Предпросмотр цвета имени")}
          </ThemedText>
        </View>

        <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.sm }}>
          {t("Color Wheel", "Цветовой круг")}
        </ThemedText>
        <View style={[styles.wheelContainer, { backgroundColor: theme.backgroundSecondary }]}>
          {renderColorWheel()}
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {t("Brightness", "Яркость")}
          </ThemedText>
          <View
            style={[styles.lightnessBar, { width: WHEEL_SIZE }]}
            {...lightnessPanResponder.panHandlers}
          >
            <View style={[styles.lightnessGradient, {
              backgroundColor: hslToHex(hue, saturation, 50),
            }]}>
              <View style={[styles.lightnessOverlayDark]} />
              <View style={[styles.lightnessOverlayLight]} />
              <View style={[styles.lightnessThumb, {
                left: `${lightness}%`,
                backgroundColor: hslToHex(hue, saturation, lightness),
                borderColor: lightness > 50 ? "#000" : "#fff",
              }]} />
            </View>
          </View>
        </View>

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
            <View style={[styles.presetSwatch, { backgroundColor: theme.text, opacity: 0.3 }]} />
            {selected === null ? <Feather name="check" size={14} color={theme.accent} /> : null}
          </Pressable>
          {PRESET_COLORS.map((color) => (
            <Pressable
              key={color}
              style={[
                styles.presetItem,
                { backgroundColor: theme.backgroundSecondary },
                selected === color ? { borderColor: theme.accent, borderWidth: 2 } : { borderWidth: 2, borderColor: "transparent" },
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
              {selected === color ? <Feather name="check" size={14} color={theme.accent} /> : null}
            </Pressable>
          ))}
        </View>

        {selected ? (
          <View style={[styles.hexDisplay, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.hexSwatch, { backgroundColor: selected }]} />
            <ThemedText type="body" style={{ fontFamily: "monospace" }}>{selected.toUpperCase()}</ThemedText>
          </View>
        ) : null}

        <Button onPress={handleSave} style={{ backgroundColor: theme.accent, marginTop: Spacing.lg }}>
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
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  wheelContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  wheel: {
    borderRadius: 999,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  wheelIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -14,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelIndicatorInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  lightnessBar: {
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  lightnessGradient: {
    flex: 1,
    borderRadius: 16,
    position: "relative",
  },
  lightnessOverlayDark: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  lightnessOverlayLight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  lightnessThumb: {
    position: "absolute",
    top: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    borderWidth: 3,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  presetItem: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  presetSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
