import React from "react";
import { View, StyleSheet, ScrollView, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "@/lib/settings-store";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NotificationPreferences } from "@/lib/settings-store";

export default function NotificationSettingsScreen() {
  const { theme, isDark, hapticsEnabled, language } = useTheme();
  const insets = useSafeAreaInsets();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotificationPref = useSettingsStore((s) => s.setNotificationPref);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNotificationPref(key, value);
  };

  const items: { key: keyof NotificationPreferences; icon: string; title: string; subtitle: string }[] = [
    {
      key: "messages",
      icon: "message-circle",
      title: t("Direct Messages", "Личные сообщения"),
      subtitle: t("New messages in chats", "Новые сообщения в чатах"),
    },
    {
      key: "groupMessages",
      icon: "users",
      title: t("Group Messages", "Групповые сообщения"),
      subtitle: t("Messages in group chats", "Сообщения в групповых чатах"),
    },
    {
      key: "likes",
      icon: "heart",
      title: t("Likes", "Лайки"),
      subtitle: t("When someone likes your post", "Когда кто-то лайкает ваш пост"),
    },
    {
      key: "comments",
      icon: "message-square",
      title: t("Comments", "Комментарии"),
      subtitle: t("New comments on your posts", "Новые комментарии к вашим постам"),
    },
    {
      key: "calls",
      icon: "phone",
      title: t("Calls", "Звонки"),
      subtitle: t("Incoming call notifications", "Уведомления о входящих звонках"),
    },
  ];

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
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            {t("PUSH NOTIFICATIONS", "PUSH-УВЕДОМЛЕНИЯ")}
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            {items.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                <View style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                      <Feather name={item.icon as any} size={16} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>{item.title}</ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>{item.subtitle}</ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={notifications[item.key]}
                    onValueChange={(val) => handleToggle(item.key, val)}
                    trackColor={{ false: isDark ? '#39393D' : '#D1D1D6', true: theme.accent }}
                    thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <ThemedText type="caption" style={styles.footerText}>
          {t(
            "Push notifications only work on physical devices with Expo Go or a native build.",
            "Push-уведомления работают только на физических устройствах с Expo Go или нативной сборкой."
          )}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginHorizontal: Spacing.sm,
    textAlign: 'center',
    opacity: 0.5,
  },
});
