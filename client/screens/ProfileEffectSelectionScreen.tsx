import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ProfileEffect, PROFILE_EFFECTS, ProfileEffectType } from "@/components/ProfileEffect";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { storeAuth } from "@/lib/auth";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileEffectSelection">;

export default function ProfileEffectSelectionScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user, setUser, sessionId } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentEffect = (user as any)?.profileEffect as ProfileEffectType;
  const [selected, setSelected] = useState<ProfileEffectType>(currentEffect || null);

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
    },
  });

  const handleSelect = (effect: ProfileEffectType) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected(effect);
    mutation.mutate(effect);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl, paddingTop: Spacing.lg }}
      >
        <View style={[styles.preview, { backgroundColor: theme.backgroundSecondary }]}>
          <ProfileEffect effect={selected} height={160} />
          <View style={styles.previewContent}>
            <ThemedText style={styles.previewEmoji}>{user?.emoji || "🐸"}</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {t("Preview", "Предпросмотр")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.grid}>
          {PROFILE_EFFECTS.map((effect, index) => {
            const isActive = selected === effect.id;
            return (
              <Animated.View key={effect.id || "none"} entering={FadeIn.delay(index * 50)}>
                <Pressable
                  onPress={() => handleSelect(effect.id)}
                  style={[
                    styles.effectCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: isActive ? theme.accent : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View style={styles.effectPreview}>
                    {effect.id ? (
                      <ProfileEffect effect={effect.id} height={80} />
                    ) : (
                      <View style={[styles.noEffect, { backgroundColor: theme.backgroundRoot }]}>
                        <Feather name="x" size={20} color={theme.textSecondary} />
                      </View>
                    )}
                  </View>
                  <ThemedText type="caption" style={[styles.effectLabel, isActive ? { color: theme.accent } : { color: theme.text }]}>
                    {language === "ru" ? effect.labelRu : effect.label}
                  </ThemedText>
                  {isActive ? (
                    <View style={[styles.checkmark, { backgroundColor: theme.accent }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    height: 160,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    alignItems: "center",
    gap: 4,
  },
  previewEmoji: {
    fontSize: 48,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  effectCard: {
    width: 100,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  effectPreview: {
    width: "100%",
    height: 80,
    overflow: "hidden",
  },
  noEffect: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  effectLabel: {
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
