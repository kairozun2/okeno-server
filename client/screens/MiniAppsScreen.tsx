import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator, TextInput, Modal, ScrollView, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface MiniApp {
  id: string;
  name: string;
  description: string | null;
  url: string;
  emoji: string;
  isVerified: boolean;
  isPublished: boolean;
  creatorId: string;
  creator?: { id: string; username: string; emoji: string; isVerified: boolean } | null;
}

type Props = NativeStackScreenProps<RootStackParamList, "MiniApps">;

type IconName = "play" | "music" | "bar-chart-2" | "shopping-cart" | "edit-3" | "pen-tool" | "tool" | "message-square" | "camera" | "map-pin" | "target" | "zap" | "globe" | "hash" | "book-open";

const ICON_OPTIONS: { name: IconName; label: string }[] = [
  { name: "play", label: "Game" },
  { name: "music", label: "Music" },
  { name: "bar-chart-2", label: "Stats" },
  { name: "shopping-cart", label: "Shop" },
  { name: "edit-3", label: "Notes" },
  { name: "pen-tool", label: "Art" },
  { name: "tool", label: "Tool" },
  { name: "message-square", label: "Chat" },
  { name: "camera", label: "Photo" },
  { name: "map-pin", label: "Map" },
  { name: "target", label: "Focus" },
  { name: "zap", label: "Fast" },
  { name: "globe", label: "Web" },
  { name: "hash", label: "Code" },
  { name: "book-open", label: "Read" },
];

