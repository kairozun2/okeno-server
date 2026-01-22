import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

import { useQueryClient } from "@tanstack/react-query";

const ACCENT_COLORS = [
  { name: "Royal Blue", color: "#162660" },
  { name: "Powder Blue", color: "#6EB0F5" }, // Brighter for background
  { name: "Warm Beige", color: "#F1E4D1" },
  { name: "Buttermilk", color: "#FFF1B5" },
  { name: "Pastel Blue", color: "#C1DBE8" },
  { name: "Old Burgundy", color: "#8E443D" }, // Brighter for background
  { name: "Dark Moss", color: "#7A7B4D" }, // Brighter for background
  { name: "Persian Orange", color: "#CF8852" },
  { name: "Sage Green", color: "#5C7A5C" }, // Default
];

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

interface SettingRowProps {
  item: SettingItem;
  isLast: boolean;
}

function SettingRow({ item, isLast }: SettingRowProps) {
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
  const { theme, accentColor, setAccentColor } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${user?.id}`, { pin: deletePin });
    },
    onSuccess: async () => {
      await logout();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Ошибка", "Неверный PIN-код или не удалось удалить аккаунт");
    },
  });

  const handleDeleteAccount = () => {
    if (deletePin.length !== 4) {
      Alert.alert("Ошибка", "Введите 4-значный PIN-код");
      return;
    }
    Alert.alert(
      "Удалить аккаунт навсегда?",
      "Все ваши данные, посты, сообщения будут удалены без возможности восстановления.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить навсегда",
          style: "destructive",
          onPress: () => deleteAccountMutation.mutate(),
        },
      ]
    );
  };

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
          icon: "lock",
          title: "Конфиденциальность",
          subtitle: "Политика и использование данных",
          onPress: () => navigation.navigate("PrivacyPolicy"),
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
      title: "ДАННЫЕ И ПАМЯТЬ",
      items: [
        {
          icon: "database",
          title: "Использование памяти",
          subtitle: "Очистка кэша и управление данными",
          onPress: () => navigation.navigate("CacheSettings"),
        },
      ],
    },
    {
      title: "ЯЗЫК / LANGUAGE",
      items: [
        {
          icon: "globe",
          title: "Язык приложения",
          subtitle: "Русский (Russian)",
          onPress: () => {
            Alert.alert("Язык", "В данный момент поддерживается только Русский. Английский будет добавлен в ближайшем обновлении.");
          },
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
          onPress: () => navigation.navigate("Archive"),
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
          icon: "aperture",
          title: "Цвет приложения",
          subtitle: ACCENT_COLORS.find(c => c.color === (accentColor || "#5C7A5C"))?.name || "По умолчанию",
          onPress: () => setShowColorPicker(true),
        },
      ],
    },
    {
      title: "ПОДДЕРЖКА",
      items: [
        {
          icon: "mail",
          title: "Связаться с нами",
          subtitle: "support@moments-app.com",
          onPress: () => {
            Alert.alert("Связаться с нами", "Email: support@moments-app.com\n\nМы отвечаем в течение 24 часов.");
          },
        },
        {
          icon: "file-text",
          title: "Условия использования",
          subtitle: "Пользовательское соглашение",
          onPress: () => navigation.navigate("PrivacyPolicy"),
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
        {
          icon: "trash-2",
          title: "Удалить аккаунт",
          subtitle: "Безвозвратное удаление",
          onPress: () => setShowDeleteModal(true),
          danger: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
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

      <Modal
        visible={showDeleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Удаление аккаунта</ThemedText>
            <Pressable onPress={() => setShowDeleteModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={styles.deleteWarning}>
              <Feather name="alert-triangle" size={48} color={theme.error} />
              <ThemedText type="h4" style={{ color: theme.error, marginTop: Spacing.md, textAlign: "center" }}>
                Внимание!
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                После удаления аккаунта все ваши данные будут потеряны навсегда. Это действие нельзя отменить.
              </ThemedText>
            </View>

            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xl }}>
              Для подтверждения введите ваш PIN-код:
            </ThemedText>
            <TextInput
              value={deletePin}
              onChangeText={setDeletePin}
              placeholder="0000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />

            <Pressable
              onPress={handleDeleteAccount}
              style={[styles.deleteButton, { backgroundColor: theme.error }]}
            >
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                Удалить аккаунт навсегда
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showColorPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Цвет приложения</ThemedText>
            <Pressable onPress={() => setShowColorPicker(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView 
            contentContainerStyle={styles.colorPickerContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="body" style={[styles.colorPickerSubtitle, { color: theme.textSecondary }]}>
              Выберите основной цвет для всего интерфейса
            </ThemedText>

            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map((item) => (
                <Pressable
                  key={item.color}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setAccentColor(item.color === "#5C7A5C" ? null : item.color);
                  }}
                  style={[
                    styles.colorCard,
                    { backgroundColor: theme.cardBackground }
                  ]}
                >
                  <View style={[styles.colorCircle, { backgroundColor: item.color }]}>
                    {(accentColor || "#5C7A5C") === item.color ? (
                      <Feather name="check" size={20} color="#FFF" />
                    ) : null}
                  </View>
                  <ThemedText type="small" style={styles.colorName}>{item.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  colorPickerContent: {
    padding: Spacing.lg,
  },
  colorPickerSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  colorCard: {
    width: "47%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  colorName: {
    fontWeight: "500",
  },
  deleteWarning: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  pinInput: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  deleteButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
});

