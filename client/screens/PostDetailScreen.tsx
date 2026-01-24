import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Share, Alert, Modal, TextInput, Platform, ActivityIndicator } from "react-native";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  emoji: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = NativeStackScreenProps<RootStackParamList, "PostDetail">;

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme, isDark, language } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

  const { data: post } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
  });

  const { data: postUser } = useQuery<User>({
    queryKey: ["/api/users", post?.userId],
    enabled: !!post?.userId,
  });

  const { data: likesData } = useQuery<{ count: number }>({
    queryKey: ["/api/posts", postId, "likes"],
  });

  const { data: commentsData } = useQuery<{ count: number }>({
    queryKey: ["/api/posts", postId, "comments", "count"],
  });

  const { data: likedData } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/posts", postId, "likes", currentUser?.id],
    enabled: !!currentUser?.id,
  });

  const { data: savedData } = useQuery<{ saved: boolean }>({
    queryKey: ["/api/posts", postId, "saves", currentUser?.id],
    enabled: !!currentUser?.id,
  });

  const isOwner = currentUser?.id === post?.userId;

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedLocation, setEditedLocation] = useState<string | null>(null);
  const [editedLat, setEditedLat] = useState<number | null>(null);
  const [editedLng, setEditedLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);

  const editMutation = useMutation({
    mutationFn: async (data: { caption?: string, location?: string | null, latitude?: number | null, longitude?: number | null, imageUrl?: string }) => {
      const response = await apiRequest("PATCH", `/api/posts/${postId}`, {
        ...data,
        userId: currentUser?.id,
      });
      return response.json();
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData(["/api/posts", postId], updatedPost);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
    },
    onError: () => {
      Alert.alert(t("Error", "Ошибка"), t("Failed to update post", "Не удалось обновить пост"));
    },
  });

  const handleEditPress = () => {
    setShowActionMenu(true);
  };

  const startEditing = () => {
    setEditedCaption(post?.caption || "");
    setEditedLocation(post?.location || null);
    setEditedLat(post?.latitude ? parseFloat(post.latitude) : null);
    setEditedLng(post?.longitude ? parseFloat(post.longitude) : null);
    setShowEditModal(true);
    setShowActionMenu(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setIsUpdatingImage(true);
        // In a real app, you would upload to storage here. 
        // For simplicity, we'll use the local URI as the source if it were a production app it'd be uploaded.
        editMutation.mutate({ imageUrl: result.assets[0].uri });
        setIsUpdatingImage(false);
      }
    } catch (error) {
      Alert.alert(t("Error", "Ошибка"), t("Failed to pick image", "Не удалось выбрать фото"));
    }
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t("Permission denied", "Доступ запрещен"), t("Location permission is required", "Нужен доступ к геолокации"));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const locationName = address.city || address.region || address.country || t("Unknown", "Неизвестно");
        setEditedLocation(locationName);
        setEditedLat(location.coords.latitude);
        setEditedLng(location.coords.longitude);
      }
    } catch (error) {
      Alert.alert(t("Error", "Ошибка"), t("Failed to get location", "Не удалось определить местоположение"));
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveEdit = () => {
    editMutation.mutate({ 
      caption: editedCaption.trim(),
      location: editedLocation,
      latitude: editedLat,
      longitude: editedLng
    });
  };

  const { data: archivedData } = useQuery<string[]>({
    queryKey: ["/api/users", currentUser?.id, "archived"],
    enabled: !!currentUser?.id,
  });

  const isArchived = archivedData?.includes(postId);

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${currentUser?.id}/archived`, { postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "archived"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Main" as any, { screen: "Home" } as any);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${currentUser?.id}/archived/${postId}`);
    },
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "archived"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Main" as any, { screen: "Home" } as any);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "posts"] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(t("Error", "Ошибка"), t("Failed to delete post", "Не удалось удалить пост"));
    },
  });

  const handleDelete = useCallback(() => {
    Alert.alert(
      t("Delete post?", "Удалить пост?"),
      t("This action cannot be undone.", "Это действие нельзя отменить."),
      [
        { text: t("Cancel", "Отмена"), style: "cancel" },
        {
          text: t("Delete", "Удалить"),
          style: "destructive",
          onPress: () => deletePostMutation.mutate(),
        },
      ]
    );
  }, [deletePostMutation, language]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: t("Post", "Пост"),
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
      headerRight: () => {
        if (!isOwner) return null;
        
        return (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleEditPress();
            }}
            style={{
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="more-horizontal" size={24} color={theme.text} />
          </Pressable>
        );
      },
    });
  }, [navigation, isOwner, theme, handleDelete, postId, isArchived, unarchiveMutation, language]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      // Use the correct endpoint /api/posts/:id/like
      await apiRequest("POST", `/api/posts/${postId}/like`, { userId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "likes", currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] }); // Also invalidate main feed
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (savedData?.saved) {
        await apiRequest("DELETE", "/api/saves", { userId: currentUser?.id, postId });
      } else {
        await apiRequest("POST", "/api/saves", { userId: currentUser?.id, postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "saves", currentUser?.id] });
    },
  });

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const handleLike = () => {
    likeScale.value = withSpring(1.2, { damping: 4 }, () => {
      likeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    likeMutation.mutate();
  };

  const handleSave = () => {
    saveScale.value = withSpring(1.2, { damping: 4 }, () => {
      saveScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("Check out this post!", "Посмотрите этот пост!"),
      });
    } catch {
      // Silent fail
    }
  };

  const formattedDate = React.useMemo(() => {
    if (!post) return "";
    const date = new Date(post.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInHours * 60);
      return `${diffInMins}${t("m", "м")}`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}${t("h", "ч")}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}${t("d", "д")}`;
      return date.toLocaleDateString(language === "ru" ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
    }
  }, [post?.createdAt, language]);

  if (!post) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {t("Loading...", "Загрузка...")}
        </ThemedText>
      </ThemedView>
    );
  }

  if (isArchived) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />

          <Animated.View entering={FadeIn} style={styles.content}>
            <View style={styles.userRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Avatar emoji={postUser?.emoji || "🐸"} size={40} />
                <View style={styles.userInfo}>
                  <ThemedText type="body" style={styles.username} truncate maxLength={15}>
                    {postUser?.username || t("User", "Пользователь")}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {formattedDate}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.archiveNotice}>
              <Feather name="archive" size={20} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                {t("This post is archived", "Этот пост в архиве")}
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />

          <Animated.View entering={FadeIn} style={styles.content}>
            <View style={styles.userRow}>
              <Pressable
                onPress={() => navigation.navigate("UserProfile", { userId: post.userId })}
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Avatar emoji={postUser?.emoji || "🐸"} size={40} />
                <View style={styles.userInfo}>
                  <ThemedText type="body" style={styles.username} truncate maxLength={15}>
                    {postUser?.username || t("User", "Пользователь")}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {formattedDate}
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            {post.location ? (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                  {post.location}
                </ThemedText>
              </View>
            ) : null}

            {post.caption ? (
              <View style={styles.captionRow}>
                <ThemedText type="body" style={{ color: theme.text, lineHeight: 22 }}>
                  {post.caption}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.actions}>
              <AnimatedPressable onPress={handleLike} style={[styles.actionButton, likeAnimatedStyle]}>
                <Feather
                  name="heart"
                  size={24}
                  color={likedData?.liked ? theme.error : theme.textSecondary}
                />
                {likesData && likesData.count > 0 ? (
                  <ThemedText type="small" style={[styles.actionCount, { color: theme.textSecondary }]}>
                    {likesData.count}
                  </ThemedText>
                ) : null}
              </AnimatedPressable>

              {!isOwner && (
                <Pressable
                  onPress={() => navigation.navigate("Comments", { postId })}
                  style={styles.actionButton}
                >
                  <Feather name="message-circle" size={24} color={theme.textSecondary} />
                  {commentsData && commentsData.count > 0 ? (
                    <ThemedText type="small" style={[styles.actionCount, { color: theme.textSecondary }]}>
                      {commentsData.count}
                    </ThemedText>
                  ) : null}
                </Pressable>
              )}

              <View style={{ flex: 1 }} />

              <AnimatedPressable onPress={handleSave} style={[styles.actionButton, saveAnimatedStyle]}>
                <Feather
                  name="bookmark"
                  size={24}
                  color={savedData?.saved ? theme.link : theme.textSecondary}
                />
              </AnimatedPressable>
            </View>

            <Pressable
              onPress={() => navigation.navigate("Comments", { postId })}
              style={[styles.viewCommentsButton, { backgroundColor: theme.cardBackground }]}
            >
              <Feather name="message-square" size={16} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                {t("Comments", "Комментарии")}
              </ThemedText>
              <View style={{ flex: 1 }} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.xs }}>
                {commentsData?.count || 0}
              </ThemedText>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </ThemedView>

      <Modal
        visible={showActionMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <Pressable 
          style={styles.actionSheetOverlay} 
          onPress={() => setShowActionMenu(false)}
        >
          <ThemedView style={styles.actionSheetContainer}>
            <Pressable 
              style={styles.actionSheetItem}
              onPress={startEditing}
            >
              <Feather name="edit-2" size={20} color={theme.text} />
              <ThemedText style={{ marginLeft: Spacing.md }}>{t("Edit publication", "Редактировать публикацию")}</ThemedText>
            </Pressable>

            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: Spacing.xs, opacity: 0.5 }} />

            <Pressable 
              style={styles.actionSheetItem}
              onPress={() => {
                setShowActionMenu(false);
                handleDelete();
              }}
            >
              <Feather name="trash-2" size={20} color={theme.error} />
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.error }}>{t("Delete post", "Удалить пост")}</ThemedText>
            </Pressable>

            <Pressable 
              style={[styles.actionSheetItem, { marginTop: Spacing.xs }]}
              onPress={() => setShowActionMenu(false)}
            >
              <ThemedText style={{ width: '100%', textAlign: 'center', color: theme.textSecondary }}>{t("Cancel", "Отмена")}</ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowEditModal(false)}
        >
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">{t("Edit publication", "Редактировать публикацию")}</ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable 
                onPress={handlePickImage}
                style={[styles.imagePickerButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              >
                {isUpdatingImage ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <>
                    <Feather name="image" size={20} color={theme.accent} />
                    <ThemedText style={{ marginLeft: Spacing.sm, color: theme.text }}>
                      {t("Change photo", "Заменить фотографию")}
                    </ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable 
                onPress={handleGetLocation}
                disabled={isLocating}
                style={[styles.locationPicker, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Feather name="map-pin" size={18} color={isLocating ? theme.textSecondary : theme.accent} />
                  <ThemedText style={{ marginLeft: Spacing.sm, flex: 1, color: editedLocation ? theme.text : theme.textSecondary }}>
                    {isLocating ? t("Locating...", "Определяем...") : (editedLocation || t("Add location", "Добавить локацию"))}
                  </ThemedText>
                  {editedLocation && (
                    <Pressable onPress={() => { setEditedLocation(null); setEditedLat(null); setEditedLng(null); }} hitSlop={10}>
                      <Feather name="x" size={16} color={theme.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </Pressable>

              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, marginLeft: Spacing.xs }}>
                {t("Description", "Описание")}
              </ThemedText>
              <TextInput
                value={editedCaption}
                onChangeText={setEditedCaption}
                placeholder={t("Enter caption...", "Введите описание...")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.editInput, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                multiline
                maxLength={500}
              />

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: Spacing.md, opacity: 0.5 }} />

              {isArchived ? (
                <Pressable 
                  style={styles.actionSheetItem}
                  onPress={() => {
                    setShowEditModal(false);
                    unarchiveMutation.mutate();
                  }}
                >
                  <Feather name="arrow-up" size={20} color={theme.text} />
                  <ThemedText style={{ marginLeft: Spacing.md }}>{t("Restore from archive", "Восстановить из архива")}</ThemedText>
                </Pressable>
              ) : (
                <Pressable 
                  style={styles.actionSheetItem}
                  onPress={() => {
                    setShowEditModal(false);
                    archiveMutation.mutate();
                  }}
                >
                  <Feather name="archive" size={20} color={theme.text} />
                  <ThemedText style={{ marginLeft: Spacing.md }}>{t("Move to archive", "В архив")}</ThemedText>
                </Pressable>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable 
                onPress={handleSaveEdit}
                disabled={editMutation.isPending}
                style={[styles.saveButton, { backgroundColor: theme.link }]}
              >
                {editMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{t("Save", "Сохранить")}</ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
  },
  content: {
    padding: Spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  userInfo: {
    marginLeft: Spacing.sm,
  },
  username: {
    fontWeight: "500",
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  captionRow: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  actionCount: {
    marginLeft: Spacing.xs,
    fontWeight: "500",
  },
  viewCommentsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  archiveNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 120,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  editInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: Spacing.md,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
