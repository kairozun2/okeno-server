import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  Keyboard,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const REGULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😊", "🙂", "😎", "🤓", "🧐", "🤔",
  "😏", "😌", "😴", "🥱", "😋", "😛", "😜", "🤪", "😝", "🤑",
  "🤗", "🤭", "🤫", "🤐", "😐", "😑", "😶", "😒", "🙄", "😬",
  "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😠", "😡",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆",
  "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🦋", "🐌",
  "🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "💐", "🌲", "🌳", "🌴",
  "⭐", "🌟", "✨", "💫", "🌙", "☀️", "🌈", "☁️", "⚡", "❄️",
  "🎈", "🎉", "🎊", "🎁", "🎀", "🎯", "🎮", "🎲", "🧩", "🎸",
];

const EXCLUSIVE_EMOJIS = [
  "👑", "💎", "🔮", "🏆", "🥇", "🎖️", "🏅", "🌟", "⭐", "✨",
  "💫", "🔥", "💥", "⚡", "🌈", "🦄", "🐉", "🦅", "🦁", "🐺",
  "🦊", "🐲", "👁️", "🗿", "💀", "👽", "🤖", "👾", "🎭", "🃏",
  "🔱", "⚜️", "🛡️", "⚔️", "🗡️", "💣", "🎪", "🎨", "🎬", "📸",
  "💝", "💖", "💗", "💓", "💕", "💘", "💞", "💟", "❤️‍🔥", "🖤",
  "🤍", "💜", "💙", "💚", "💛", "🧡", "❤️", "💔", "❣️", "💯",
  "🌺", "🌸", "🌼", "🌻", "🌹", "🥀", "💐", "🌷", "🍀", "🍁",
  "🌊", "🏔️", "🌋", "🗻", "🏝️", "🌅", "🌄", "🌠", "🎇", "🎆",
  "🦋", "🐝", "🦚", "🦜", "🦩", "🦢", "🦌", "🐘", "🦏", "🦍",
  "🐬", "🦈", "🐋", "🐙", "🦑", "🦐", "🦞", "🦀", "🐠", "🐡",
];

const ALL_EMOJIS = [
  ...REGULAR_EMOJIS,
  ...EXCLUSIVE_EMOJIS,
  "🧙", "🧙‍♂️", "🧙‍♀️", "🧚", "🧚‍♂️", "🧚‍♀️", "🧛", "🧛‍♂️", "🧛‍♀️", "🧜",
  "🧝", "🧝‍♂️", "🧝‍♀️", "🧞", "🧞‍♂️", "🧞‍♀️", "🧟", "🧟‍♂️", "🧟‍♀️", "🦸",
  "🦸‍♂️", "🦸‍♀️", "🦹", "🦹‍♂️", "🦹‍♀️", "🥷", "🤴", "👸", "👼", "🎅",
  "🤶", "🦌", "🎄", "🎃", "👻", "💀", "☠️", "👺", "👹", "👿",
  "😈", "🤡", "💩", "👀", "👁️", "🗣️", "👤", "👥", "🫂", "👣",
  "🧠", "🫀", "🫁", "🦴", "🦷", "👅", "👄", "💋", "🩸", "💊",
  "🔬", "🔭", "📡", "🛸", "🚀", "🛰️", "🌍", "🌎", "🌏", "🪐",
  "🌙", "🌛", "🌜", "🌝", "🌞", "⭐", "🌟", "💫", "✨", "☄️",
];

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentEmoji: string;
  currentUsername: string;
  isAdmin: boolean;
  lastUsernameChange: string | null;
  onSave: (emoji: string, username: string) => Promise<void>;
}

