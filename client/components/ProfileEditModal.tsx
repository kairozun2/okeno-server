import React, { useState, useEffect, useRef, useCallback } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const REGULAR_EMOJIS = [
  "\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F60A}", "\u{1F642}", "\u{1F60E}", "\u{1F913}", "\u{1F9D0}", "\u{1F914}",
  "\u{1F60F}", "\u{1F60C}", "\u{1F634}", "\u{1F971}", "\u{1F60B}", "\u{1F61B}", "\u{1F61C}", "\u{1F92A}", "\u{1F61D}", "\u{1F911}",
  "\u{1F917}", "\u{1F92D}", "\u{1F92B}", "\u{1F910}", "\u{1F610}", "\u{1F611}", "\u{1F636}", "\u{1F612}", "\u{1F644}", "\u{1F62C}",
  "\u{1F62E}", "\u{1F62F}", "\u{1F632}", "\u{1F633}", "\u{1F97A}", "\u{1F622}", "\u{1F62D}", "\u{1F624}", "\u{1F620}", "\u{1F621}",
  "\u{1F436}", "\u{1F431}", "\u{1F42D}", "\u{1F439}", "\u{1F430}", "\u{1F98A}", "\u{1F43B}", "\u{1F43C}", "\u{1F428}", "\u{1F42F}",
  "\u{1F981}", "\u{1F42E}", "\u{1F437}", "\u{1F438}", "\u{1F435}", "\u{1F414}", "\u{1F427}", "\u{1F426}", "\u{1F424}", "\u{1F986}",
  "\u{1F985}", "\u{1F989}", "\u{1F987}", "\u{1F43A}", "\u{1F417}", "\u{1F434}", "\u{1F984}", "\u{1F41D}", "\u{1F98B}", "\u{1F40C}",
  "\u{1F338}", "\u{1F33A}", "\u{1F33B}", "\u{1F33C}", "\u{1F337}", "\u{1F339}", "\u{1F490}", "\u{1F332}", "\u{1F333}", "\u{1F334}",
  "\u2B50", "\u{1F31F}", "\u2728", "\u{1F4AB}", "\u{1F319}", "\u2600\uFE0F", "\u{1F308}", "\u2601\uFE0F", "\u26A1", "\u2744\uFE0F",
  "\u{1F388}", "\u{1F389}", "\u{1F38A}", "\u{1F381}", "\u{1F380}", "\u{1F3AF}", "\u{1F3AE}", "\u{1F3B2}", "\u{1F9E9}", "\u{1F3B8}",
];

const EXCLUSIVE_EMOJIS = [
  "\u{1F451}", "\u{1F48E}", "\u{1F52E}", "\u{1F3C6}", "\u{1F947}", "\u{1F396}\uFE0F", "\u{1F3C5}", "\u{1F31F}", "\u2B50", "\u2728",
  "\u{1F4AB}", "\u{1F525}", "\u{1F4A5}", "\u26A1", "\u{1F308}", "\u{1F984}", "\u{1F409}", "\u{1F985}", "\u{1F981}", "\u{1F43A}",
  "\u{1F98A}", "\u{1F432}", "\u{1F441}\uFE0F", "\u{1F5FF}", "\u{1F480}", "\u{1F47D}", "\u{1F916}", "\u{1F47E}", "\u{1F3AD}", "\u{1F0CF}",
  "\u{1F531}", "\u269C\uFE0F", "\u{1F6E1}\uFE0F", "\u2694\uFE0F", "\u{1F5E1}\uFE0F", "\u{1F4A3}", "\u{1F3AA}", "\u{1F3A8}", "\u{1F3AC}", "\u{1F4F8}",
  "\u{1F49D}", "\u{1F496}", "\u{1F497}", "\u{1F493}", "\u{1F495}", "\u{1F498}", "\u{1F49E}", "\u{1F49F}", "\u2764\uFE0F\u200D\u{1F525}", "\u{1F5A4}",
  "\u{1F90D}", "\u{1F49C}", "\u{1F499}", "\u{1F49A}", "\u{1F49B}", "\u{1F9E1}", "\u2764\uFE0F", "\u{1F494}", "\u2763\uFE0F", "\u{1F4AF}",
  "\u{1F33A}", "\u{1F338}", "\u{1F33C}", "\u{1F33B}", "\u{1F339}", "\u{1F940}", "\u{1F490}", "\u{1F337}", "\u{1F340}", "\u{1F341}",
  "\u{1F30A}", "\u{1F3D4}\uFE0F", "\u{1F30B}", "\u{1F5FB}", "\u{1F3DD}\uFE0F", "\u{1F305}", "\u{1F304}", "\u{1F320}", "\u{1F387}", "\u{1F386}",
  "\u{1F98B}", "\u{1F41D}", "\u{1F99A}", "\u{1F99C}", "\u{1F9A9}", "\u{1F9A2}", "\u{1F98C}", "\u{1F418}", "\u{1F98F}", "\u{1F98D}",
  "\u{1F42C}", "\u{1F988}", "\u{1F40B}", "\u{1F419}", "\u{1F991}", "\u{1F990}", "\u{1F99E}", "\u{1F980}", "\u{1F420}", "\u{1F421}",
];

