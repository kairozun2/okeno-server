import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, RefreshControl, Pressable, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
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

interface User {
  id: string;
  username: string;
  emoji: string;
}

interface ChatWithDetails extends Chat {
  otherUser?: User;
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
        <Avatar emoji={chat.otherUser?.emoji || "🐸"} size={44} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <ThemedText type="body" style={styles.chatName} truncate maxLength={15}>
                {chat.otherUser?.username || "Пользователь"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }} truncate maxLength={20}>
                @{chat.otherUser?.username || "user"}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: ru })}
            </ThemedText>
          </View>
          <View style={styles.chatPreview}>
            <ThemedText
              type="small"
              numberOfLines={1}
              style={{ color: theme.textSecondary, flex: 1 }}
            >
              {chat.lastMessage || "Начните переписку"}
            </ThemedText>
            {chat.unreadCount && chat.unreadCount > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: theme.link }]}>
                <ThemedText type="caption" style={{ color: "#fff", fontWeight: "600", fontSize: 11 }}>
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
      <Feather name="message-circle" size={40} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        Пока нет чатов
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Начните переписку, нажав на профиль пользователя
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
  const headerHeight = useHeaderHeight() || 64;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: chatsData = [], isLoading } = useQuery<ChatWithDetails[]>({
    queryKey: ["/api/users", user?.id, "chats"],
    enabled: !!user?.id,
    refetchInterval: 3000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
    setRefreshing(false);
  }, [queryClient, user?.id]);

  const sortedChats = useMemo(() => {
    return [...chatsData].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [chatsData]);

  const renderItem = useCallback(
    ({ item }: { item: ChatWithDetails }) => {
      return (
        <ChatItem
          chat={item}
          onPress={() => navigation.navigate("Chat", { 
            chatId: item.id,
            otherUserId: item.otherUser?.id,
            otherUserName: item.otherUser?.username,
            otherUserEmoji: item.otherUser?.emoji,
            otherUserUsername: item.otherUser?.username, // Pass the username too
          })}
        />
      );
    },
    [navigation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedChats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        }
        ListEmptyComponent={!isLoading ? <EmptyChats /> : null}
        showsVerticalScrollIndicator={false}
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
    paddingVertical: Spacing.sm,
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
    fontWeight: "500",
    flex: 1,
  },
  chatPreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: "center",
  },
});
