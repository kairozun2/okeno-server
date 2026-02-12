import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const ICONS = {
  help: require("../assets/icons/settings/help.png"),
  bug: require("../assets/icons/settings/bug.png"),
  support: require("../assets/icons/settings/support.png"),
  discord: require("../assets/icons/settings/discord.png"),
  privacy: require("../assets/icons/settings/privacy.png"),
};

export default function SupportScreen({ navigation }: any) {
  const { theme, isDark, hapticsEnabled, language } = useTheme();
  const insets = useSafeAreaInsets();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const items = [
    {
      icon: ICONS.help,
      title: t("Help Center", "Центр помощи"),
      subtitle: t("FAQs and instructions", "Часто задаваемые вопросы"),
      onPress: () => Linking.openURL("https://skaisay.github.io/Okeno-help-center/"),
    },
    {
      icon: ICONS.bug,
      title: t("Report a Bug", "Сообщить об ошибке"),
      subtitle: t("Help us improve", "Помогите нам стать лучше"),
      onPress: () => Linking.openURL("mailto:messaconfirmation@gmail.com?subject=Bug Report - Okeno"),
    },
    {
      icon: ICONS.support,
      title: t("Contact Us", "Связаться с нами"),
      subtitle: "messaconfirmation@gmail.com",
      onPress: () => Linking.openURL("mailto:messaconfirmation@gmail.com"),
    },
    {
      icon: ICONS.discord,
      title: t("Our Discord", "Наш Discord"),
      subtitle: t("Community & updates", "Сообщество и обновления"),
      onPress: () => Linking.openURL("https://discord.gg/FRAZ6PBcH9"),
    },
    {
      icon: ICONS.privacy,
      title: t("Terms of Use", "Условия использования"),
      subtitle: t("User Agreement", "Пользовательское соглашение"),
      onPress: () => navigation.navigate("PrivacyPolicy"),
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
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            {items.map((item, index) => (
              <View key={index}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                <Pressable
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    item.onPress();
                  }}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Image source={item.icon} style={styles.icon} contentFit="contain" />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>{item.title}</ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 1 }}>{item.subtitle}</ThemedText>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
});
