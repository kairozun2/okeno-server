import React, { useState, useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ProfileEffect, PROFILE_EFFECTS, ProfileEffectType } from "@/components/ProfileEffect";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { storeAuth } from "@/lib/auth";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

type Props = NativeStackScreenProps<RootStackParamList, "ProfileEffectSelection">;

export default function ProfileEffectSelectionScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user, setUser, sessionId } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentEffect = (user as any)?.profileEffect as ProfileEffectType;
  const [selected, setSelected] = useState<ProfileEffectType>(currentEffect || null);
  const hasChanges = selected !== (currentEffect || null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const mutation = useMutation({
    mutationFn: async (effect: ProfileEffectType) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/profile-effect`, { effect });
      return res.json();
    },
    onSuccess: async (_, effect) => {
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const updatedUser = { ...user, profileEffect: effect };
      setUser(updatedUser as any);
      if (sessionId) {
        await storeAuth(updatedUser as any, sessionId);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      navigation.goBack();
    },
  });

  const handleSave = () => {
    mutation.mutate(selected);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || mutation.isPending}
          style={{ paddingHorizontal: Spacing.md, opacity: hasChanges ? 1 : 0.4 }}
        >
          <ThemedText style={{ color: theme.accent, fontSize: 16, fontWeight: "600" }}>
            {t("Save", "Сохранить")}
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, hasChanges, selected, mutation.isPending, theme.accent]);

  const handleSelect = (effect: ProfileEffectType) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected(effect);
  };

  const effectsOnly = PROFILE_EFFECTS.filter(e => e.id !== null);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(300)} style={[styles.preview, { backgroundColor: theme.backgroundSecondary }]}>
        <ProfileEffect effect={selected} height={200} />
        <View style={styles.previewContent}>
          <Avatar emoji={user?.emoji || "🐸"} size={72} />
          <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>
            {user?.username}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {t("Preview", "Предпросмотр")}
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.cardsGrid}>
        {effectsOnly.map((effect, index) => {
          const isActive = selected === effect.id;
          return (
            <Animated.View key={effect.id} entering={FadeIn.delay(index * 60).duration(250)} style={{ width: CARD_WIDTH }}>
              <Pressable
                onPress={() => handleSelect(effect.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: isActive ? theme.accent : "transparent",
                    borderWidth: 2,
                  },
                ]}
              >
                <View style={[styles.cardPreview, { backgroundColor: theme.backgroundRoot }]}>
                  <ProfileEffect effect={effect.id} height={80} />
                </View>
                <View style={styles.cardLabel}>
                  <View style={styles.cardLabelText}>
                    <ThemedText type="caption" style={{ fontSize: 14, opacity: 0.5, marginRight: 4 }}>
                      {effect.emoji}
                    </ThemedText>
                    <ThemedText type="body" style={[isActive ? { color: theme.accent, fontWeight: "600" } : null]}>
                      {language === "ru" ? effect.labelRu : effect.label}
                    </ThemedText>
                  </View>
                  {isActive ? (
                    <View style={[styles.checkmark, { backgroundColor: theme.accent }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {selected !== null ? (
        <Pressable
          onPress={() => handleSelect(null)}
          style={[styles.resetButton, { borderColor: theme.textSecondary }]}
        >
          <Feather name="x" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
            {t("Remove effect", "Убрать эффект")}
          </ThemedText>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  preview: {
    borderRadius: BorderRadius.xl,
    height: 200,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    alignItems: "center",
    zIndex: 1,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardPreview: {
    height: 80,
    overflow: "hidden",
  },
  cardLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  cardLabelText: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
