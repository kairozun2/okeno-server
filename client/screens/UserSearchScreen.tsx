import React, { useState, useCallback, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  FlatList,
  Platform,
  Keyboard,
  Text,
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
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
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
  isVerified?: boolean;
  isPremium?: boolean;
  usernameColor?: string | null;
}

interface MiniApp {
  id: string;
  name: string;
  emoji: string;
  url: string;
  description?: string;
  isVerified?: boolean;
}

const SEARCH_HISTORY_KEY = "@search_history";

type Props = NativeStackScreenProps<RootStackParamList, "UserSearch">;

function UserItem({ 
  user, 
  onPress,
  isCurrentUser,
  language,
  showChatIcon = true,
}: { 
  user: User; 
  onPress: () => void;
  isCurrentUser: boolean;
  language: string;
  showChatIcon?: boolean;
}) {
  const { theme } = useTheme();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ThemedText type="body" style={[styles.username, { marginRight: 4 }, user.usernameColor ? { color: user.usernameColor } : null]} truncate maxLength={12}>
            {user.username}
          </ThemedText>
          {user.isVerified ? <VerifiedBadge size={14} /> : null}
          {user.isPremium ? <PremiumBadge size={12} /> : null}
        </View>
        {isCurrentUser ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t("It's you", "Это вы")}
          </ThemedText>
        ) : null}
      </View>
      {showChatIcon && !isCurrentUser ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

function EmptyResults({ query, history, onClearHistory, onSelectHistory, language }: { 
  query: string; 
  history: User[];
  onClearHistory: () => void;
  onSelectHistory: (user: User) => void;
  language: string;
}) {
  const { theme } = useTheme();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  if (query.length === 0 && history.length > 0) {
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
            {t("RECENT", "НЕДАВНИЕ")}
          </ThemedText>
          <Pressable onPress={onClearHistory} style={styles.clearButton}>
            <ThemedText type="caption" style={{ color: theme.link }}>{t("Clear", "Очистить")}</ThemedText>
          </Pressable>
        </View>
        {history.map((user) => (
          <UserItem 
            key={user.id} 
            user={user} 
            onPress={() => onSelectHistory(user)} 
            isCurrentUser={false}
            showChatIcon={false}
            language={language}
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
          ? t(`No users found with name "${query}"`, `Пользователи с именем "${query}" не найдены`)
          : t("Enter a username to search", "Введите имя пользователя для поиска")
        }
      </ThemedText>
    </View>
  );
}

export default function UserSearchScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<User[]>([]);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Silent fail
    }
  };

  const saveToHistory = async (user: User) => {
    try {
      const newHistory = [user, ...history.filter(u => u.id !== user.id)].slice(0, 10);
      setHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch {
      // Silent fail
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silent fail
    }
  };

  const isMiniAppSearch = searchQuery.startsWith("/");
  const miniAppSearchTerm = isMiniAppSearch ? searchQuery.slice(1).toLowerCase() : "";

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length > 0 && !isMiniAppSearch,
    queryFn: async () => {
      const url = new URL(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, getApiUrl());
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
  });

  const { data: allMiniApps = [] } = useQuery<MiniApp[]>({
    queryKey: ["/api/mini-apps"],
    queryFn: async () => {
      const url = new URL("/api/mini-apps", getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });

  const filteredMiniApps = isMiniAppSearch
    ? (miniAppSearchTerm.length >= 1
      ? allMiniApps.filter(app => app.name.toLowerCase().includes(miniAppSearchTerm))
      : allMiniApps)
    : [];

  const handleMiniAppPress = useCallback((app: MiniApp) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    (navigation as any).navigate("MiniAppViewer", {
      appId: app.id,
      appName: app.name,
      appUrl: app.url,
      appEmoji: app.emoji,
    });
  }, [navigation]);

  const handleUserPress = useCallback((user: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    saveToHistory(user);
    if (user.id === currentUser?.id) {
      navigation.replace("Main");
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
        language={language}
      />
    </Animated.View>
  ), [handleUserPress, currentUser?.id, language]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top - 10 : Spacing.md }]}>
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
        <ThemedText type="h4">{t("Search", "Поиск")}</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t("Username or / for apps...", "Имя или / для приложений...")}
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

      {isMiniAppSearch ? (
        <FlatList
          data={filteredMiniApps}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn}>
              <Pressable
                onPress={() => handleMiniAppPress(item)}
                style={[
                  styles.userItem,
                  { backgroundColor: theme.backgroundDefault }
                ]}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 22, lineHeight: 28 }}>{item.emoji}</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <ThemedText type="body" style={[styles.username]}>{item.name}</ThemedText>
                    {item.isVerified ? <VerifiedBadge size={14} /> : null}
                  </View>
                  {item.description ? (
                    <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
                      {item.description}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={{
                  backgroundColor: 'rgba(52,120,246,0.12)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}>
                  <ThemedText type="caption" style={{ color: '#3478F6', fontWeight: '600', fontSize: 12 }}>
                    {t("Open", "Открыть")}
                  </ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="grid" size={40} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                {miniAppSearchTerm.length > 0
                  ? t(`No apps found matching "${miniAppSearchTerm}"`, `Приложения "${miniAppSearchTerm}" не найдены`)
                  : t("No mini apps available", "Мини-приложений пока нет")
                }
              </ThemedText>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      ) : (
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
                language={language}
              />
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
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
