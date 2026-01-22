import React from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface BlockedUser {
  id: string;
  username: string;
  emoji: string;
  isVerified?: boolean;
}

type Props = NativeStackScreenProps<RootStackParamList, "BlockedUsers">;

export default function BlockedUsersScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("Blocked Users", "Заблокированные"),
    });
  }, [navigation, language]);

  const { data: blockedUsers = [], isLoading } = useQuery<BlockedUser[]>({
    queryKey: ["/api/users", user?.id, "blocked"],
    enabled: !!user?.id,
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      await apiRequest("DELETE", `/api/users/${user?.id}/blocked/${blockedUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "blocked"] });
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleUnblock = (blockedUser: BlockedUser) => {
    Alert.alert(
      t("Unblock User", "Разблокировать"),
      t(`Unblock @${blockedUser.username}?`, `Разблокировать @${blockedUser.username}?`),
      [
        { text: t("Cancel", "Отмена"), style: "cancel" },
        {
          text: t("Unblock", "Разблокировать"),
          onPress: () => unblockMutation.mutate(blockedUser.id),
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: BlockedUser; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <Pressable
        onPress={() => handleUnblock(item)}
        style={[styles.userRow, { backgroundColor: theme.backgroundDefault }]}
      >
        <Avatar emoji={item.emoji} size={44} />
        <View style={styles.userInfo}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ThemedText type="body" style={{ fontWeight: "600" }} truncate maxLength={15}>
              {item.username}
            </ThemedText>
            {item.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t("Tap to unblock", "Нажмите, чтобы разблокировать")}
          </ThemedText>
        </View>
        <Feather name="x-circle" size={20} color={theme.error} />
      </Pressable>
    </Animated.View>
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <Feather name="users" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t("No blocked users", "Нет заблокированных пользователей")}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
        {t(
          "Users you block will appear here. You can unblock them anytime.",
          "Заблокированные пользователи появятся здесь. Вы можете разблокировать их в любое время."
        )}
      </ThemedText>
    </Animated.View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={blockedUsers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingHorizontal: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
          flexGrow: 1,
        }}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
});
