import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Linking, Platform } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

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
  const { theme, hapticsEnabled } = useTheme();

  return (
    <Pressable
      onPress={() => {
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
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
  const { theme, accentColor, setAccentColor, language, setLanguage, hapticsEnabled, toggleHaptics, chatFullscreen, toggleChatFullscreen } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isIdVisible, setIsIdVisible] = useState(false);
  const [deletePin, setDeletePin] = useState("");

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("Settings", "Настройки"),
    });
  }, [navigation, language]);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${user?.id}`, { pin: deletePin });
    },
    onSuccess: async () => {
      await logout();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Incorrect PIN or failed to delete account");
    },
  });

  const handleDeleteAccount = () => {
    if (deletePin.length !== 4) {
      Alert.alert("Error", "Please enter your 4-digit PIN");
      return;
    }
    Alert.alert(
      "Delete account forever?",
      "All your data, posts, and messages will be deleted and cannot be recovered.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
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
      Alert.alert("Copied", "Your ID has been copied to the clipboard");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
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
      title: t("ACCOUNT", "АККАУНТ"),
      items: [
        {
          icon: "user",
          title: t("Account Management", "Управление аккаунтом"),
          subtitle: t("Recovery ID and security", "ID восстановления и безопасность"),
          onPress: () => setShowAccountModal(true),
        },
        {
          icon: "smartphone",
          title: t("Active Sessions", "Активные сессии"),
          subtitle: t("Manage devices", "Управление устройствами"),
          onPress: () => navigation.navigate("Sessions"),
        },
      ],
    },
    {
      title: t("DATA & STORAGE", "ДАННЫЕ И ПАМЯТЬ"),
      items: [
        {
          icon: "database",
          title: t("Storage Usage", "Использование хранилища"),
          subtitle: t("Clear cache and manage data", "Очистка кэша и управление данными"),
          onPress: () => navigation.navigate("CacheSettings"),
        },
      ],
    },
    {
      title: t("LANGUAGE", "ЯЗЫК"),
      items: [
        {
          icon: "globe",
          title: t("App Language", "Язык приложения"),
          subtitle: language === "ru" ? "Русский" : "English",
          onPress: () => setShowLanguagePicker(true),
        },
      ],
    },
    {
      title: t("ARCHIVE", "АРХИВ"),
      items: [
        {
          icon: "bookmark",
          title: t("Saved", "Сохранённые"),
          subtitle: t("View saved posts", "Просмотр сохранённых публикаций"),
          onPress: () => navigation.navigate("SavedPosts"),
        },
        {
          icon: "archive",
          title: t("Archive", "Архив"),
          subtitle: t("View archived memories", "Просмотр архивных воспоминаний"),
          onPress: () => navigation.navigate("Archive"),
        },
        {
          icon: "eye-off",
          title: t("Hidden Users", "Скрытые пользователи"),
          subtitle: t("Manage blocked users", "Управление заблокированными пользователями"),
          onPress: () => navigation.navigate("BlockedUsers"),
        },
      ],
    },
    {
      title: t("SOUND & FEEDBACK", "ЗВУК И ОТКЛИК"),
      items: [
        {
          icon: hapticsEnabled ? "volume-2" : "volume-x",
          title: t("Haptic Feedback", "Виброотклик"),
          subtitle: hapticsEnabled ? t("On", "Вкл") : t("Off", "Выкл"),
          onPress: async () => {
            await toggleHaptics();
            if (!hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
        },
      ],
    },
    {
      title: t("APPEARANCE", "ОФОРМЛЕНИЕ"),
      items: [
        {
          icon: "aperture",
          title: t("App Color", "Цвет приложения"),
          subtitle: ACCENT_COLORS.find(c => c.color === (accentColor || "#5C7A5C"))?.name || t("Default", "По умолчанию"),
          onPress: () => setShowColorPicker(true),
        },
        {
          icon: chatFullscreen ? "maximize-2" : "minimize-2",
          title: t("Chat Display", "Вид чата"),
          subtitle: chatFullscreen ? t("Full screen", "Во весь экран") : t("Modal window", "Модальное окно"),
          onPress: async () => {
            await toggleChatFullscreen();
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
        },
      ],
    },
    {
      title: t("HELP & FEEDBACK", "ПОМОЩЬ И ОТЗЫВЫ"),
      items: [
        {
          icon: "help-circle",
          title: t("Help Center", "Центр помощи"),
          subtitle: t("FAQs and instructions", "Часто задаваемые вопросы"),
          onPress: () => {
            Linking.openURL("https://skaisay.github.io/App-Privacy/");
          },
        },
        {
          icon: "alert-octagon",
          title: t("Report a Bug", "Сообщить об ошибке"),
          subtitle: t("Help us improve", "Помогите нам стать лучше"),
          onPress: () => {
            Linking.openURL("mailto:messaconfirmation@gmail.com?subject=Bug Report - Okeno");
          },
        },
      ],
    },
    {
      title: t("SUPPORT", "ПОДДЕРЖКА"),
      items: [
        {
          icon: "mail",
          title: t("Contact Us", "Связаться с нами"),
          subtitle: "messaconfirmation@gmail.com",
          onPress: () => {
            Linking.openURL("mailto:messaconfirmation@gmail.com");
          },
        },
        {
          icon: "message-circle",
          title: t("Our Discord", "Наш Discord"),
          subtitle: "https://discord.gg/FRAZ6PBcH9",
          onPress: () => {
            Linking.openURL("https://discord.gg/FRAZ6PBcH9");
          },
        },
        {
          icon: "file-text",
          title: t("Terms of Use", "Условия использования"),
          subtitle: t("User Agreement", "Пользовательское соглашение"),
          onPress: () => navigation.navigate("PrivacyPolicy"),
        },
      ],
    },
    {
      title: "",
      items: [],
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
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Account</ThemedText>
            <Pressable onPress={() => setShowAccountModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>Recovery ID</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                This ID is required to restore access to your account. Never share it with anyone.
              </ThemedText>
              
              <View style={[styles.idContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <ThemedText style={[styles.idText, !isIdVisible && { opacity: 0.3 }]}>
                  {isIdVisible ? (user?.id ?? "") : "••••••••-••••-••••-••••-••••••••••••"}
                </ThemedText>
                <Pressable 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsIdVisible(!isIdVisible);
                  }}
                  style={styles.idActionButton}
                >
                  <Feather name={isIdVisible ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                </Pressable>
              </View>

              <Button 
                onPress={handleCopyId}
                style={{ marginTop: Spacing.md }}
                textStyle={{ color: "#fff" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Copy ID</ThemedText>
                  <Feather name="copy" size={16} color="#fff" />
                </View>
              </Button>
            </View>

            <View style={{ height: Spacing.xl }} />

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, overflow: "hidden" }]}>
              <SettingRow 
                item={{
                  icon: "log-out",
                  title: "Logout",
                  onPress: () => {
                    setShowAccountModal(false);
                    handleLogout();
                  }
                }}
                isLast={false}
              />
              <SettingRow 
                item={{
                  icon: "trash-2",
                  title: "Delete Account",
                  onPress: () => {
                    setShowAccountModal(false);
                    setShowDeleteModal(true);
                  },
                  danger: true
                }}
                isLast={true}
              />
            </View>

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xl, textAlign: "center" }}>
              Okeno uses an anonymous account system.{"\n"}Your PIN and ID are the only ways to access it.
            </ThemedText>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Delete Account</ThemedText>
            <Pressable onPress={() => setShowDeleteModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={styles.deleteWarning}>
              <Feather name="alert-triangle" size={48} color={theme.error} />
              <ThemedText type="h4" style={{ color: theme.error, marginTop: Spacing.md, textAlign: "center" }}>
                Warning!
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                Once your account is deleted, all your data will be lost forever. This action cannot be undone.
              </ThemedText>
            </View>

            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xl }}>
              Enter your PIN to confirm:
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
                Delete Account Forever
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">{t("Language", "Язык")}</ThemedText>
            <Pressable onPress={() => setShowLanguagePicker(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, overflow: "hidden" }]}>
              <SettingRow 
                item={{
                  icon: "globe",
                  title: "English",
                  onPress: () => {
                    setLanguage("en");
                    setShowLanguagePicker(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                isLast={false}
              />
              <SettingRow 
                item={{
                  icon: "globe",
                  title: "Русский",
                  onPress: () => {
                    setLanguage("ru");
                    setShowLanguagePicker(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                isLast={true}
              />
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              {t("Changing language will update the interface instantly.", "Смена языка обновит интерфейс мгновенно.")}
            </ThemedText>
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
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">App Color</ThemedText>
            <Pressable onPress={() => setShowColorPicker(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView 
            contentContainerStyle={styles.colorPickerContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="body" style={[styles.colorPickerSubtitle, { color: theme.textSecondary }]}>
              Choose the primary color for the interface
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
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  idText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  idActionButton: {
    padding: Spacing.xs,
  },
});

