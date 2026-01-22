import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
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
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
    likeScale.value = withSpring(1.3, { damping: 3 }, () => {
      likeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    likeMutation.mutate();
  };

  const handleSave = () => {
    saveScale.value = withSpring(1.3, { damping: 3 }, () => {
      saveScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this post!`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (!post) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Loading...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        <Animated.View entering={FadeIn} style={styles.content}>
          <Pressable
            onPress={() => navigation.navigate("UserProfile", { userId: post.userId })}
            style={styles.userRow}
          >
            <Avatar emoji={postUser?.emoji || "🐸"} size={48} />
            <View style={styles.userInfo}>
              <ThemedText type="body" style={styles.username}>
                {postUser?.username || "User"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </ThemedText>
            </View>
          </Pressable>

          {post.location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                {post.location}
              </ThemedText>
              <Pressable style={[styles.translateButton, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="globe" size={14} color={theme.link} />
                <ThemedText type="caption" style={{ color: theme.link, marginLeft: 4 }}>
                  Translate
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actions}>
            <AnimatedPressable onPress={handleLike} style={[styles.actionButton, likeAnimatedStyle]}>
              <Feather
                name="heart"
                size={28}
                color={likedData?.liked ? theme.error : theme.text}
                style={{ opacity: likedData?.liked ? 1 : 0.8 }}
              />
              {likesData && likesData.count > 0 ? (
                <ThemedText type="small" style={styles.actionCount}>
                  {likesData.count}
                </ThemedText>
              ) : null}
            </AnimatedPressable>

            <Pressable
              onPress={() => navigation.navigate("Comments", { postId })}
              style={styles.actionButton}
            >
              <Feather name="message-circle" size={28} color={theme.text} style={{ opacity: 0.8 }} />
              {commentsData && commentsData.count > 0 ? (
                <ThemedText type="small" style={styles.actionCount}>
                  {commentsData.count}
                </ThemedText>
              ) : null}
            </Pressable>

            <Pressable onPress={handleShare} style={styles.actionButton}>
              <Feather name="share" size={28} color={theme.text} style={{ opacity: 0.8 }} />
            </Pressable>

            <View style={{ flex: 1 }} />

            <AnimatedPressable onPress={handleSave} style={[styles.actionButton, saveAnimatedStyle]}>
              <Feather
                name="bookmark"
                size={28}
                color={savedData?.saved ? theme.accent : theme.text}
                style={{ opacity: savedData?.saved ? 1 : 0.8 }}
              />
            </AnimatedPressable>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Comments", { postId })}
            style={[styles.viewCommentsButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="message-square" size={18} color={theme.text} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              View Comments
            </ThemedText>
            <View style={{ flex: 1 }} />
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
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
    padding: Spacing.lg,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  userInfo: {
    marginLeft: Spacing.md,
  },
  username: {
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.xl,
  },
  actionCount: {
    marginLeft: Spacing.xs,
    fontWeight: "500",
  },
  viewCommentsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
