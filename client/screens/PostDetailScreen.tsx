import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Share, Alert } from "react-native";
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
import { ru } from "date-fns/locale";

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
  location: string | null;
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
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

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
      Alert.alert("Ошибка", "Не удалось удалить публикацию");
    },
  });

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Удалить публикацию?",
      "Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => deletePostMutation.mutate(),
        },
      ]
    );
  }, [deletePostMutation]);

  useEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingRight: -8 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("EditPost", { postId });
              }}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                marginRight: -2,
                backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
              })}
            >
              <Feather name="edit-2" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleDelete();
              }}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
              })}
            >
              <Feather name="trash-2" size={20} color={theme.error} />
            </Pressable>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: undefined
      });
    }
  }, [isOwner, navigation, theme.error, theme.text, handleDelete, postId]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (likedData?.liked) {
        await apiRequest("DELETE", "/api/likes", { userId: currentUser?.id, postId });
      } else {
        await apiRequest("POST", "/api/likes", { userId: currentUser?.id, postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "likes", currentUser?.id] });
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
        message: `Посмотри эту публикацию!`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const { data: archivedData } = useQuery<string[]>({
    queryKey: ["/api/users", currentUser?.id, "archived"],
    enabled: !!currentUser?.id,
  });

  const isArchived = archivedData?.includes(postId);

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${currentUser?.id}/archived/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "archived"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  if (!post) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Загрузка...
        </ThemedText>
      </ThemedView>
    );
  }

  if (isArchived) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <Feather name="archive" size={48} color={theme.textSecondary} style={{ marginBottom: Spacing.md }} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
          Публикация в архиве
        </ThemedText>
        <Pressable
          onPress={() => unarchiveMutation.mutate()}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }]
          })}
        >
          <Feather name="rotate-ccw" size={24} color={theme.link} />
        </Pressable>
      </ThemedView>
    );
  }

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
            <Pressable
              onPress={() => navigation.navigate("UserProfile", { userId: post.userId })}
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Avatar emoji={postUser?.emoji || "🐸"} size={40} />
              <View style={styles.userInfo}>
                <ThemedText type="body" style={styles.username} truncate maxLength={15}>
                  {postUser?.username || "Пользователь"}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru })}
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

            <Pressable onPress={handleShare} style={styles.actionButton}>
              <Feather name="share" size={24} color={theme.textSecondary} />
            </Pressable>

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
              Комментарии
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
});
