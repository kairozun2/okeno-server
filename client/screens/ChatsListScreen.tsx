import React, { useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

interface Chat {
  id: string;
  user1Id: string;
  user2Id: string;
  updatedAt: string;
}

interface ChatWithDetails extends Chat {
  otherUser?: {
    id: string;
    username: string;
    emoji: string;
  };
  lastMessage?: string;
  unreadCount?: number;
}

function ChatItem({
  chat,
  onPress,
}: {
  chat: ChatWithDetails;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.chatItem,
          {
            backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
          },
        ]}
      >
        <Avatar emoji={chat.otherUser?.emoji || "🐸"} size={48} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <ThemedText type="body" style={styles.chatName}>
              {chat.otherUser?.username || "User"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
            </ThemedText>
          </View>
          <View style={styles.chatPreview}>
            <ThemedText
              type="small"
              numberOfLines={1}
              style={{ color: theme.textSecondary, flex: 1 }}
            >
              {chat.lastMessage || "Start a conversation"}
            </ThemedText>
            {chat.unreadCount && chat.unreadCount > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: theme.link }]}>
                <ThemedText type="caption" style={{ color: "#fff", fontWeight: "600" }}>
                  {chat.unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyChats() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={48} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Chats Yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Start a conversation by tapping on a user's profile
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ChatsTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ChatsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/users", user?.id, "chats"],
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
    setRefreshing(false);
  }, [queryClient, user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: Chat }) => {
      const chatWithDetails: ChatWithDetails = {
        ...item,
        otherUser: {
          id: item.user1Id === user?.id ? item.user2Id : item.user1Id,
          username: "User",
          emoji: "🐸",
        },
      };

      return (
        <ChatItem
          chat={chatWithDetails}
          onPress={() => navigation.navigate("Chat", { chatId: item.id })}
        />
      );
    },
    [user, navigation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={chats}
        renderItem={renderItem}
        estimatedItemSize={72}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.sm,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ListEmptyComponent={<EmptyChats />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chatInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  chatName: {
    fontWeight: "600",
    flex: 1,
  },
  chatPreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    paddingHorizontal: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["6xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: "center",
  },
});
