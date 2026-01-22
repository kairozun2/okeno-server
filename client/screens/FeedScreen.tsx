import React, { useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, Pressable, Dimensions, FlatList } from "react-native";
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
}: {
  post: PostWithUser;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onUserPress: () => void;
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
    likeScale.value = withSpring(1.2, { damping: 4 }, () => {
      likeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLike();
  };

  const handleSave = () => {
    saveScale.value = withSpring(1.2, { damping: 4 }, () => {
      saveScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  };

  return (
    <Animated.View entering={FadeIn.delay(50)} style={styles.postCard}>
      <Pressable onPress={onUserPress} style={styles.postHeader}>
        <Avatar emoji={post.user?.emoji || "🐸"} size={32} />
        <View style={styles.postHeaderInfo}>
          <ThemedText type="small" style={styles.username}>
            {post.user?.username || "User"}
          </ThemedText>
          {post.location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={10} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 2 }}>
                {post.location}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru })}
        </ThemedText>
      </Pressable>

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.postImage}
        contentFit="cover"
        transition={150}
      />

      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <AnimatedPressable onPress={handleLike} style={[styles.actionButton, likeAnimatedStyle]}>
            <Feather
              name="heart"
              size={20}
              color={post.isLiked ? theme.error : theme.textSecondary}
            />
          </AnimatedPressable>

          <Pressable onPress={onComment} style={styles.actionButton}>
            <Feather name="message-circle" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Feather name="send" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <AnimatedPressable onPress={handleSave} style={[styles.actionButton, saveAnimatedStyle]}>
          <Feather
            name="bookmark"
            size={20}
            color={post.isSaved ? theme.link : theme.textSecondary}
          />
        </AnimatedPressable>
      </View>

      {post.likesCount > 0 ? (
        <ThemedText type="small" style={styles.likesText}>
          {post.likesCount} {post.likesCount === 1 ? "лайк" : "лайков"}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

function EmptyFeed() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="camera" size={40} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        Пока нет публикаций
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Будьте первыми, кто поделится моментом!
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

  const { data: posts = [] } = useQuery<Post[]>({
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
          onLike={() => likeMutation.mutate({ postId: item.id, isLiked: postWithMeta.isLiked })}
          onSave={() => saveMutation.mutate({ postId: item.id, isSaved: postWithMeta.isSaved })}
          onComment={() => navigation.navigate("Comments", { postId: item.id })}
          onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        />
      );
    },
    [user, navigation, likeMutation, saveMutation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        }
        ListEmptyComponent={<EmptyFeed />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postCard: {
    marginHorizontal: Spacing.sm,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  postHeaderInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  username: {
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  postImage: {
    width: SCREEN_WIDTH - Spacing.sm * 2,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  leftActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  likesText: {
    fontWeight: "500",
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: "center",
  },
});
