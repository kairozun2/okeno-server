import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator, Platform, ActionSheetIOS, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface AdminUser {
  id: string;
  username: string;
  emoji: string;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface AdminGroup {
  id: string;
  name: string | null;
  groupEmoji: string | null;
  isVerified: boolean;
  memberCount: number;
  createdAt: string;
}

interface AdminMiniApp {
  id: string;
  name: string;
  description: string | null;
  url: string;
  emoji: string;
  isVerified: boolean;
  isPublished: boolean;
  creator: { id: string; username: string; emoji: string } | null;
}

type TabType = "users" | "groups" | "miniapps";
type Props = NativeStackScreenProps<RootStackParamList, "AdminPanel">;

export default function AdminPanelScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const headers = { "x-user-id": user?.id || "" };

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const url = new URL("/api/admin/users", getApiUrl());
      const response = await fetch(url.toString(), { headers, credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!user?.id && activeTab === "users",
  });

  const { data: groups = [], isLoading: groupsLoading, refetch: refetchGroups } = useQuery<AdminGroup[]>({
    queryKey: ["/api/admin/groups"],
    queryFn: async () => {
      const url = new URL("/api/admin/groups", getApiUrl());
      const response = await fetch(url.toString(), { headers, credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!user?.id && activeTab === "groups",
  });

  const { data: miniApps = [], isLoading: miniAppsLoading, refetch: refetchMiniApps } = useQuery<AdminMiniApp[]>({
    queryKey: ["/api/admin/mini-apps"],
    queryFn: async () => {
      const url = new URL("/api/admin/mini-apps", getApiUrl());
      const response = await fetch(url.toString(), { headers, credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!user?.id && activeTab === "miniapps",
  });

  const userMutation = useMutation({
    mutationFn: async ({ userId, action, value }: { userId: string; action: "admin" | "verify" | "ban"; value: boolean }) => {
      const url = new URL(`/api/admin/users/${userId}/${action}`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      setShowModal(false);
      setSelectedUser(null);
    },
  });

  const groupMutation = useMutation({
    mutationFn: async ({ groupId, value }: { groupId: string; value: boolean }) => {
      const url = new URL(`/api/admin/groups/${groupId}/verify`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => refetchGroups(),
  });

  const miniAppMutation = useMutation({
    mutationFn: async ({ appId, value }: { appId: string; value: boolean }) => {
      const url = new URL(`/api/admin/mini-apps/${appId}/verify`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => refetchMiniApps(),
  });

  const handleUserAction = (targetUser: AdminUser) => {
    if (Platform.OS === "ios") {
      const options = [
        t("Cancel", "Отмена"),
        targetUser.isVerified ? t("Remove Verification", "Снять верификацию") : t("Verify", "Верифицировать"),
        targetUser.isAdmin ? t("Remove Admin", "Снять админку") : t("Make Admin", "Дать админку"),
        targetUser.isBanned ? t("Unban", "Разбанить") : t("Ban", "Забанить"),
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, destructiveButtonIndex: targetUser.isBanned ? undefined : 3, title: `@${targetUser.username}` },
        (buttonIndex) => {
          if (buttonIndex === 1) userMutation.mutate({ userId: targetUser.id, action: "verify", value: !targetUser.isVerified });
          else if (buttonIndex === 2) userMutation.mutate({ userId: targetUser.id, action: "admin", value: !targetUser.isAdmin });
          else if (buttonIndex === 3) userMutation.mutate({ userId: targetUser.id, action: "ban", value: !targetUser.isBanned });
        }
      );
    } else {
      setSelectedUser(targetUser);
      setShowModal(true);
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "users", label: t("Users", "Пользователи"), icon: "users" },
    { key: "groups", label: t("Groups", "Группы"), icon: "message-circle" },
    { key: "miniapps", label: t("Mini Apps", "Мини-апы"), icon: "grid" },
  ];

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <Pressable onPress={() => handleUserAction(item)} style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <Avatar emoji={item.emoji} size={44} />
      <View style={styles.itemInfo}>
        <View style={styles.nameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>@{item.username}</ThemedText>
          {item.isVerified ? <View style={[styles.badge, { backgroundColor: "#007AFF" }]}><Feather name="check" size={10} color="#FFF" /></View> : null}
          {item.isAdmin ? <View style={[styles.badge, { backgroundColor: "#FF9500" }]}><Feather name="shield" size={10} color="#FFF" /></View> : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>ID: {item.id.slice(0, 8)}...</ThemedText>
      </View>
      {item.isBanned ? <View style={[styles.bannedBadge, { backgroundColor: "#FF3B30" }]}><ThemedText type="caption" style={{ color: "#FFF" }}>{t("BANNED", "БАН")}</ThemedText></View> : null}
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderGroupItem = ({ item }: { item: AdminGroup }) => (
    <Pressable
      onPress={() => groupMutation.mutate({ groupId: item.id, value: !item.isVerified })}
      style={[styles.listItem, { backgroundColor: theme.cardBackground }]}
    >
      <View style={styles.emojiCircle}>
        <ThemedText style={{ fontSize: 22 }}>{item.groupEmoji || "👥"}</ThemedText>
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.nameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>{item.name || t("Unnamed", "Без имени")}</ThemedText>
          {item.isVerified ? <View style={[styles.badge, { backgroundColor: "#007AFF" }]}><Feather name="check" size={10} color="#FFF" /></View> : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {item.memberCount} {t("members", "участн.")}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => groupMutation.mutate({ groupId: item.id, value: !item.isVerified })}
        style={[styles.verifyBtn, { backgroundColor: item.isVerified ? "#34C759" : theme.border }]}
      >
        <Feather name={item.isVerified ? "check-circle" : "circle"} size={16} color={item.isVerified ? "#FFF" : theme.textSecondary} />
      </Pressable>
    </Pressable>
  );

  const renderMiniAppItem = ({ item }: { item: AdminMiniApp }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.appIconBox, { backgroundColor: "#3478F6" + "20" }]}>
        <Feather name={(["play","music","bar-chart-2","shopping-cart","edit-3","pen-tool","tool","message-square","camera","map-pin","target","zap","globe","hash","book-open"].includes(item.emoji) ? item.emoji : "globe") as any} size={22} color="#3478F6" />
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.nameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>{item.name}</ThemedText>
          {item.isVerified ? <View style={[styles.badge, { backgroundColor: "#007AFF" }]}><Feather name="check" size={10} color="#FFF" /></View> : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {item.creator ? `@${item.creator.username}` : t("Unknown", "Неизвестный")}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => miniAppMutation.mutate({ appId: item.id, value: !item.isVerified })}
        style={[styles.verifyBtn, { backgroundColor: item.isVerified ? "#34C759" : theme.border }]}
      >
        <Feather name={item.isVerified ? "check-circle" : "circle"} size={16} color={item.isVerified ? "#FFF" : theme.textSecondary} />
      </Pressable>
    </View>
  );

  const isLoading = activeTab === "users" ? usersLoading : activeTab === "groups" ? groupsLoading : miniAppsLoading;
  const listContentStyle = { paddingHorizontal: Spacing.md, paddingBottom: insets.bottom + Spacing.lg, paddingTop: Spacing.sm };
  const emptyText = activeTab === "users" ? t("No users", "Нет пользователей") : activeTab === "groups" ? t("No groups", "Нет групп") : t("No mini apps", "Нет мини-приложений");
  const EmptyList = () => (
    <View style={styles.emptyState}>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>{emptyText}</ThemedText>
    </View>
  );
  const Separator = () => <View style={{ height: Spacing.sm }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ borderRadius: 16, overflow: "hidden" }}>
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={{ padding: Spacing.sm, borderRadius: 16 }}>
            <Feather name="x" size={22} color={theme.text} />
          </BlurView>
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>{t("Admin Panel", "Админ-панель")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key ? { borderBottomColor: "#3478F6", borderBottomWidth: 2 } : null]}
          >
            <Feather name={tab.icon as any} size={18} color={activeTab === tab.key ? "#3478F6" : theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ color: activeTab === tab.key ? "#3478F6" : theme.textSecondary, fontWeight: activeTab === tab.key ? "600" : "400", marginTop: 2 }}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.text} /></View>
      ) : activeTab === "users" ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={EmptyList}
        />
      ) : activeTab === "groups" ? (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={EmptyList}
        />
      ) : (
        <FlatList
          data={miniApps}
          keyExtractor={(item) => item.id}
          renderItem={renderMiniAppItem}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={EmptyList}
        />
      )}

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            {selectedUser ? (
              <>
                <ThemedText type="h4" style={{ marginBottom: Spacing.md, textAlign: "center" }}>@{selectedUser.username}</ThemedText>
                <Pressable
                  onPress={() => userMutation.mutate({ userId: selectedUser.id, action: "verify", value: !selectedUser.isVerified })}
                  style={[styles.modalButton, { backgroundColor: "#007AFF" }]}
                >
                  <Feather name="check-circle" size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isVerified ? t("Remove Verification", "Снять верификацию") : t("Verify", "Верифицировать")}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => userMutation.mutate({ userId: selectedUser.id, action: "admin", value: !selectedUser.isAdmin })}
                  style={[styles.modalButton, { backgroundColor: "#FF9500" }]}
                >
                  <Feather name="shield" size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isAdmin ? t("Remove Admin", "Снять админку") : t("Make Admin", "Дать админку")}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => userMutation.mutate({ userId: selectedUser.id, action: "ban", value: !selectedUser.isBanned })}
                  style={[styles.modalButton, { backgroundColor: selectedUser.isBanned ? "#34C759" : "#FF3B30" }]}
                >
                  <Feather name={selectedUser.isBanned ? "user-check" : "slash"} size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isBanned ? t("Unban", "Разбанить") : t("Ban", "Забанить")}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => setShowModal(false)} style={[styles.modalButton, { backgroundColor: theme.border, marginTop: Spacing.md }]}>
                  <ThemedText type="body">{t("Cancel", "Отмена")}</ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  appIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: { width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  bannedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  verifyBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  emptyState: { paddingTop: 60, alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", padding: Spacing.lg, borderRadius: BorderRadius.xl },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
});
