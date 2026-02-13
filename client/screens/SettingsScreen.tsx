import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Linking, Platform } from "react-native";
import { Image } from "expo-image";
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
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsStore } from "@/lib/settings-store";
import { themeList } from "@/lib/themes";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const SETTINGS_ICONS = {
  account: require("../assets/icons/settings/account.png"),
  privacy: require("../assets/icons/settings/privacy.png"),
  support: require("../assets/icons/settings/support.png"),
  delete: require("../assets/icons/settings/delete.png"),
  storage: require("../assets/icons/settings/storage.png"),
  language: require("../assets/icons/settings/language.png"),
  archive: require("../assets/icons/settings/archive.png"),
  appearance: require("../assets/icons/settings/appearance.png"),
  sessions: require("../assets/icons/settings/sessions.png"),
  hidden: require("../assets/icons/settings/hidden.png"),
  haptics: require("../assets/icons/settings/haptics.png"),
  chat: require("../assets/icons/settings/chat.png"),
  help: require("../assets/icons/settings/help.png"),
  bug: require("../assets/icons/settings/bug.png"),
  discord: require("../assets/icons/settings/discord.png"),
  archiveBox: require("../assets/icons/settings/archive-box.png"),
  miniapps: require("../assets/icons/settings/miniapps.png"),
  developer: require("../assets/icons/settings/developer.png"),
};

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
  icon?: keyof typeof Feather.glyphMap;
  customIcon?: any;
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
      <View style={styles.rowIconContainer}>
        {item.customIcon ? (
          <Image
            source={item.customIcon}
            style={[styles.rowIconImage, { borderRadius: 6 }]}
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        ) : item.icon ? (
          <Feather
            name={item.icon}
            size={20}
            color={item.danger ? theme.error : theme.textSecondary}
          />
        ) : null}
      </View>
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
  const { theme, accentColor, setAccentColor, language, setLanguage, hapticsEnabled, toggleHaptics, chatFullscreen, toggleChatFullscreen, quickReactionEmoji, scrollAssistEnabled, chatFilterTabsEnabled, setQuickReactionEmoji, toggleScrollAssist, toggleChatFilterTabs } = useTheme();
  const currentThemeKey = useSettingsStore(s => s.theme);
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
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeveloperGuide, setShowDeveloperGuide] = useState(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const handleDebugTap = () => {
    const newCount = debugTapCount + 1;
    if (newCount >= 6) {
      setDebugTapCount(0);
      navigation.navigate("DebugConsole");
    } else {
      setDebugTapCount(newCount);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={handleDebugTap}>
          <ThemedText type="h3">{t("Settings", "Настройки")}</ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, language, debugTapCount]);

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
          customIcon: SETTINGS_ICONS.account,
          title: t("Account Management", "Управление аккаунтом"),
          subtitle: t("Recovery ID and security", "ID восстановления и безопасность"),
          onPress: () => setShowAccountModal(true),
        },
        {
          customIcon: SETTINGS_ICONS.sessions,
          title: t("Active Sessions", "Активные сессии"),
          subtitle: t("Manage devices", "Управление устройствами"),
          onPress: () => navigation.navigate("Sessions"),
        },
      ],
    },

    {
      title: t("NOTIFICATIONS & SOUND", "УВЕДОМЛЕНИЯ И ЗВУК"),
      items: [
        {
          customIcon: SETTINGS_ICONS.haptics,
          title: t("Notifications & Sound", "Уведомления и звук"),
          subtitle: t("Push, haptics, sounds", "Push, виброотклик, звуки"),
          onPress: () => navigation.navigate("NotificationSettings" as any),
        },
      ],
    },
    {
      title: t("DATA & STORAGE", "ДАННЫЕ И ПАМЯТЬ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.storage,
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
          customIcon: SETTINGS_ICONS.language,
          title: t("App Language", "Язык приложения"),
          subtitle: language === "ru" ? "Русский" : "English",
          onPress: () => setShowLanguagePicker(true),
        },
      ],
    },
    {
      title: t("MINI APPS", "МИНИ-ПРИЛОЖЕНИЯ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.miniapps,
          title: t("Mini Apps", "Мини-приложения"),
          subtitle: t("Browse and create apps", "Обзор и создание приложений"),
          onPress: () => navigation.navigate("MiniApps"),
        },
        {
          customIcon: SETTINGS_ICONS.developer,
          title: t("Developer Guide", "Гайд для разработчиков"),
          subtitle: t("Recommendations and formats", "Рекомендации и форматы"),
          onPress: () => setShowDeveloperGuide(true),
        },
      ],
    },
    {
      title: t("ARCHIVE", "АРХИВ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.archive,
          title: t("Saved", "Сохранённые"),
          subtitle: t("View saved posts", "Просмотр сохранённых публикаций"),
          onPress: () => navigation.navigate("SavedPosts"),
        },
        {
          customIcon: SETTINGS_ICONS.archiveBox,
          title: t("Archive", "Архив"),
          subtitle: t("View archived memories", "Просмотр архивных воспоминаний"),
          onPress: () => navigation.navigate("Archive"),
        },
        {
          customIcon: SETTINGS_ICONS.hidden,
          title: t("Hidden Users", "Скрытые пользователи"),
          subtitle: t("Manage blocked users", "Управление заблокированными пользователями"),
          onPress: () => navigation.navigate("BlockedUsers"),
        },
      ],
    },
    {
      title: t("CHAT MANAGEMENT", "УПРАВЛЕНИЕ ЧАТАМИ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.chat,
          title: t("Chat Settings", "Настройки чатов"),
          subtitle: quickReactionEmoji,
          onPress: () => setShowReactionPicker(true),
        },
      ],
    },
    {
      title: t("APPEARANCE", "ОФОРМЛЕНИЕ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.appearance,
          title: t("App Theme", "Тема приложения"),
          subtitle: themeList.find(t => t.key === currentThemeKey)?.name || t("Default", "По умолчанию"),
          onPress: () => navigation.navigate("ThemeSelection"),
        },
        {
          customIcon: SETTINGS_ICONS.chat,
          title: t("Chat Display", "Вид чата"),
          subtitle: chatFullscreen ? t("Full screen", "Во весь экран") : t("Modal window", "Модальное окно"),
          onPress: async () => {
            await toggleChatFullscreen();
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
        },
        {
          icon: "zap",
          title: t("Profile Effect", "Эффект профиля"),
          subtitle: (user as any)?.profileEffect ? t("Active", "Активен") : t("None", "Нет"),
          onPress: () => navigation.navigate("ProfileEffectSelection" as any),
        },
      ],
    },
    {
      title: t("SUPPORT", "ПОДДЕРЖКА"),
      items: [
        {
          customIcon: SETTINGS_ICONS.support,
          title: t("Help & Support", "Помощь и поддержка"),
          subtitle: t("FAQ, contact, legal", "FAQ, контакты, правовая информация"),
          onPress: () => navigation.navigate("Support" as any),
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
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top - 10 : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">{t("Account", "Аккаунт")}</ThemedText>
            <Pressable onPress={() => setShowAccountModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
          <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' }]}>
            <Image 
              source={SETTINGS_ICONS.privacy} 
              style={{ width: 60, height: 60, borderRadius: 14, marginBottom: Spacing.md }} 
            />
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>{t("Recovery ID", "ID восстановления")}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                {t("This ID is required to restore access to your account. Never share it with anyone.", "Этот ID необходим для восстановления доступа к аккаунту. Никогда не делитесь им.")}
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

              <Pressable
                onPress={handleCopyId}
                style={({ pressed }) => [
                  {
                    marginTop: Spacing.md,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.xl,
                    borderRadius: BorderRadius.md,
                    backgroundColor: pressed ? theme.backgroundSecondary : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather name="copy" size={16} color={theme.text} />
                <ThemedText style={{ fontWeight: "600" }}>{t("Copy ID", "Копировать ID")}</ThemedText>
              </Pressable>
            </View>

            <View style={{ height: Spacing.xl }} />

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, overflow: "hidden" }]}>
              <SettingRow 
                item={{
                  icon: "log-out",
                  title: t("Logout", "Выйти"),
                  onPress: () => {
                    setShowAccountModal(false);
                    handleLogout();
                  }
                }}
                isLast={false}
              />
              <SettingRow 
                item={{
                  customIcon: SETTINGS_ICONS.delete,
                  title: t("Delete Account", "Удалить аккаунт"),
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
              {t("Okeno uses an anonymous account system.\nYour PIN and ID are the only ways to access it.", "Okeno использует анонимную систему аккаунтов.\nВаш PIN и ID — единственные способы доступа к нему.")}
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
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top - 10 : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">{t("Delete Account", "Удалить аккаунт")}</ThemedText>
            <Pressable onPress={() => setShowDeleteModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={styles.deleteWarning}>
              <Feather name="alert-triangle" size={48} color={theme.error} />
              <ThemedText type="h4" style={{ color: theme.error, marginTop: Spacing.md, textAlign: "center" }}>
                {t("Warning!", "Внимание!")}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                {t("Once your account is deleted, all your data will be lost forever. This action cannot be undone.", "После удаления аккаунта все ваши данные будут потеряны навсегда. Это действие нельзя отменить.")}
              </ThemedText>
            </View>

            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xl }}>
              {t("Enter your PIN to confirm:", "Введите PIN для подтверждения:")}
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
        visible={showReactionPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowReactionPicker(false)} />
          <Animated.View entering={FadeIn.duration(200)} style={{ backgroundColor: theme.backgroundRoot, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + Spacing.md }}>
            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textSecondary + '40' }} />
            </View>

            <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
              <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
                {t("Chat Settings", "Настройки чатов")}
              </ThemedText>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingRight: Spacing.md }}>
                  {["💕", "🥲", "☺️", "🥹", "😅", "🤣", "😟", "👍", "❤️", "🔥", "😂", "😢"].map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        setQuickReactionEmoji(emoji);
                        if (hapticsEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                      style={({ pressed }) => [
                        {
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: quickReactionEmoji === emoji ? (theme.link || theme.accent) + '25' : theme.backgroundSecondary,
                          borderWidth: quickReactionEmoji === emoji ? 2 : 0,
                          borderColor: quickReactionEmoji === emoji ? (theme.link || theme.accent) : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }}>{emoji}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12, overflow: 'hidden' }}>
                <Pressable
                  onPress={async () => {
                    await toggleScrollAssist();
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="arrow-down-circle" size={16} color={theme.link} />
                  </View>
                  <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.md }}>
                    {t("Scroll Helper", "Помощник скролла")}
                  </ThemedText>
                  <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: scrollAssistEnabled ? (theme.link || '#3478F6') : theme.textSecondary + '30', justifyContent: 'center', padding: 2 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: scrollAssistEnabled ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await toggleChatFilterTabs();
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="columns" size={16} color={theme.link} />
                  </View>
                  <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.md }}>
                    {t("Chat Tabs", "Вкладки чатов")}
                  </ThemedText>
                  <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: chatFilterTabsEnabled ? (theme.link || '#3478F6') : theme.textSecondary + '30', justifyContent: 'center', padding: 2 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: chatFilterTabsEnabled ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showDeveloperGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeveloperGuide(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">{t("Developer Guide", "Гайд для разработчиков")}</ThemedText>
            <Pressable onPress={() => setShowDeveloperGuide(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent} showsVerticalScrollIndicator={false}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              {t(
                "Recommendations for creating mini apps in Okeno. Follow these guidelines for the best user experience.",
                "Рекомендации по созданию мини-приложений в Okeno. Следуйте этим рекомендациям для лучшего пользовательского опыта."
              )}
            </ThemedText>

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="layout" size={16} color={theme.link} />
                </View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{t("Format & Layout", "Формат и макет")}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                {t(
                  "- Use responsive design that adapts to different screen sizes\n- Recommended viewport: 100vw x 100vh\n- Support both light and dark themes\n- Avoid fixed widths — use percentages or flexbox",
                  "- Используйте адаптивный дизайн для разных экранов\n- Рекомендуемый viewport: 100vw x 100vh\n- Поддерживайте светлую и тёмную темы\n- Избегайте фиксированной ширины — используйте проценты или flexbox"
                )}
              </ThemedText>
            </View>

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="smartphone" size={16} color={theme.link} />
                </View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{t("Mobile First", "Мобильный подход")}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                {t(
                  "- Design for mobile screens first (360-428px wide)\n- Use touch-friendly tap targets (min 44x44px)\n- Avoid hover-only interactions\n- Safe area: add 16px padding on sides",
                  "- Проектируйте сначала для мобильных (360-428px)\n- Используйте удобные зоны нажатия (мин. 44x44px)\n- Избегайте hover-эффектов\n- Безопасная зона: отступы 16px по бокам"
                )}
              </ThemedText>
            </View>

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="type" size={16} color={theme.link} />
                </View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{t("Typography & Spacing", "Типографика и отступы")}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                {t(
                  "- Base font size: 16px for body text\n- Headers: 20-24px, bold\n- Captions: 12-13px\n- Line height: 1.4-1.6x of font size\n- Spacing between elements: 8px, 12px, 16px, 24px\n- Use system fonts: -apple-system, system-ui",
                  "- Базовый шрифт: 16px для основного текста\n- Заголовки: 20-24px, жирный\n- Подписи: 12-13px\n- Межстрочный интервал: 1.4-1.6x от размера шрифта\n- Отступы между элементами: 8px, 12px, 16px, 24px\n- Системные шрифты: -apple-system, system-ui"
                )}
              </ThemedText>
            </View>

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="link" size={16} color={theme.link} />
                </View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{t("URL Requirements", "Требования к URL")}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                {t(
                  "- Must be HTTPS (HTTP is not allowed)\n- Page must load within 5 seconds\n- No redirects to external auth pages\n- Avoid pop-ups and aggressive ads",
                  "- Обязательно HTTPS (HTTP не допускается)\n- Страница должна загрузиться за 5 секунд\n- Без редиректов на внешние страницы авторизации\n- Без всплывающих окон и агрессивной рекламы"
                )}
              </ThemedText>
            </View>

            <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: theme.link + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check-circle" size={16} color={theme.link} />
                </View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{t("Best Practices", "Лучшие практики")}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                {t(
                  "- Add a clear name and description\n- Choose a relevant emoji icon\n- Test on multiple screen sizes\n- Keep the app lightweight and fast\n- Use semantic HTML for accessibility\n- Handle errors gracefully with user-friendly messages",
                  "- Добавьте понятное название и описание\n- Выберите подходящий эмодзи\n- Тестируйте на разных экранах\n- Делайте приложение лёгким и быстрым\n- Используйте семантический HTML\n- Обрабатывайте ошибки с понятными сообщениями"
                )}
              </ThemedText>
            </View>
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
  rowIconContainer: {
    width: 28,
    height: 28,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconImage: {
    width: 28,
    height: 28,
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
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emojiItem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  emojiText: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
  },
});

