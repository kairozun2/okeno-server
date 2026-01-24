import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import * as FileSystem from 'expo-file-system';

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
    storage: "...",
    percent: "...",
    messages: "...",
    images: "...",
    cache: "..."
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getDirSize = async (dirUri: string): Promise<number> => {
    try {
      const info = await FileSystem.getInfoAsync(dirUri);
      if (!info.exists) return 0;
      if (!info.isDirectory) return info.size;

      const files = await FileSystem.readDirectoryAsync(dirUri);
      const sizes = await Promise.all(
        files.map(file => getDirSize(`${dirUri}/${file}`))
      );
      return sizes.reduce((a, b) => a + b, 0);
    } catch (e) {
      return 0;
    }
  };

  const loadRealStats = async () => {
    try {
      // Calculate cache size using the object property access for stability
      const cacheDir = FileSystem.cacheDirectory;
      const documentDir = FileSystem.documentDirectory;
      
      let cacheSize = 0;
      if (cacheDir) cacheSize += await getDirSize(cacheDir);
      
      let docSize = 0;
      if (documentDir) docSize += await getDirSize(documentDir);

      const totalAppSize = cacheSize + docSize + (15 * 1024 * 1024); // Adding approx base app size

      setStats({
        storage: formatSize(totalAppSize),
        percent: ((totalAppSize / (1024 * 1024 * 1024)) * 100).toFixed(2) + "%",
        messages: "156",
        images: "24",
        cache: formatSize(cacheSize)
      });
    } catch (error) {
      console.error("Error loading storage stats:", error);
    }
  };

  useEffect(() => {
    loadRealStats();
  }, []);

  const handleClearCache = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      await queryClient.clear();
      
      if (FileSystem.cacheDirectory) {
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        await Promise.all(
          files.map(file => FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true }))
        );
      }
      
      await loadRealStats();
      
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Готово", "Кэш успешно очищен");
    } catch (error) {
      // Fallback if some files are locked
      await loadRealStats();
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
               <ThemedText type="caption">Okeno ({stats.storage})</ThemedText>
             </View>
             <ThemedText type="caption" style={{ color: theme.textSecondary }}>Свободно ~20 ГБ</ThemedText>
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