export function ProfileEditModal({
  visible,
  onClose,
  currentEmoji,
  currentUsername,
  isAdmin,
  lastUsernameChange,
  onSave,
}: ProfileEditModalProps) {
  const { theme, isDark, language } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  useEffect(() => {
    if (visible) {
      setSelectedEmoji(currentEmoji);
      setUsername(currentUsername);
      setError(null);
      setIsKeyboardVisible(false);
    }
  }, [visible, currentEmoji, currentUsername]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const availableEmojis = isAdmin ? ALL_EMOJIS : REGULAR_EMOJIS;

  const canChangeUsername = () => {
    if (isAdmin) return true;
    if (!lastUsernameChange) return true;
    
    const lastChange = new Date(lastUsernameChange);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= 20;
  };

  const getDaysUntilChange = () => {
    if (!lastUsernameChange) return 0;
    const lastChange = new Date(lastUsernameChange);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 20 - daysSinceChange);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError(t("Username cannot be empty", "Имя не может быть пустым"));
      return;
    }

    if (username.length < 2) {
      setError(t("Username must be at least 2 characters", "Имя должно быть не менее 2 символов"));
      return;
    }

    if (username.length > 20) {
      setError(t("Username must be 20 characters or less", "Имя должно быть не более 20 символов"));
      return;
    }

    if (username !== currentUsername && !canChangeUsername()) {
      setError(t(
        `You can change your username in ${getDaysUntilChange()} days`,
        `Вы можете изменить имя через ${getDaysUntilChange()} дней`
      ));
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedEmoji, username.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      setError(err.message || t("Failed to save", "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const usernameEditable = canChangeUsername();
  const daysLeft = getDaysUntilChange();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={() => { Keyboard.dismiss(); onClose(); }}>
          <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </Pressable>

        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardContainer}
          keyboardVerticalOffset={0}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[
              styles.modal,
              {
                backgroundColor: theme.backgroundSecondary,
                paddingBottom: isKeyboardVisible ? Spacing.sm : insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.header}>
              <ThemedText type="h3">{t("Edit Profile", "Редактировать профиль")}</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.previewSection}>
              <View style={[styles.emojiPreview, { backgroundColor: theme.background }]}>
                <ThemedText style={styles.previewEmoji}>{selectedEmoji}</ThemedText>
              </View>
            </View>

            {error && !isKeyboardVisible ? (
              <View style={[styles.errorContainer, { backgroundColor: theme.error + "20" }]}>
                <ThemedText style={{ color: theme.error }}>{error}</ThemedText>
              </View>
            ) : null}

            {!isKeyboardVisible ? (
              <>
                <ThemedText type="body" style={styles.sectionTitle}>
                  {isAdmin ? t("All Emojis", "Все эмодзи") : t("Choose Avatar", "Выберите аватар")}
                </ThemedText>

                <ScrollView
                  style={styles.emojiScroll}
                  contentContainerStyle={styles.emojiGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {availableEmojis.map((emoji, index) => (
                    <Pressable
                      key={`${emoji}-${index}`}
                      onPress={() => handleEmojiSelect(emoji)}
                      style={[
                        styles.emojiButton,
                        {
                          backgroundColor: selectedEmoji === emoji ? theme.primary + "30" : theme.background,
                          borderColor: selectedEmoji === emoji ? theme.primary : "transparent",
                        },
                      ]}
                    >
                      <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={[
              styles.inputBar,
              {
                backgroundColor: isKeyboardVisible
                  ? (isDark ? "rgba(30,30,30,0.95)" : "rgba(245,245,245,0.95)")
                  : "transparent",
                borderTopWidth: isKeyboardVisible ? 1 : 0,
                borderTopColor: theme.border,
                paddingTop: isKeyboardVisible ? Spacing.sm : 0,
              },
            ]}>
              {error && isKeyboardVisible ? (
                <View style={[styles.errorContainerInline, { backgroundColor: theme.error + "20" }]}>
                  <ThemedText type="caption" style={{ color: theme.error }}>{error}</ThemedText>
                </View>
              ) : null}
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  value={username}
                  onChangeText={(text) => { setUsername(text); setError(null); }}
                  style={[
                    styles.usernameInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: error ? theme.error : theme.border,
                      opacity: usernameEditable ? 1 : 0.5,
                    },
                  ]}
                  placeholder={t("Username", "Имя пользователя")}
                  placeholderTextColor={theme.textSecondary}
                  editable={usernameEditable}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {saving ? "..." : t("Save", "OK")}
                  </ThemedText>
                </Pressable>
              </View>
              {!usernameEditable && daysLeft > 0 ? (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {t(`Change available in ${daysLeft} days`, `Изменение доступно через ${daysLeft} дн.`)}
                </ThemedText>
              ) : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  previewSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emojiPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewEmoji: {
    fontSize: 48,
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: Platform.OS === "ios" ? 60 : undefined,
  },
  errorContainer: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  errorContainerInline: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  emojiScroll: {
    maxHeight: 300,
    marginBottom: Spacing.md,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    justifyContent: "flex-start",
  },
  emojiButton: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xs * 7) / 8 - 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    overflow: "hidden",
  },
  emojiText: {
    fontSize: 22,
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: Platform.OS === "ios" ? 30 : undefined,
  },
  inputBar: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
