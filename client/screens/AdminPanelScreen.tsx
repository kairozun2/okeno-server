import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator, Platform, ActionSheetIOS, Modal } from "react-native";
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
import { apiRequest } from "@/lib/query-client";
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

type Props = NativeStackScreenProps<RootStackParamList, "AdminPanel">;

export default function AdminPanelScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const { data: users = [], isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/admin/users`, {
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, action, value }: { userId: string; action: "admin" | "verify" | "ban"; value: boolean }) => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setShowModal(false);
      setSelectedUser(null);
    },
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
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: targetUser.isBanned ? undefined : 3,
          title: `@${targetUser.username}`,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            updateMutation.mutate({ userId: targetUser.id, action: "verify", value: !targetUser.isVerified });
          } else if (buttonIndex === 2) {
            updateMutation.mutate({ userId: targetUser.id, action: "admin", value: !targetUser.isAdmin });
          } else if (buttonIndex === 3) {
            updateMutation.mutate({ userId: targetUser.id, action: "ban", value: !targetUser.isBanned });
          }
        }
      );
    } else {
      setSelectedUser(targetUser);
      setShowModal(true);
    }
  };

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <Pressable
      onPress={() => handleUserAction(item)}
      style={[styles.userItem, { backgroundColor: theme.cardBackground }]}
    >
      <Avatar emoji={item.emoji} size={44} />
      <View style={styles.userInfo}>
        <View style={styles.usernameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            @{item.username}
          </ThemedText>
          {item.isVerified ? (
            <View style={[styles.badge, { backgroundColor: "#007AFF" }]}>
              <Feather name="check" size={10} color="#FFF" />
            </View>
          ) : null}
          {item.isAdmin ? (
            <View style={[styles.badge, { backgroundColor: "#FF9500" }]}>
              <Feather name="shield" size={10} color="#FFF" />
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          ID: {item.id.slice(0, 8)}...
        </ThemedText>
      </View>
      {item.isBanned ? (
        <View style={[styles.bannedBadge, { backgroundColor: "#FF3B30" }]}>
          <ThemedText type="caption" style={{ color: "#FFF" }}>
            {t("BANNED", "ЗАБАНЕН")}
          </ThemedText>
        </View>
      ) : null}
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={{ padding: Spacing.sm, borderRadius: 16 }}
          >
            <Feather name="x" size={22} color={theme.text} />
          </BlurView>
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          {t("Admin Panel", "Админ-панель")}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={{
            paddingHorizontal: Spacing.md,
            paddingBottom: insets.bottom + Spacing.lg,
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            {selectedUser ? (
              <>
                <ThemedText type="h4" style={{ marginBottom: Spacing.md, textAlign: "center" }}>
                  @{selectedUser.username}
                </ThemedText>
                
                <Pressable
                  onPress={() => updateMutation.mutate({ userId: selectedUser.id, action: "verify", value: !selectedUser.isVerified })}
                  style={[styles.modalButton, { backgroundColor: "#007AFF" }]}
                >
                  <Feather name="check-circle" size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isVerified ? t("Remove Verification", "Снять верификацию") : t("Verify", "Верифицировать")}
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={() => updateMutation.mutate({ userId: selectedUser.id, action: "admin", value: !selectedUser.isAdmin })}
                  style={[styles.modalButton, { backgroundColor: "#FF9500" }]}
                >
                  <Feather name="shield" size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isAdmin ? t("Remove Admin", "Снять админку") : t("Make Admin", "Дать админку")}
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={() => updateMutation.mutate({ userId: selectedUser.id, action: "ban", value: !selectedUser.isBanned })}
                  style={[styles.modalButton, { backgroundColor: selectedUser.isBanned ? "#34C759" : "#FF3B30" }]}
                >
                  <Feather name={selectedUser.isBanned ? "user-check" : "slash"} size={18} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", marginLeft: Spacing.sm }}>
                    {selectedUser.isBanned ? t("Unban", "Разбанить") : t("Ban", "Забанить")}
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={[styles.modalButton, { backgroundColor: theme.border, marginTop: Spacing.md }]}
                >
                  <ThemedText type="body">
                    {t("Cancel", "Отмена")}
                  </ThemedText>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  bannedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
});
