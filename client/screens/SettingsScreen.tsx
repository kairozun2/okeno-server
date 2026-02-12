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
  const { theme, accentColor, setAccentColor, language, setLanguage, hapticsEnabled, toggleHaptics, chatFullscreen, toggleChatFullscreen, quickReactionEmoji, scrollAssistEnabled, setQuickReactionEmoji, toggleScrollAssist } = useTheme();
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
      title: t("SOUND & FEEDBACK", "ЗВУК И ОТКЛИК"),
      items: [
        {
          customIcon: SETTINGS_ICONS.haptics,
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
      title: t("CHAT MANAGEMENT", "УПРАВЛЕНИЕ ЧАТАМИ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.chat,
          title: t("Quick Reaction", "Быстрая реакция"),
          subtitle: quickReactionEmoji,
          onPress: () => setShowReactionPicker(true),
        },
        {
          customIcon: SETTINGS_ICONS.haptics,
          title: t("Scroll Helper", "Помощник скролла"),
          subtitle: scrollAssistEnabled ? t("On", "Вкл") : t("Off", "Выкл"),
          onPress: async () => {
            await toggleScrollAssist();
            if (hapticsEnabled) {
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
      ],
    },
    {
      title: t("HELP & FEEDBACK", "ПОМОЩЬ И ОТЗЫВЫ"),
      items: [
        {
          customIcon: SETTINGS_ICONS.help,
          title: t("Help Center", "Центр помощи"),
          subtitle: t("FAQs and instructions", "Часто задаваемые вопросы"),
          onPress: () => {
            Linking.openURL("https://skaisay.github.io/Okeno-help-center/");
          },
        },
        {
          customIcon: SETTINGS_ICONS.bug,
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
          customIcon: SETTINGS_ICONS.support,
          title: t("Contact Us", "Связаться с нами"),
          subtitle: "messaconfirmation@gmail.com",
          onPress: () => {
            Linking.openURL("mailto:messaconfirmation@gmail.com");
          },
        },
        {
          customIcon: SETTINGS_ICONS.discord,
          title: t("Our Discord", "Наш Discord"),
          subtitle: "https://discord.gg/FRAZ6PBcH9",
          onPress: () => {
            Linking.openURL("https://discord.gg/FRAZ6PBcH9");
          },
        },
        {
          customIcon: SETTINGS_ICONS.privacy,
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
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">{t("Quick Reaction", "Быстрая реакция")}</ThemedText>
            <Pressable onPress={() => setShowReactionPicker(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={styles.emojiGrid}>
              {["💕", "🥲", "☺️", "🥹", "😅", "🤣", "😟", "👍", "❤️", "🔥", "😂", "😢"].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    setQuickReactionEmoji(emoji);
                    setShowReactionPicker(false);
                    if (hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.emojiItem,
                    {
                      backgroundColor: quickReactionEmoji === emoji ? theme.accent : theme.cardBackground,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                </Pressable>
              ))}
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
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  emojiItem: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 28,
  },
});

