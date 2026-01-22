import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacyPolicy">;

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleOpenFull = () => {
    WebBrowser.openBrowserAsync("https://skaisay.github.io/App-Privacy/");
  };

  const sections = [
    {
      title: "Политика конфиденциальности",
      content: "Последнее обновление: Январь 2026\nЭто приложение разработано с приоритетом на конфиденциальность пользователей. Оно не требует предоставления личной информации, такой как настоящее имя, адрес электронной почты, номер телефона или документы, удостоверяющие личность."
    },
    {
      title: "Учетные записи пользователей",
      content: "Приложение использует упрощенную систему аккаунтов. Не требуется электронная почта, номер телефона, настоящее имя или фото профиля. В профилях пользователей могут использоваться только аватары на основе эмодзи. Каждый пользователь идентифицируется уникальным внутренним идентификатором, генерируемым системой."
    },
    {
      title: "Разрешения",
      content: "Приложение может запрашивать доступ к следующим функциям устройства исключительно для обеспечения основной функциональности:\n\n• Камера – чтобы пользователи могли делать фото и видео для публикации.\n• Фотогалерея – чтобы пользователи могли выбирать и загружать существующие фото или видео.\n• Местоположение (геолокация) – чтобы при желании прикреплять информацию о местоположении к контенту.\n\nДоступ к этим функциям запрашивается только при необходимости и не используется для отслеживания или рекламы."
    },
    {
      title: "Хранимый контент",
      content: "Приложение хранит пользовательский контент, такой как сообщения, фотографии, видео, комментарии, лайки и связанные метаданные. Эти данные хранятся на серверах исключительно для обеспечения работы функций приложения."
    },
    {
      title: "Цель использования данных",
      content: "Хранимые данные используются строго для обеспечения работы приложения, включая публикацию контента, обмен сообщениями и взаимодействие пользователей. Данные не анализируются для маркетинга, рекламы, профилирования или поведенческого отслеживания."
    },
    {
      title: "Нет рекламы и отслеживания",
      content: "В приложении нет рекламы, и оно не использует стороннюю аналитику, технологии отслеживания или рекламные SDK. Пользовательские данные не передаются третьим лицам."
    }
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Конфиденциальность</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <Animated.View 
            key={index} 
            entering={FadeInDown.delay(index * 100)}
            style={styles.section}
          >
            <ThemedText type="h4" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedText type="body" style={[styles.sectionContent, { color: theme.textSecondary }]}>
              {section.content}
            </ThemedText>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(700)} style={styles.footer}>
          <Pressable 
            onPress={handleOpenFull}
            style={[styles.linkButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText type="body" style={{ color: theme.link, fontWeight: "600" }}>
              Читать полную версию на сайте
            </ThemedText>
            <Feather name="external-link" size={16} color={theme.link} style={{ marginLeft: Spacing.xs }} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
});
