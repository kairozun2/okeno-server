import React, { useState, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  FlatList,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface User {
  id: string;
  username: string;
  emoji: string;
}

type Props = NativeStackScreenProps<RootStackParamList, "UserSearch">;

function UserItem({ 
  user, 
  onPress,
  isCurrentUser,
}: { 
  user: User; 
  onPress: () => void;
  isCurrentUser: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable 
      onPress={onPress} 
      disabled={isCurrentUser}
      style={[
        styles.userItem, 
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: isCurrentUser ? 0.5 : 1,
        }
      ]}
    >
      <Avatar emoji={user.emoji} size={44} />
      <View style={styles.userInfo}>
        <ThemedText type="body" style={styles.username}>
          {user.username}
        </ThemedText>
        {isCurrentUser ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Это вы
          </ThemedText>
        ) : null}
      </View>
      {!isCurrentUser ? (
        <Feather name="message-circle" size={20} color={theme.link} />
      ) : null}
    </Pressable>
  );
}

function EmptyResults({ query }: { query: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="users" size={40} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
        {query.length > 0 
          ? `Пользователи с именем "${query}" не найдены`
          : "Введите имя пользователя для поиска"
        }
      </ThemedText>
    </View>
  );
}

export default function UserSearchScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      const url = new URL(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, getApiUrl());
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const response = await apiRequest("POST", "/api/chats", {
        participant1Id: currentUser?.id,
        participant2Id: otherUserId,
      });
      return response.json();
    },
    onSuccess: (data, otherUserId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const otherUser = users.find(u => u.id === otherUserId);
      navigation.replace("Chat", { 
        chatId: data.id,
        otherUserId,
        otherUserName: otherUser?.username,
        otherUserEmoji: otherUser?.emoji,
      });
    },
  });

  const handleUserPress = useCallback((user: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    createChatMutation.mutate(user.id);
  }, [createChatMutation]);

  const renderItem = useCallback(({ item }: { item: User }) => (
    <Animated.View entering={FadeIn}>
      <UserItem 
        user={item} 
        onPress={() => handleUserPress(item)}
        isCurrentUser={item.id === currentUser?.id}
      />
    </Animated.View>
  ), [handleUserPress, currentUser?.id]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          {Platform.OS === "ios" && (
            <BlurView
              intensity={50}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: "hidden" }]}
            />
          )}
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Поиск</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Введите имя пользователя..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <Feather name="x-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        ListEmptyComponent={
          !isLoading ? <EmptyResults query={searchQuery} /> : null
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  userItem: {
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
  username: {
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
});
