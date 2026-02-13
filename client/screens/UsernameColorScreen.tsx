import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const COLORS = [
  { value: null, label: "По умолчанию", labelEn: "Default" },
  { value: "#FF6B6B", label: "Красный", labelEn: "Red" },
  { value: "#4ECDC4", label: "Бирюзовый", labelEn: "Teal" },
  { value: "#45B7D1", label: "Голубой", labelEn: "Sky Blue" },
  { value: "#96CEB4", label: "Мятный", labelEn: "Mint" },
  { value: "#FFEAA7", label: "Золотой", labelEn: "Gold" },
  { value: "#DDA0DD", label: "Сиреневый", labelEn: "Plum" },
  { value: "#FF8C00", label: "Оранжевый", labelEn: "Orange" },
  { value: "#00CED1", label: "Аквамарин", labelEn: "Aqua" },
  { value: "#FF69B4", label: "Розовый", labelEn: "Hot Pink" },
  { value: "#7B68EE", label: "Фиолетовый", labelEn: "Purple" },
  { value: "#98FB98", label: "Зелёный", labelEn: "Green" },
  { value: "#F0E68C", label: "Хаки", labelEn: "Khaki" },
];

export default function UsernameColorScreen({ navigation }: any) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>((user as any)?.usernameColor || null);

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
          <ThemedText type="h3" style={selected ? { color: selected } : undefined}>
            {user?.username || "Username"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {t("Preview of your username color", "Предпросмотр цвета имени")}
          </ThemedText>
        </View>

        <View style={styles.colorsGrid}>
          {COLORS.map((color) => (
            <Pressable
              key={color.value || "default"}
              style={[
                styles.colorOption,
                { backgroundColor: theme.backgroundSecondary },
                selected === color.value ? { borderColor: theme.accent, borderWidth: 2 } : null,
              ]}
              onPress={() => {
                setSelected(color.value);
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View
                style={[
                  styles.colorSwatch,
                  color.value ? { backgroundColor: color.value } : { backgroundColor: theme.text, opacity: 0.3 },
                ]}
              />
              <ThemedText type="small" style={{ flex: 1 }}>
                {language === "ru" ? color.label : color.labelEn}
              </ThemedText>
              {selected === color.value ? (
                <Feather name="check" size={16} color={theme.accent} />
              ) : null}
            </Pressable>
          ))}
        </View>

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
  colorsGrid: {
    gap: Spacing.xs,
  },
  colorOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
