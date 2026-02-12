import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CreateGroupChat">;

interface User {
  id: string;
  username: string;
  emoji: string;
  isVerified?: boolean;
}

interface ChatWithUser {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUser?: User;
}

const GROUP_EMOJIS = ["🐸", "🦊", "🐱", "🐶", "🐼", "🦁"];

export default function CreateGroupChatScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [groupName, setGroupName] = useState("");
  const [groupEmoji, setGroupEmoji] = useState("🐸");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const { data: chatsData = [], isLoading } = useQuery<ChatWithUser[]>({
    queryKey: ["/api/users", user?.id, "chats"],
    queryFn: async () => {
      const url = new URL(`/api/users/${user?.id}/chats`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const contacts = useMemo(() => {
    const userMap = new Map<string, User>();
    chatsData.forEach((chat) => {
      if (chat.otherUser) {
        userMap.set(chat.otherUser.id, chat.otherUser);
      }
    });
    return Array.from(userMap.values());
  }, [chatsData]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter((u) => u.username.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

  const toggleUser = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/group-chats", {
        name: groupName.trim() || t("Group Chat", "Групповой чат"),
        groupEmoji,
        creatorId: user?.id,
        memberIds: selectedUserIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("Chat", {
        chatId: data.id,
        isGroupChat: true,
        groupName: data.name || groupName.trim(),
        groupEmoji: data.groupEmoji || groupEmoji,
      });
    },
  });

  const canCreate = selectedUserIds.length >= 1;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          {t("New Group", "Новая группа")}
        </ThemedText>
        <Pressable
          onPress={() => createGroupMutation.mutate()}
          disabled={!canCreate || createGroupMutation.isPending}
          style={styles.headerButton}
        >
          {createGroupMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.link} />
          ) : (
            <ThemedText
              type="body"
              style={{ color: canCreate ? theme.link : theme.textSecondary, fontWeight: "600" }}
            >
              {t("Create", "Создать")}
            </ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("GROUP NAME", "НАЗВАНИЕ ГРУППЫ")}
          </ThemedText>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder={t("Enter group name...", "Введите название...")}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.nameInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            maxLength={40}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("GROUP EMOJI", "ЭМОДЗИ ГРУППЫ")}
          </ThemedText>
          <View style={styles.emojiRow}>
            {GROUP_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGroupEmoji(emoji);
                }}
                style={[
                  styles.emojiOption,
                  {
                    backgroundColor: groupEmoji === emoji ? theme.link : theme.backgroundSecondary,
                    borderColor: groupEmoji === emoji ? theme.link : theme.border,
                  },
                ]}
              >
                <Avatar emoji={emoji} size={32} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("ADD MEMBERS", "ДОБАВИТЬ УЧАСТНИКОВ")}
            {selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}
          </ThemedText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("Search contacts...", "Поиск контактов...")}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.link} />
          </View>
        ) : filteredContacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={32} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              {t("No contacts found", "Контакты не найдены")}
            </ThemedText>
          </View>
        ) : (
          filteredContacts.map((contact) => {
            const isSelected = selectedUserIds.includes(contact.id);
            return (
              <Pressable
                key={contact.id}
                onPress={() => toggleUser(contact.id)}
                style={({ pressed }) => [
                  styles.contactRow,
                  {
                    backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
                  },
                ]}
              >
                <Avatar emoji={contact.emoji} size={40} />
                <View style={styles.contactInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ThemedText type="body" style={{ fontWeight: "500" }} truncate maxLength={20}>
                      {contact.username}
                    </ThemedText>
                    {contact.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    @{contact.username}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? theme.link : "transparent",
                      borderColor: isSelected ? theme.link : theme.textSecondary,
                    },
                  ]}
                >
                  {isSelected ? <Feather name="check" size={14} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
  headerButton: {
    minWidth: 60,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  nameInput: {
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  searchInput: {
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  emojiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    paddingVertical: Spacing["5xl"],
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: Spacing["5xl"],
    alignItems: "center",
  },
});