export default function MiniAppsScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showMyApps, setShowMyApps] = useState(false);
  const [editingApp, setEditingApp] = useState<MiniApp | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>("globe");

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const headers = { "x-user-id": user?.id || "" };

  const { data: apps = [], isLoading } = useQuery<MiniApp[]>({
    queryKey: ["/api/mini-apps"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/mini-apps", getApiUrl()).toString());
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
  });

  const { data: myApps = [], refetch: refetchMyApps } = useQuery<MiniApp[]>({
    queryKey: ["/api/mini-apps/my"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/mini-apps/my", getApiUrl()).toString(), { headers });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; url: string; emoji: string }) => {
      const response = await fetch(new URL("/api/mini-apps", getApiUrl()).toString(), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isPublished: true }),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mini-apps"] });
      refetchMyApps();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MiniApp> }) => {
      const response = await fetch(new URL(`/api/mini-apps/${id}`, getApiUrl()).toString(), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mini-apps"] });
      refetchMyApps();
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(new URL(`/api/mini-apps/${id}`, getApiUrl()).toString(), {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mini-apps"] });
      refetchMyApps();
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setEditingApp(null);
    setName("");
    setDescription("");
    setUrl("");
    setSelectedIcon("globe");
  };

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editingApp) {
      updateMutation.mutate({ id: editingApp.id, data: { name: name.trim(), description: description.trim() || null, url: url.trim(), emoji: selectedIcon } });
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim(), url: url.trim(), emoji: selectedIcon });
    }
  };

  const openEdit = (app: MiniApp) => {
    setEditingApp(app);
    setName(app.name);
    setDescription(app.description || "");
    setUrl(app.url);
    const found = ICON_OPTIONS.find(i => i.name === app.emoji);
    setSelectedIcon(found ? app.emoji as IconName : "globe");
    setShowCreate(true);
  };

  const handleShare = async (app: MiniApp) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const domain = process.env.EXPO_PUBLIC_DOMAIN || "okeno.app";
    const protocol = domain.includes("localhost") ? "http" : "https";
    const appLink = `${protocol}://${domain}/mini-app/${app.id}`;
    const shareText = `${app.name}\n${appLink}`;
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(appLink);
      } else {
        await Share.share({
          message: shareText,
          url: appLink,
        });
      }
    } catch (_e) {
      await Clipboard.setStringAsync(appLink);
    }
  };

  const getAppIcon = (iconKey: string): IconName => {
    const found = ICON_OPTIONS.find(i => i.name === iconKey);
    return found ? iconKey as IconName : "globe";
  };

  const renderAppItem = ({ item }: { item: MiniApp }) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("MiniAppViewer", { appId: item.id, appName: item.name, appUrl: item.url });
      }}
      style={[styles.appCard, { backgroundColor: theme.cardBackground }]}
    >
      <View style={[styles.appIconBox, { backgroundColor: "#3478F6" + "20" }]}>
        <Feather name={getAppIcon(item.emoji)} size={24} color="#3478F6" />
      </View>
      <View style={styles.appInfo}>
        <View style={styles.appNameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>{item.name}</ThemedText>
          {item.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
        </View>
        {item.description ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>{item.description}</ThemedText>
        ) : null}
        {item.creator ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            @{item.creator.username}
          </ThemedText>
        ) : null}
      </View>
      <Pressable onPress={() => handleShare(item)} hitSlop={8} style={styles.shareBtn}>
        <Feather name="share" size={18} color={theme.textSecondary} />
      </Pressable>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderMyAppItem = ({ item }: { item: MiniApp }) => (
    <View style={[styles.appCard, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.appIconBox, { backgroundColor: "#3478F6" + "20" }]}>
        <Feather name={getAppIcon(item.emoji)} size={24} color="#3478F6" />
      </View>
      <View style={styles.appInfo}>
        <View style={styles.appNameRow}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>{item.name}</ThemedText>
          {item.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>{item.url}</ThemedText>
      </View>
      <Pressable onPress={() => handleShare(item)} hitSlop={8} style={styles.iconBtn}>
        <Feather name="share" size={16} color={theme.textSecondary} />
      </Pressable>
      <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
        <Feather name="edit-2" size={16} color={theme.textSecondary} />
      </Pressable>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); deleteMutation.mutate(item.id); }} style={styles.iconBtn}>
        <Feather name="trash-2" size={16} color="#FF3B30" />
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ borderRadius: 16, overflow: "hidden" }}>
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={{ padding: Spacing.sm, borderRadius: 16 }}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </BlurView>
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>{t("Mini Apps", "Мини-приложения")}</ThemedText>
        <Pressable onPress={() => setShowMyApps(!showMyApps)} style={{ borderRadius: 16, overflow: "hidden" }}>
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={{ padding: Spacing.sm, borderRadius: 16 }}>
            <Feather name={showMyApps ? "grid" : "user"} size={22} color={theme.text} />
          </BlurView>
        </Pressable>
      </View>

      {showMyApps ? (
        <>
          <View style={styles.sectionHeader}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t("My Apps", "Мои приложения")}</ThemedText>
            <Pressable
              onPress={() => { resetForm(); setShowCreate(true); }}
              style={[styles.createBtn, { backgroundColor: "#3478F6" }]}
            >
              <Feather name="plus" size={16} color="#FFF" />
              <ThemedText type="caption" style={{ color: "#FFF", marginLeft: 4 }}>{t("Create", "Создать")}</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={myApps}
            keyExtractor={(item) => item.id}
            renderItem={renderMyAppItem}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: insets.bottom + Spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.cardBackground }]}>
                  <Feather name="grid" size={32} color={theme.textSecondary} />
                </View>
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}>
                  {t("You haven't created any mini apps yet", "У вас пока нет мини-приложений")}
                </ThemedText>
              </View>
            }
          />
        </>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.loading}><ActivityIndicator color={theme.text} /></View>
          ) : (
            <FlatList
              data={apps}
              keyExtractor={(item) => item.id}
              renderItem={renderAppItem}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: insets.bottom + Spacing.lg, paddingTop: Spacing.sm }}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.cardBackground }]}>
                    <Feather name="grid" size={32} color={theme.textSecondary} />
                  </View>
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}>
                    {t("No mini apps available yet", "Пока нет мини-приложений")}
                  </ThemedText>
                  <Pressable
                    onPress={() => { setShowMyApps(true); resetForm(); setShowCreate(true); }}
                    style={[styles.createFirstBtn, { backgroundColor: "#3478F6" }]}
                  >
                    <ThemedText type="body" style={{ color: "#FFF" }}>{t("Create First App", "Создать первое")}</ThemedText>
                  </Pressable>
                </View>
              }
            />
          )}
        </>
      )}

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={resetForm}>
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable onPress={resetForm}>
              <ThemedText type="body" style={{ color: "#3478F6" }}>{t("Cancel", "Отмена")}</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {editingApp ? t("Edit App", "Редактировать") : t("New App", "Новое приложение")}
            </ThemedText>
            <Pressable onPress={handleSubmit} disabled={!name.trim() || !url.trim()}>
              <ThemedText type="body" style={{ color: name.trim() && url.trim() ? "#3478F6" : theme.textSecondary, fontWeight: "600" }}>
                {t("Save", "Сохранить")}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.formContainer} contentContainerStyle={{ padding: Spacing.md }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>{t("Icon", "Иконка")}</ThemedText>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon.name}
                  onPress={() => { setSelectedIcon(icon.name); Haptics.selectionAsync(); }}
                  style={[
                    styles.iconOption,
                    { borderColor: selectedIcon === icon.name ? "#3478F6" : theme.border, backgroundColor: selectedIcon === icon.name ? "#3478F6" + "20" : "transparent" },
                  ]}
                >
                  <Feather name={icon.name} size={22} color={selectedIcon === icon.name ? "#3478F6" : theme.textSecondary} />
                </Pressable>
              ))}
            </View>

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg }}>{t("Name", "Название")} *</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("My Cool App", "Моё крутое приложение")}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              maxLength={50}
            />

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md }}>{t("Description", "Описание")}</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("What does your app do?", "Что делает ваше приложение?")}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              multiline
              maxLength={200}
            />

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md }}>URL *</ThemedText>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              autoCapitalize="none"
              keyboardType="url"
            />
          </ScrollView>
        </View>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  appCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  appIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  appInfo: { flex: 1 },
  appNameRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: Spacing.sm },
  shareBtn: { padding: Spacing.xs },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  createFirstBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  emptyState: { paddingTop: 80, alignItems: "center", paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  formContainer: { flex: 1 },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: "top" },
});
