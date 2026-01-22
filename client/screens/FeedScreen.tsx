import React, { useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, Pressable, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  location: string | null;
  createdAt: string;
}

interface PostWithUser extends Post {
  user?: {
    id: string;
    username: string;
    emoji: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PostCard({
  post,
  onLike,
  onSave,
  onComment,
  onUserPress,
  currentUserId,
}: {
  post: PostWithUser;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onUserPress: () => void;
  currentUserId: string;
}) {
  const { theme } = useTheme();
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

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
    onLike();
  };

  const handleSave = () => {
    saveScale.value = withSpring(1.3, { damping: 3 }, () => {
      saveScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  };

  return (
    <Animated.View
      entering={FadeIn.delay(100)}
      style={[styles.postCard, { backgroundColor: theme.cardBackground }]}
    >
      <Pressable onPress={onUserPress} style={styles.postHeader}>
        <Avatar emoji={post.user?.emoji || "🐸"} size={40} />
        <View style={styles.postHeaderInfo}>
          <ThemedText type="body" style={styles.username}>
            {post.user?.username || "User"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </ThemedText>
        </View>
      </Pressable>

      {post.location ? (
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            {post.location}
          </ThemedText>
        </View>
      ) : null}

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.postImage}
        contentFit="cover"
        transition={300}
      />

      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <AnimatedPressable
            onPress={handleLike}
            style={[styles.actionButton, likeAnimatedStyle]}
          >
            <Feather
              name={post.isLiked ? "heart" : "heart"}
              size={24}
              color={post.isLiked ? theme.error : theme.text}
              style={{ opacity: post.isLiked ? 1 : 0.8 }}
            />
            {post.likesCount > 0 ? (
              <ThemedText type="small" style={styles.actionCount}>
                {post.likesCount}
              </ThemedText>
            ) : null}
          </AnimatedPressable>

          <Pressable onPress={onComment} style={styles.actionButton}>
            <Feather name="message-circle" size={24} color={theme.text} style={{ opacity: 0.8 }} />
            {post.commentsCount > 0 ? (
              <ThemedText type="small" style={styles.actionCount}>
                {post.commentsCount}
              </ThemedText>
            ) : null}
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Feather name="share" size={24} color={theme.text} style={{ opacity: 0.8 }} />
          </Pressable>
        </View>

        <AnimatedPressable
          onPress={handleSave}
          style={[styles.actionButton, saveAnimatedStyle]}
        >
          <Feather
            name={post.isSaved ? "bookmark" : "bookmark"}
            size={24}
            color={post.isSaved ? theme.accent : theme.text}
            style={{ opacity: post.isSaved ? 1 : 0.8 }}
          />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function EmptyFeed() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="camera" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Posts Yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Be the first to share a moment!
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "FeedTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function FeedScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await apiRequest("DELETE", "/api/likes", { userId: user?.id, postId });
      } else {
        await apiRequest("POST", "/api/likes", { userId: user?.id, postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      if (isSaved) {
        await apiRequest("DELETE", "/api/saves", { userId: user?.id, postId });
      } else {
        await apiRequest("POST", "/api/saves", { userId: user?.id, postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    setRefreshing(false);
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      const postWithMeta: PostWithUser = {
        ...item,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        isSaved: false,
      };

      return (
        <PostCard
          post={postWithMeta}
          currentUserId={user?.id || ""}
          onLike={() => likeMutation.mutate({ postId: item.id, isLiked: postWithMeta.isLiked })}
          onSave={() => saveMutation.mutate({ postId: item.id, isSaved: postWithMeta.isSaved })}
          onComment={() =>
            navigation.navigate("Comments", { postId: item.id })
          }
          onUserPress={() =>
            navigation.navigate("UserProfile", { userId: item.userId })
          }
        />
      );
    },
    [user, navigation, likeMutation, saveMutation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={posts}
        renderItem={renderItem}
        estimatedItemSize={400}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.lg,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ListEmptyComponent={<EmptyFeed />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  postHeaderInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  username: {
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  leftActions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionCount: {
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["6xl"],
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
});
