import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingItem {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

function SettingRow({ item, isLast }: { item: SettingItem; isLast: boolean }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: pressed
            ? theme.backgroundSecondary
            : "transparent",
        },
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <Feather
        name={item.icon}
        size={20}
        color={item.danger ? theme.error : theme.textSecondary}
        style={styles.rowIcon}
      />
      <View style={styles.settingInfo}>
        <ThemedText
          type="body"
          style={[
            styles.settingTitle,
            item.danger ? { color: theme.error } : null,
          ]}
        >
          {item.title}
        </ThemedText>
        {item.subtitle ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {item.subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleCopyId = async () => {
    if (user?.id) {
      await Clipboard.setStringAsync(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Скопировано", "Ваш ID скопирован в буфер обмена");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Выйти",
      "Вы уверены, что хотите выйти?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const sections: SettingSection[] = [
    {
      title: "АККАУНТ",
      items: [
        {
          icon: "user",
          title: "Аккаунт",
          subtitle: "ID восстановления и настройки аккаунта",
          onPress: handleCopyId,
        },
      ],
    },
    {
      title: "КОНФИДЕНЦИАЛЬНОСТЬ",
      items: [
        {
          icon: "shield",
          title: "Конфиденциальность и безопасность",
          subtitle: "Разрешения и защита данных",
          onPress: () => {},
        },
        {
          icon: "smartphone",
          title: "Активные сеансы",
          subtitle: "Управление устройствами",
          onPress: () => navigation.navigate("Sessions"),
        },
      ],
    },
    {
      title: "АРХИВ",
      items: [
        {
          icon: "archive",
          title: "Архив",
          subtitle: "Просмотр архивных воспоминаний",
          onPress: () => {},
        },
        {
          icon: "eye-off",
          title: "Скрытые пользователи",
          subtitle: "Управление скрытыми пользователями",
          onPress: () => {},
        },
      ],
    },
    {
      title: "ЗВУК И ОТКЛИК",
      items: [
        {
          icon: "volume-x",
          title: "Звуковые эффекты",
          subtitle: "Выключено",
          onPress: () => {},
        },
      ],
    },
    {
      title: "ВНЕШНИЙ ВИД",
      items: [
        {
          icon: "moon",
          title: "Затемнить фон",
          subtitle: "Выключено",
          onPress: () => {},
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: "log-out",
          title: "Выйти из аккаунта",
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
    >
      {sections.map((section, sectionIndex) => (
        <Animated.View
          key={sectionIndex}
          entering={FadeIn.delay(sectionIndex * 30)}
          style={styles.section}
        >
          {section.title ? (
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {section.title}
            </ThemedText>
          ) : null}
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg },
            ]}
          >
            {section.items.map((item, itemIndex) => (
              <SettingRow
                key={itemIndex}
                item={item}
                isLast={itemIndex === section.items.length - 1}
              />
            ))}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "500",
    letterSpacing: 0.5,
    fontSize: 11,
  },
  sectionContent: {
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    marginRight: Spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: "400",
    fontSize: 15,
  },
});
