import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "SavedMessages">;

interface SavedMessage {
  id: string;
  userId: string;
  type: "photo" | "note";
  content: string | null;
  imageUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export default function SavedMessagesScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("Saved Messages", "Сохранённые"),
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={20}
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 0,
          }}
        >
          <Feather name="chevron-left" size={28} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme.text, language]);

  const { data: savedMessages, isLoading } = useQuery<SavedMessage[]>({
    queryKey: ["/api/saved-messages", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/saved-messages/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const uploadImage = async (uri: string): Promise<string> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await apiRequest("POST", "/api/upload", { image: dataUrl });
    const data = await response.json();

    if (!data.url) {
      throw new Error("Server did not return image URL");
    }
    return data.url;
  };

  const queryKey = ["/api/saved-messages", user?.id];

  const addMessageMutation = useMutation({
    mutationFn: async (params: { type: "photo" | "note"; content?: string; imageUrl?: string }) => {
      const response = await apiRequest("POST", "/api/saved-messages", {
        userId: user?.id,
        type: params.type,
        content: params.content || null,
        imageUrl: params.imageUrl || null,
      });
      return response.json();
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedMessage[]>(queryKey);
      const optimistic: SavedMessage = {
        id: `temp-${Date.now()}`,
        userId: user?.id || "",
        type: params.type,
        content: params.content || null,
        imageUrl: params.imageUrl || null,
        fileName: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<SavedMessage[]>(queryKey, (old) => [optimistic, ...(old || [])]);
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("DELETE", `/api/saved-messages/${messageId}`);
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedMessage[]>(queryKey);
      queryClient.setQueryData<SavedMessage[]>(queryKey, (old) =>
        (old || []).filter((m) => m.id !== messageId)
      );
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleAddPhoto = async () => {
    setShowFabMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setIsUploading(true);
        const imageUrl = await uploadImage(result.assets[0].uri);
        await addMessageMutation.mutateAsync({ type: "photo", imageUrl });
      } catch (error: any) {
        Alert.alert(t("Error", "Ошибка"), t("Failed to upload photo", "Не удалось загрузить фото"));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddNote = () => {
    setShowFabMenu(false);
    setNoteText("");
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setShowNoteModal(false);
    try {
      await addMessageMutation.mutateAsync({ type: "note", content: noteText.trim() });
    } catch (error: any) {
      Alert.alert(t("Error", "Ошибка"), t("Failed to save note", "Не удалось сохранить заметку"));
    }
    setNoteText("");
  };

  const handleDeleteMessage = (messageId: string) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      t("Delete", "Удалить"),
      t("Delete this item?", "Удалить этот элемент?"),
      [
        { text: t("Cancel", "Отмена"), style: "cancel" },
        {
          text: t("Delete", "Удалить"),
          style: "destructive",
          onPress: () => deleteMessageMutation.mutate(messageId),
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("Just now", "Только что");
    if (diffMins < 60) return `${diffMins}${t("m ago", "м назад")}`;
    if (diffHours < 24) return `${diffHours}${t("h ago", "ч назад")}`;
    if (diffDays < 7) return `${diffDays}${t("d ago", "д назад")}`;
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const getFullImageUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const baseUrl = getApiUrl();
    return `${baseUrl}${url}`;
  };

  const renderItem = ({ item, index }: { item: SavedMessage; index: number }) => {
    if (item.type === "photo" && item.imageUrl) {
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
          <Pressable
            onLongPress={() => handleDeleteMessage(item.id)}
            style={[
              styles.photoCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <Image
              source={{ uri: getFullImageUrl(item.imageUrl) }}
              style={styles.photoImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.photoFooter}>
              <Feather name="image" size={14} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                {formatDate(item.createdAt)}
              </ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          onLongPress={() => handleDeleteMessage(item.id)}
          style={[
            styles.noteCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText type="body" style={{ color: theme.text, lineHeight: 22 }}>
            {item.content}
          </ThemedText>
          <View style={styles.noteFooter}>
            <Feather name="file-text" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t("Loading...", "Загрузка...")}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={savedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bookmark" size={48} color={theme.textSecondary} style={{ marginBottom: Spacing.md }} />
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
              {t("Save photos and notes here", "Сохраняйте фото и заметки здесь")}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              {t("Tap + to add your first item", "Нажмите + чтобы добавить")}
            </ThemedText>
          </View>
        }
      />

      {isUploading ? (
        <View style={[styles.fab, { bottom: insets.bottom + Spacing.xl, backgroundColor: theme.textSecondary }]}>
          <Feather name="loader" size={24} color="#FFF" />
        </View>
      ) : null}

      {!isUploading ? (
        <Pressable
          onPress={() => setShowFabMenu(!showFabMenu)}
          style={[styles.fab, { bottom: insets.bottom + Spacing.xl, backgroundColor: theme.link }]}
        >
          <Feather name={showFabMenu ? "x" : "plus"} size={24} color="#FFF" />
        </Pressable>
      ) : null}

      {showFabMenu ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[
            styles.fabMenu,
            {
              bottom: insets.bottom + Spacing.xl + 64,
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={handleAddPhoto}
            style={({ pressed }) => [
              styles.fabMenuItem,
              { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
            ]}
          >
            <Feather name="image" size={20} color={theme.link} />
            <ThemedText type="body" style={{ marginLeft: Spacing.md, color: theme.text }}>
              {t("Add Photo", "Добавить фото")}
            </ThemedText>
          </Pressable>
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Pressable
            onPress={handleAddNote}
            style={({ pressed }) => [
              styles.fabMenuItem,
              { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
            ]}
          >
            <Feather name="edit-3" size={20} color={theme.link} />
            <ThemedText type="body" style={{ marginLeft: Spacing.md, color: theme.text }}>
              {t("Add Note", "Добавить заметку")}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}

      {showFabMenu ? (
        <Pressable style={styles.fabOverlay} onPress={() => setShowFabMenu(false)} />
      ) : null}

      <Modal
        visible={showNoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowNoteModal(false)} hitSlop={8}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {t("Cancel", "Отмена")}
              </ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t("New Note", "Новая заметка")}
            </ThemedText>
            <Pressable onPress={handleSaveNote} hitSlop={8} disabled={!noteText.trim()}>
              <ThemedText type="body" style={{ color: noteText.trim() ? theme.link : theme.textSecondary, fontWeight: "600" }}>
                {t("Save", "Сохранить")}
              </ThemedText>
            </Pressable>
          </View>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t("Write your note...", "Напишите заметку...")}
            placeholderTextColor={theme.textSecondary}
            style={[styles.noteInput, { color: theme.text }]}
            multiline
            autoFocus
            maxLength={5000}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    paddingHorizontal: Spacing.xl,
  },
  photoCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  photoImage: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  photoFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  noteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMenu: {
    position: "absolute",
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 200,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: Spacing.lg,
    textAlignVertical: "top",
  },
});