const ALL_EMOJIS = [
  ...REGULAR_EMOJIS,
  ...EXCLUSIVE_EMOJIS,
  "\u{1F9D9}", "\u{1F9D9}\u200D\u2642\uFE0F", "\u{1F9D9}\u200D\u2640\uFE0F", "\u{1F9DA}", "\u{1F9DA}\u200D\u2642\uFE0F", "\u{1F9DA}\u200D\u2640\uFE0F", "\u{1F9DB}", "\u{1F9DB}\u200D\u2642\uFE0F", "\u{1F9DB}\u200D\u2640\uFE0F", "\u{1F9DC}",
  "\u{1F9DD}", "\u{1F9DD}\u200D\u2642\uFE0F", "\u{1F9DD}\u200D\u2640\uFE0F", "\u{1F9DE}", "\u{1F9DE}\u200D\u2642\uFE0F", "\u{1F9DE}\u200D\u2640\uFE0F", "\u{1F9DF}", "\u{1F9DF}\u200D\u2642\uFE0F", "\u{1F9DF}\u200D\u2640\uFE0F", "\u{1F9B8}",
  "\u{1F9B8}\u200D\u2642\uFE0F", "\u{1F9B8}\u200D\u2640\uFE0F", "\u{1F9B9}", "\u{1F9B9}\u200D\u2642\uFE0F", "\u{1F9B9}\u200D\u2640\uFE0F", "\u{1F977}", "\u{1F934}", "\u{1F478}", "\u{1F47C}", "\u{1F385}",
  "\u{1F936}", "\u{1F98C}", "\u{1F384}", "\u{1F383}", "\u{1F47B}", "\u{1F480}", "\u2620\uFE0F", "\u{1F47A}", "\u{1F479}", "\u{1F47F}",
  "\u{1F608}", "\u{1F921}", "\u{1F4A9}", "\u{1F440}", "\u{1F441}\uFE0F", "\u{1F5E3}\uFE0F", "\u{1F464}", "\u{1F465}", "\u{1FAC2}", "\u{1F463}",
  "\u{1F9E0}", "\u{1FAC0}", "\u{1FAC1}", "\u{1F9B4}", "\u{1F9B7}", "\u{1F445}", "\u{1F444}", "\u{1F48B}", "\u{1FA78}", "\u{1F48A}",
  "\u{1F52C}", "\u{1F52D}", "\u{1F4E1}", "\u{1F6F8}", "\u{1F680}", "\u{1F6F0}\uFE0F", "\u{1F30D}", "\u{1F30E}", "\u{1F30F}", "\u{1FA90}",
  "\u{1F319}", "\u{1F31B}", "\u{1F31C}", "\u{1F31D}", "\u{1F31E}", "\u2B50", "\u{1F31F}", "\u{1F4AB}", "\u2728", "\u2604\uFE0F",
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
  const [modalVisible, setModalVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isClosingRef = useRef(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const backdropOpacity = useSharedValue(0);
  const slideOffset = useSharedValue(SCREEN_HEIGHT);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideOffset.value }],
  }));

  const animateOpen = useCallback(() => {
    setModalVisible(true);
    isClosingRef.current = false;
    requestAnimationFrame(() => {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      slideOffset.value = withSpring(0, {
        damping: 22,
        stiffness: 200,
        mass: 0.8,
      });
    });
  }, []);

  const animateClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Keyboard.dismiss();
    backdropOpacity.value = withTiming(0, { duration: 200 });
    slideOffset.value = withTiming(SCREEN_HEIGHT, {
      duration: 250,
      easing: Easing.in(Easing.ease),
    }, () => {
      runOnJS(setModalVisible)(false);
      runOnJS(onClose)();
    });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setSelectedEmoji(currentEmoji);
      setUsername(currentUsername);
      setError(null);
      setIsKeyboardVisible(false);
      slideOffset.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      animateOpen();
    }
  }, [visible, currentEmoji, currentUsername]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        if (!isClosingRef.current) setIsKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        if (!isClosingRef.current) setIsKeyboardVisible(false);
      }
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
      setError(t("Username cannot be empty", "\u0418\u043C\u044F \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C"));
      return;
    }
    if (username.length < 2) {
      setError(t("Username must be at least 2 characters", "\u0418\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 2 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"));
      return;
    }
    if (username.length > 20) {
      setError(t("Username must be 20 characters or less", "\u0418\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 20 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"));
      return;
    }
    if (username !== currentUsername && !canChangeUsername()) {
      setError(t(
        `You can change your username in ${getDaysUntilChange()} days`,
        `\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u043C\u044F \u0447\u0435\u0440\u0435\u0437 ${getDaysUntilChange()} \u0434\u043D\u0435\u0439`
      ));
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedEmoji, username.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      animateClose();
    } catch (err: any) {
      setError(err.message || t("Failed to save", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"));
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
  const showEmojiGrid = !isKeyboardVisible && !isClosingRef.current;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose}>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          </Pressable>
        </Animated.View>

        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardContainer}
          keyboardVerticalOffset={0}
        >
          <Animated.View
            style={[
              styles.modal,
              modalSlideStyle,
              {
                backgroundColor: theme.backgroundSecondary,
                paddingBottom: isKeyboardVisible ? Spacing.sm : insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.handle}>
              <View style={[styles.handleBar, { backgroundColor: theme.textSecondary + "40" }]} />
            </View>

            <View style={styles.header}>
              <ThemedText type="h3">
                {t("Edit Profile", "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C")}
              </ThemedText>
              <Pressable onPress={animateClose} style={styles.closeButton} hitSlop={12}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.previewSection}>
              <View style={[styles.emojiPreview, { backgroundColor: theme.background }]}>
                <ThemedText style={styles.previewEmoji}>{selectedEmoji}</ThemedText>
              </View>
            </View>

            {showEmojiGrid ? (
              <View>
                {error ? (
                  <View style={[styles.errorContainer, { backgroundColor: theme.error + "20" }]}>
                    <ThemedText style={{ color: theme.error }}>{error}</ThemedText>
                  </View>
                ) : null}

                <ThemedText type="body" style={styles.sectionTitle}>
                  {isAdmin
                    ? t("All Emojis", "\u0412\u0441\u0435 \u044D\u043C\u043E\u0434\u0437\u0438")
                    : t("Choose Avatar", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u0432\u0430\u0442\u0430\u0440")}
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
              </View>
            ) : null}

            <View style={styles.inputBar}>
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
                  placeholder={t("Username", "\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F")}
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
                  {t(`Change available in ${daysLeft} days`, `\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0447\u0435\u0440\u0435\u0437 ${daysLeft} \u0434\u043D.`)}
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
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    maxHeight: "85%",
  },
  handle: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xs,
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
