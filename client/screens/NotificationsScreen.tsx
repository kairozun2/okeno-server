import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Notification {
  id: string;
  userId: string;
  type: string;
  fromUserId: string | null;
  postId: string | null;
  chatId: string | null;
  isRead: boolean;
  createdAt: string;
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const getNotificationIcon = (): keyof typeof Feather.glyphMap => {
    switch (notification.type) {
      case "like":
        return "heart";
      case "comment":
        return "message-square";
      case "message":
        return "message-circle";
      default:
        return "bell";
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "message":
        return "sent you a message";
      default:
        return "notification";
    }
  };

  return (
    <Animated.View entering={FadeIn}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.notificationItem,
          {
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : notification.isRead
              ? theme.backgroundRoot
              : theme.backgroundDefault,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather
            name={getNotificationIcon()}
            size={20}
            color={
              notification.type === "like"
                ? theme.error
                : notification.type === "comment"
                ? theme.link
                : theme.text
            }
          />
        </View>
        <View style={styles.notificationContent}>
          <ThemedText type="body">
            <ThemedText type="body" style={{ fontWeight: "600" }} truncate maxLength={12}>
              Someone
            </ThemedText>{" "}
            {getNotificationText()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </ThemedText>
        </View>
        {!notification.isRead ? (
          <View style={[styles.unreadDot, { backgroundColor: theme.link }]} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function EmptyNotifications() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="bell-off" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Notifications
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        You're all caught up!
      </ThemedText>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

export default function NotificationsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/users", user?.id, "notifications"],
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${user?.id}/notifications/read-all`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "notifications"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    if (notification.type === "message" && notification.chatId) {
      navigation.navigate("Chat", { chatId: notification.chatId });
    } else if (notification.postId) {
      navigation.navigate("PostDetail", { postId: notification.postId });
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [navigation]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Notifications</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      {unreadCount > 0 ? (
        <Pressable
          onPress={() => markAllReadMutation.mutate()}
          style={[styles.markAllButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <ThemedText type="link">Mark all as read</ThemedText>
        </Pressable>
      ) : null}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ListEmptyComponent={<EmptyNotifications />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  markAllButton: {
    position: "absolute",
    top: 100,
    right: Spacing.lg,
    zIndex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["6xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
});
