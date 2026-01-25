import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "@/lib/settings-store";
import { themeList, getTheme, ThemeKey } from "@/lib/themes";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function ThemeSelectionScreen({ navigation }: any) {
  const { theme, language, hapticsEnabled } = useTheme();
  const currentThemeKey = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);
  const insets = useSafeAreaInsets();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const handleSelectTheme = (key: ThemeKey) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTheme(key);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("CHOOSE THEME", "ВЫБЕРИТЕ ТЕМУ")}
        </ThemedText>

        {themeList.map((item, index) => {
          const isSelected = currentThemeKey === item.key;
          return (
            <Animated.View
              key={item.key}
              entering={FadeInDown.delay(index * 50)}
            >
              <Pressable
                onPress={() => handleSelectTheme(item.key)}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: item.colors.card,
                    borderColor: isSelected ? item.colors.accent : "transparent",
                    borderWidth: 2,
                  },
                ]}
              >
                <View style={styles.themeInfo}>
                  <ThemedText style={[styles.themeName, { color: item.colors.text }]}>
                    {item.name}
                  </ThemedText>
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorDot, { backgroundColor: item.colors.primary }]} />
                    <View style={[styles.colorDot, { backgroundColor: item.colors.accent }]} />
                    <View style={[styles.colorDot, { backgroundColor: item.colors.background }]} />
                  </View>
                </View>
                {isSelected && (
                  <Feather name="check-circle" size={24} color={item.colors.accent} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
  },
  themeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  colorPreview: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
