import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GlassView } from "expo-glass-effect";

export default function CacheSettingsScreen() {
  const { theme, isDark, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  
  const [stats, setStats] = useState({
    storage: "0 B",
    percent: "0.1%",
    messages: "0",
    images: "0",
    cache: "0 B"
  });

  useEffect(() => {
    // В реальном приложении здесь был бы расчет размера файлов
    // Для демонстрации имитируем небольшое использование
    const loadRealStats = async () => {
      // Имитируем задержку чтения ФС
      setTimeout(() => {
        setStats({
          storage: "12.4 MB",
          percent: "0.4%",
          messages: "142",
          images: "12",
          cache: "2.1 MB"
        });
      }, 500);
    };
    loadRealStats();
  }, []);

  const handleClearCache = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await queryClient.clear();
    setStats(prev => ({ ...prev, cache: "0 B", messages: "0", storage: "10.3 MB" }));
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.chartContainer}>
           <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
             <View style={[styles.progressFill, { width: '12%', backgroundColor: theme.link }]} />
           </View>
           <View style={styles.chartLegend}>
             <View style={styles.legendItem}>
               <View style={[styles.dot, { backgroundColor: theme.link }]} />
               <ThemedText type="caption">Moments ({stats.storage})</ThemedText>
             </View>
             <ThemedText type="caption" style={{ color: theme.textSecondary }}>Свободно 24.5 ГБ</ThemedText>
           </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>ДАННЫЕ ПРИЛОЖЕНИЯ</ThemedText>
          <GlassView tintColor={theme.cardBackground} glassEffectStyle={isDark ? "dark" : "light" as any} style={styles.glassCard}>
            <View style={styles.row}>
              <ThemedText type="body">Сообщения</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.messages}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <ThemedText type="body">Изображения</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.images}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <ThemedText type="body">Кэш запросов</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.cache}</ThemedText>
            </View>
          </GlassView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Pressable onPress={handleClearCache}>
            <GlassView tintColor={theme.cardBackground} glassEffectStyle={isDark ? "dark" : "light" as any} style={styles.glassCard}>
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>Очистить весь кэш</ThemedText>
              </View>
            </GlassView>
          </Pressable>
          <ThemedText type="caption" style={styles.footerText}>
            Очистка кэша удалит временно сохраненные данные, но ваши сообщения и посты останутся на сервере.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    marginBottom: Spacing.xl,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    opacity: 0.6,
  },
  glassCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  footerText: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.sm,
    textAlign: 'center',
    opacity: 0.5,
  }
});
