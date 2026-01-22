import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Dimensions, Modal, Platform } from "react-native";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
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

interface PostWithUser extends Post {
  user?: User;
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
  onLocationPress,
}: {
  post: PostWithUser;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onUserPress: () => void;
  onLocationPress: () => void;
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

  const truncatedLocation = post.location && post.location.length > 20 
    ? post.location.substring(0, 20) + "..." 
    : post.location;

  return (
    <Animated.View entering={FadeIn.delay(50)} style={styles.postCard}>
      <Pressable onPress={onUserPress} style={styles.postHeader}>
        <Avatar emoji={post.user?.emoji || "🐸"} size={32} />
        <View style={styles.postHeaderInfo}>
          <ThemedText type="small" style={styles.username} truncate maxLength={12}>
            {post.user?.username || "..."}
          </ThemedText>
          {post.location ? (
            <Pressable onPress={onLocationPress} style={styles.locationRow}>
              <Feather name="map-pin" size={10} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 2 }}>
                {truncatedLocation}
              </ThemedText>
            </Pressable>
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
          <AnimatedPressable onPress={handleLike} style={[styles.actionButton, likeAnimatedStyle, { backgroundColor: post.isLiked ? theme.error + '15' : theme.backgroundSecondary }]}>
            <Feather
              name="heart"
              size={18}
              color={post.isLiked ? theme.error : theme.textSecondary}
            />
            {post.likesCount > 0 && (
              <ThemedText type="small" style={[styles.actionText, { color: post.isLiked ? theme.error : theme.textSecondary }]}>
                {post.likesCount}
              </ThemedText>
            )}
          </AnimatedPressable>

          <Pressable onPress={onComment} style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={18} color={theme.textSecondary} />
            {post.commentsCount > 0 && (
              <ThemedText type="small" style={styles.actionText}>
                {post.commentsCount}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.rightActions}>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="send" size={18} color={theme.textSecondary} />
          </Pressable>

          <AnimatedPressable onPress={handleSave} style={[styles.actionButton, saveAnimatedStyle, { backgroundColor: post.isSaved ? theme.link + '15' : theme.backgroundSecondary, marginLeft: Spacing.sm }]}>
            <Feather
              name="bookmark"
              size={18}
              color={post.isSaved ? theme.link : theme.textSecondary}
            />
          </AnimatedPressable>
        </View>
      </View>
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
  const { user: currentUser } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);

  const { data: posts = [], isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await apiRequest("DELETE", "/api/likes", { userId: currentUser?.id, postId });
      } else {
        await apiRequest("POST", "/api/likes", { userId: currentUser?.id, postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      if (isSaved) {
        await apiRequest("DELETE", "/api/saves", { userId: currentUser?.id, postId });
      } else {
        await apiRequest("POST", "/api/saves", { userId: currentUser?.id, postId });
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
    ({ item }: { item: PostWithUser }) => (
      <PostCard
        post={item}
        onLike={() => likeMutation.mutate({ postId: item.id, isLiked: item.isLiked })}
        onSave={() => saveMutation.mutate({ postId: item.id, isSaved: item.isSaved })}
        onComment={() => navigation.navigate("Comments", { postId: item.id })}
        onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        onLocationPress={() => {
          if (item.latitude && item.longitude) {
            setSelectedLocation({
              lat: parseFloat(item.latitude),
              lng: parseFloat(item.longitude),
              name: item.location || ""
            });
            setMapModalVisible(true);
          }
        }}
      />
    ),
    [currentUser, navigation, likeMutation, saveMutation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={posts}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        estimatedItemSize={450}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={!isLoading ? <EmptyFeed /> : null}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <ThemedView style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { paddingTop: Spacing.md }]}>
            <ThemedText type="h4">{selectedLocation?.name}</ThemedText>
            <Pressable onPress={() => setMapModalVisible(false)} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
             <Feather name="map" size={48} color={theme.textSecondary} />
             <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
               Карты доступны в приложении Moments через Expo Go на вашем устройстве.
             </ThemedText>
             {selectedLocation && (
               <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }}>
                 Координаты: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
               </ThemedText>
             )}
          </View>
        </ThemedView>
      </Modal>
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
    gap: Spacing.sm,
  },
  rightActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 6,
  },
  actionText: {
    fontWeight: "600",
    fontSize: 13,
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
});
