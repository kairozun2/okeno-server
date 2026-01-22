import React, { useState, useCallback, useEffect } from "react";
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
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const SEARCH_HISTORY_KEY = "@search_history";

type Props = NativeStackScreenProps<RootStackParamList, "UserSearch">;

function UserItem({ 
  user, 
  onPress,
  isCurrentUser,
  showChatIcon = true,
}: { 
  user: User; 
  onPress: () => void;
  isCurrentUser: boolean;
  showChatIcon?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable 
      onPress={onPress} 
      style={[
        styles.userItem, 
        { 
          backgroundColor: theme.backgroundDefault,
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
      {showChatIcon && !isCurrentUser ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

function EmptyResults({ query, history, onClearHistory, onSelectHistory }: { 
  query: string; 
  history: User[];
  onClearHistory: () => void;
  onSelectHistory: (user: User) => void;
}) {
  const { theme } = useTheme();

  if (query.length === 0 && history.length > 0) {
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
            НЕДАВНИЕ
          </ThemedText>
          <Pressable onPress={onClearHistory} style={styles.clearButton}>
            <ThemedText type="caption" style={{ color: theme.link }}>Очистить</ThemedText>
          </Pressable>
        </View>
        {history.map((user) => (
          <UserItem 
            key={user.id} 
            user={user} 
            onPress={() => onSelectHistory(user)} 
            isCurrentUser={false}
            showChatIcon={false}
          />
        ))}
      </View>
    );
  }

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
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<User[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    }
  };

  const saveToHistory = async (user: User) => {
    try {
      const newHistory = [user, ...history.filter(u => u.id !== user.id)].slice(0, 10);
      setHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error("Failed to clear search history", e);
    }
  };

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

  const handleUserPress = useCallback((user: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    saveToHistory(user);
    if (user.id === currentUser?.id) {
      navigation.replace("Main", { screen: "Profile" });
    } else {
      navigation.push("UserProfile", { userId: user.id });
    }
  }, [currentUser?.id, history]);

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
        data={searchQuery.length > 0 ? users : []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyResults 
              query={searchQuery} 
              history={history}
              onClearHistory={clearHistory}
              onSelectHistory={handleUserPress}
            />
          ) : null
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
  historyContainer: {
    marginTop: Spacing.sm,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  clearButton: {
    padding: Spacing.xs,
  },
});
