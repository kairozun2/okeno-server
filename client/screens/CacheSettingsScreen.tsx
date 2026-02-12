import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import * as FileSystem from 'expo-file-system/legacy';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as Database from "@/lib/database";

export default function CacheSettingsScreen() {
  const { theme, isDark, hapticsEnabled, language } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const [stats, setStats] = useState({
    storage: "...",
    percent: 0,
    messagesCount: 0,
    imagesCount: 0,
    postsCount: 0,
    chatsCount: 0,
    cacheSize: "...",
    docSize: 0,
    cacheBytes: 0,
    totalBytes: 0,
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
      let cacheSize = 0;
      let docSize = 0;

      if (Platform.OS !== 'web') {
        const cacheDir = FileSystem.cacheDirectory;
        const documentDir = FileSystem.documentDirectory;
        if (cacheDir) cacheSize = await getDirSize(cacheDir);
        if (documentDir) docSize = await getDirSize(documentDir);
      }

      const totalAppSize = cacheSize + docSize;

      let messagesCount = 0;
      let postsCount = 0;
      let chatsCount = 0;
      let imagesCount = 0;

      try {
        const db = await Database.getDatabase();
        if (db) {
          const msgResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM messages');
          messagesCount = msgResult?.count || 0;

          const postResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM posts');
          postsCount = postResult?.count || 0;

          const chatResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM chats');
          chatsCount = chatResult?.count || 0;

          const imgResult = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM messages WHERE image_url IS NOT NULL AND image_url != ''");
          const postImgResult = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM posts WHERE image_url IS NOT NULL AND image_url != ''");
          imagesCount = (imgResult?.count || 0) + (postImgResult?.count || 0);
        }
      } catch {}

      setStats({
        storage: formatSize(totalAppSize),
        percent: totalAppSize > 0 ? (totalAppSize / (1024 * 1024 * 1024)) * 100 : 0,
        messagesCount,
        imagesCount,
        postsCount,
        chatsCount,
        cacheSize: formatSize(cacheSize),
        docSize,
        cacheBytes: cacheSize,
        totalBytes: totalAppSize,
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

      if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
        const protectedDirs = ['ExponentAsset', 'ExponentFont', 'fontFamily', 'expo-font', 'expo-asset'];
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        await Promise.all(
          files
            .filter(file => !protectedDirs.some(dir => file.toLowerCase().includes(dir.toLowerCase())))
            .map(file => FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true }))
        );
      }

      try {
        await Database.clearAllData();
      } catch {}

      await loadRealStats();

      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(t("Done", "Готово"), t("Cache cleared successfully", "Кэш успешно очищен"));
    } catch (error) {
      await loadRealStats();
    }
  };

  const progressPercent = Math.max(stats.percent, 0.5);

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
             <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: theme.link }]} />
           </View>
           <View style={styles.chartLegend}>
             <View style={styles.legendItem}>
               <View style={[styles.dot, { backgroundColor: theme.link }]} />
               <ThemedText type="caption">Okeno ({stats.storage})</ThemedText>
             </View>
             <ThemedText type="caption" style={{ color: theme.textSecondary }}>
               {stats.totalBytes > 0 ? `${progressPercent.toFixed(2)}%` : "—"}
             </ThemedText>
           </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            {t("APP DATA", "ДАННЫЕ ПРИЛОЖЕНИЯ")}
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="message-circle" size={16} color={theme.textSecondary} />
                <ThemedText type="body">{t("Messages", "Сообщения")}</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.messagesCount}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="image" size={16} color={theme.textSecondary} />
                <ThemedText type="body">{t("Images", "Изображения")}</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.imagesCount}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="grid" size={16} color={theme.textSecondary} />
                <ThemedText type="body">{t("Posts", "Посты")}</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.postsCount}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="message-square" size={16} color={theme.textSecondary} />
                <ThemedText type="body">{t("Chats", "Чаты")}</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.chatsCount}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="database" size={16} color={theme.textSecondary} />
                <ThemedText type="body">{t("Request cache", "Кэш запросов")}</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{stats.cacheSize}</ThemedText>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Pressable onPress={handleClearCache}>
            <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
                  {t("Clear all cache", "Очистить весь кэш")}
                </ThemedText>
              </View>
            </View>
          </Pressable>
          <ThemedText type="caption" style={styles.footerText}>
            {t(
              "Clearing cache will remove temporarily saved data, but your messages and posts will remain on the server.",
              "Очистка кэша удалит временно сохраненные данные, но ваши сообщения и посты останутся на сервере."
            )}
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
  card: {
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
