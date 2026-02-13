import React, { useState, useCallback, useMemo, useLayoutEffect } from "react";
import { Share, View, StyleSheet, Pressable, Dimensions, Modal, Platform, Alert, TextInput, ScrollView, ActivityIndicator, Linking } from "react-native";
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
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

import { BlurView } from "expo-blur";
import { MapContent } from "@/components/MapContent";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getImageUrl, getApiUrl, getShareUrl } from "@/lib/query-client";
import { fetchAndCacheFeed } from "@/lib/sync";
import * as Database from "@/lib/database";
import { useIsOnline } from "@/hooks/useNetworkStatus";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useRefresh } from "@/contexts/RefreshContext";
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
  caption: string | null;
  feeling: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  emoji: string;
  isVerified?: boolean;
}

interface PostWithUser extends Post {
  user?: User;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  caption: string | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PostCard({
  post,
  onLike,
  onSave,
  onComment,
  onUserPress,
  onLocationPress,
  navigation,
  onBlock,
  onReport,
  t,
  onCaptionPress,
}: {
  post: PostWithUser;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onUserPress: () => void;
  onLocationPress: () => void;
  navigation: any;
  onBlock: () => void;
  onReport: () => void;
  t: (en: string, ru: string) => string;
  onCaptionPress: (post: PostWithUser) => void;
}) {
  const { theme, language } = useTheme();
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const heartOverlayStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
  }));

  const handleLike = () => {
    likeScale.value = withSpring(1.2, { damping: 10, stiffness: 200 }, () => {
      likeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLike();
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (!post.isLiked) {
        runOnJS(handleLike)();
      }
      heartOpacity.value = withSequence(
        withSpring(1, { damping: 15, stiffness: 300 }),
        withDelay(400, withSpring(0, { damping: 15, stiffness: 300 }))
      );
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
    });

  const handleSave = () => {
    saveScale.value = withSpring(1.2, { damping: 10, stiffness: 200 }, () => {
      saveScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const shareUrl = getShareUrl(`/post/${post.id}`);
      await Share.share({
        message: `Check out this moment on Okeno: ${shareUrl}`,
      });
    } catch {
      // Silent fail
    }
  };

  const truncatedLocation = post.location && post.location.length > 20 
    ? post.location.substring(0, 20) + "..." 
    : post.location;

  const formattedDate = useMemo(() => {
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
  }, [post.createdAt, language]);

  const [showActions, setShowActions] = useState(false);

  return (
    <Animated.View entering={FadeIn.delay(50)} style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable onPress={onUserPress} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar emoji={post.user?.emoji || "🐸"} size={32} />
          <View style={styles.postHeaderInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText type="small" style={[styles.username, { marginRight: 4 }, (post.user as any)?.usernameColor ? { color: (post.user as any).usernameColor } : null]} truncate maxLength={12}>
                {post.user?.username || "..."}
              </ThemedText>
              {post.user?.isVerified ? <VerifiedBadge size={14} /> : null}
              {(post.user as any)?.isPremium ? <PremiumBadge size={12} /> : null}
            </View>
            {post.location ? (
              <Pressable onPress={onLocationPress} style={styles.locationRow}>
                <Feather name="map-pin" size={10} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 2 }}>
                  {truncatedLocation}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {post.feeling ? (
            <ThemedText style={{ fontSize: 14, marginRight: 4 }}>
              {post.feeling}
            </ThemedText>
          ) : null}
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: Spacing.xs }}>
            {formattedDate}
          </ThemedText>
          <Pressable 
            onPress={() => setShowActions(true)}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <Feather name="more-horizontal" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <View style={styles.actionSheetOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFillObject} 
            onPress={() => setShowActions(false)}
          />
          <Animated.View 
            entering={FadeIn}
            style={[styles.actionSheetContainer, { backgroundColor: theme.backgroundRoot }]}
          >
            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActions(false);
                setTimeout(() => onReport(), 100);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name="flag" size={20} color={theme.error} />
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.error, fontSize: 16, fontWeight: "500" }}>{t("Report", "Пожаловаться")}</ThemedText>
            </Pressable>

            <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: Spacing.md }} />

            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActions(false);
                setTimeout(() => onBlock(), 100);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name="slash" size={20} color={theme.error} />
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.error, fontSize: 16, fontWeight: "500" }}>{t("Block", "Заблокировать")}</ThemedText>
            </Pressable>

            <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: Spacing.md }} />

            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActions(false);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.textSecondary, fontSize: 16, fontWeight: "500" }}>{t("Cancel", "Отмена")}</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <GestureDetector gesture={doubleTapGesture}>
        <View style={styles.imageContainer}>
          {getImageUrl(post.imageUrl) ? (
            <Image
              source={{ uri: getImageUrl(post.imageUrl) }}
              style={styles.postImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onError={(e) => console.log(`Feed image load error for ${post.id}:`, e)}
            />
          ) : (
            <View style={[styles.postImage, { backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
              <Feather name="image" size={48} color={theme.textSecondary} />
            </View>
          )}
          <Animated.View style={[styles.heartOverlay, heartOverlayStyle]}>
            <Feather name="heart" size={80} color="#fff" />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <AnimatedPressable onPress={handleLike} style={[styles.actionButton, likeAnimatedStyle, { backgroundColor: post.isLiked ? theme.error + '15' : theme.backgroundSecondary }]}>
            <Feather
              name="heart"
              size={18}
              color={post.isLiked ? theme.error : theme.textSecondary}
              style={{ includeFontPadding: false }}
            />
            {post.likesCount > 0 && (
              <ThemedText type="small" style={[styles.actionText, { color: post.isLiked ? theme.error : theme.textSecondary }]}>
                {post.likesCount}
              </ThemedText>
            )}
          </AnimatedPressable>

          <Pressable onPress={onComment} style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={18} color={theme.textSecondary} style={{ includeFontPadding: false }} />
            {post.commentsCount > 0 && (
              <ThemedText type="small" style={styles.actionText}>
                {post.commentsCount}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.rightActions}>
          <AnimatedPressable onPress={handleSave} style={[styles.actionButton, saveAnimatedStyle, { backgroundColor: post.isSaved ? theme.link + '15' : theme.backgroundSecondary }]}>
            <Feather
              name={post.isSaved ? "check" : "bookmark"}
              size={18}
              color={post.isSaved ? theme.link : theme.textSecondary}
              style={{ includeFontPadding: false }}
            />
          </AnimatedPressable>
        </View>
      </View>

      {post.caption ? (
        <Pressable 
          onPress={() => onCaptionPress(post)}
          style={styles.captionContainer}
        >
          <ThemedText 
            type="small" 
            style={{ color: theme.text, flex: 1 }}
            numberOfLines={1}
          >
            {post.caption}
          </ThemedText>
          {post.caption.length > 40 ? (
            <ThemedText type="caption" style={{ color: theme.link, marginLeft: Spacing.xs, fontWeight: "600" }}>
              {t("more", "ещё")}
            </ThemedText>
          ) : null}
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function EmptyFeed({ t }: { t: (en: string, ru: string) => string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="camera" size={40} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        {t("No posts yet", "Постов пока нет")}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        {t("Be the first to share a moment!", "Станьте первым, кто поделится моментом!")}
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "FeedTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function FeedScreen({ navigation }: Props) {
  const { theme, language, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const headerHeight = useHeaderHeight() || 64;
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { setFeedRefreshing: setRefreshStatus } = useRefresh();

  const [selectedMessage, setSelectedMessage] = useState<PostWithUser | null>(null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  useLayoutEffect(() => {
    // We let MainTabNavigator handle the headerTitle with HeaderTitle component
    // but we can still set headerLeft here if needed, or just let the navigator handle it.
  }, [navigation, language]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportCategory, setReportCategory] = useState<string | null>(null);
  const [reportedPostId, setReportedPostId] = useState<string | null>(null);
  const [reportedUserId, setReportedUserId] = useState<string | null>(null);

  const REPORT_CATEGORIES = [
    { id: "spam", label: "Spam" },
    { id: "harassment", label: "Harassment" },
    { id: "sexual", label: "Sexual content" },
    { id: "violence", label: "Violence" },
    { id: "other", label: "Other" },
  ];

  const reportMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reports", {
        reporterId: currentUser?.id,
        reportedUserId: reportedUserId,
        reportedPostId: reportedPostId,
        reason: reportCategory ? `${REPORT_CATEGORIES.find(c => c.id === reportCategory)?.label}: ${reportReason}` : reportReason,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("Report sent", "Жалоба отправлена"), t("We will review your report within 24 hours.", "Мы рассмотрим вашу жалобу в течение 24 часов."));
      setShowReportModal(false);
      setReportReason("");
      setReportCategory(null);
      setReportedPostId(null);
      setReportedUserId(null);
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (userIdToBlock: string) => {
      await apiRequest("POST", `/api/users/${currentUser?.id}/blocked`, {
        blockedUserId: userIdToBlock,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("User blocked", "Пользователь заблокирован"), t("You will no longer see content from this user.", "Вы больше не увидите контент от этого пользователя."));
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleReport = () => {
    if (!reportCategory) {
      Alert.alert(t("Error", "Ошибка"), t("Please select a report category", "Выберите категорию жалобы"));
      return;
    }
    reportMutation.mutate();
  };

  const PAGE_SIZE = 10;
  const [allPosts, setAllPosts] = useState<PostWithUser[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const {
    data: initialPosts,
    isLoading,
    refetch,
  } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts", "initial"],
    queryFn: async () => {
      try {
        const posts = await fetchAndCacheFeed(currentUser?.id || "", PAGE_SIZE, 0);
        const postsArray = Array.isArray(posts) ? posts : [];
        setAllPosts(postsArray);
        setCurrentOffset(postsArray.length);
        setHasMore(postsArray.length >= PAGE_SIZE);
        return postsArray;
      } catch (error) {
        console.log("Feed fetch error, trying local database:", error);
        const localPosts = await Database.getPosts(PAGE_SIZE, 0);
        setAllPosts(localPosts as PostWithUser[]);
        setCurrentOffset(localPosts.length);
        setHasMore(localPosts.length >= PAGE_SIZE);
        return localPosts as PostWithUser[];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const postsData = allPosts.length > 0 ? allPosts : (initialPosts || []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore || isLoading) return;
    
    setIsFetchingMore(true);
    try {
      const newPosts = await fetchAndCacheFeed(currentUser?.id || "", PAGE_SIZE, currentOffset);
      const postsArray = Array.isArray(newPosts) ? newPosts : [];
      
      if (postsArray.length < PAGE_SIZE) {
        setHasMore(false);
      }
      
      setAllPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = postsArray.filter((p: PostWithUser) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setCurrentOffset(prev => prev + postsArray.length);
    } catch (error) {
      console.error("Failed to load more posts:", error);
      const localPosts = await Database.getPosts(PAGE_SIZE, currentOffset);
      if (localPosts.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setAllPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = (localPosts as PostWithUser[]).filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setCurrentOffset(prev => prev + localPosts.length);
    } finally {
      setIsFetchingMore(false);
    }
  }, [hasMore, isFetchingMore, isLoading, currentOffset, currentUser?.id]);


  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      // Use the correct endpoint /api/posts/:id/like
      await apiRequest("POST", `/api/posts/${postId}/like`, { userId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      await apiRequest("POST", "/api/saves", { userId: currentUser?.id, postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "saved"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshStatus(true);
    setCurrentOffset(0);
    setHasMore(true);
    setAllPosts([]);
    await refetch();
    setRefreshing(false);
    setRefreshStatus(false);
  }, [refetch, setRefreshStatus]);

  const renderItem = useCallback(
    ({ item }: { item: PostWithUser }) => (
      <PostCard
        post={item}
        navigation={navigation}
        onLike={() => likeMutation.mutate({ postId: item.id, isLiked: item.isLiked })}
        onSave={() => saveMutation.mutate({ postId: item.id, isSaved: item.isSaved })}
        onComment={() => navigation.navigate("Comments", { postId: item.id })}
        onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        onCaptionPress={(post) => setSelectedMessage(post)}
        t={t}
        onBlock={() => {
          Alert.alert(
            t("Block user?", "Заблокировать?"),
            t("You will no longer see content from this user.", "Вы больше не увидите контент от этого пользователя."),
            [
              { text: t("Cancel", "Отмена"), style: "cancel" },
              { text: t("Block", "Блок"), style: "destructive", onPress: () => blockMutation.mutate(item.userId) }
            ]
          );
        }}
        onReport={() => {
          setReportedPostId(item.id);
          setReportedUserId(item.userId);
          setShowReportModal(true);
        }}
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
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable 
          style={[styles.actionSheetOverlay, { justifyContent: 'center', padding: Spacing.xl }]} 
          onPress={() => setShowReportModal(false)}
        >
          <ThemedView style={[styles.actionSheetContainer, { borderRadius: BorderRadius.xl, paddingBottom: Spacing.xl }]}>
            <View style={[styles.modalHeader, { paddingTop: Spacing.xs }]}>
              <ThemedText type="h4">{t("Report", "Пожаловаться")}</ThemedText>
              <Pressable onPress={() => setShowReportModal(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={{ padding: Spacing.md }}>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                {t("Select a report category:", "Выберите категорию жалобы:")}
              </ThemedText>

              <View style={styles.categoriesGrid}>
                {REPORT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setReportCategory(cat.id)}
                    style={[
                      styles.categoryItem,
                      { 
                        backgroundColor: reportCategory === cat.id ? theme.accent + '20' : theme.backgroundSecondary,
                        borderColor: reportCategory === cat.id ? theme.accent : theme.border,
                      }
                    ]}
                  >
                    <ThemedText 
                      type="small" 
                      style={{ 
                        color: reportCategory === cat.id ? theme.accent : theme.text,
                        fontWeight: reportCategory === cat.id ? "600" : "400",
                      }}
                    >
                      {t(cat.label, cat.id === "spam" ? "Спам" : cat.id === "harassment" ? "Преследование" : cat.id === "sexual" ? "Сексуальный контент" : cat.id === "violence" ? "Насилие" : "Другое")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t("Additional details (optional)...", "Дополнительные детали (необязательно)...")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.reportInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                    height: 80,
                  },
                ]}
                multiline
              />

              <Pressable
                onPress={handleReport}
                style={[styles.reportSubmitButton, { backgroundColor: theme.error }]}
                disabled={reportMutation.isPending}
              >
                <ThemedText style={{ color: "white", fontWeight: "600" }}>
                  {reportMutation.isPending ? t("Sending...", "Отправка...") : t("Send", "Отправить")}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </Pressable>
      </Modal>

      <FlashList
        data={postsData}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? <EmptyFeed t={t} /> : null}
        ListFooterComponent={isFetchingMore ? (
          <View style={{ paddingVertical: Spacing.lg, alignItems: "center" }}>
            <ActivityIndicator size="small" />
          </View>
        ) : null}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1 }}>
            {selectedLocation ? (
              <MapContent lat={selectedLocation.lat} lng={selectedLocation.lng} name={selectedLocation.name} isDark={isDark} />
            ) : null}
          </View>
          {selectedLocation ? (
            <>
              <View style={{ position: 'absolute', top: Spacing.sm + insets.top, left: Spacing.lg, borderRadius: 22, overflow: 'hidden', zIndex: 2 }}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ padding: 10 }}>
                    <Pressable onPress={() => setMapModalVisible(false)} hitSlop={10}>
                      <Feather name="x" size={20} color={theme.text} />
                    </Pressable>
                  </BlurView>
                ) : (
                  <View style={{ padding: 10, backgroundColor: isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)' }}>
                    <Pressable onPress={() => setMapModalVisible(false)} hitSlop={10}>
                      <Feather name="x" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                )}
              </View>
              <View style={{ position: 'absolute', top: Spacing.sm + insets.top, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 72, pointerEvents: 'none' }}>
                <View style={{ borderRadius: 22, overflow: 'hidden', maxWidth: '100%' }}>
                  {Platform.OS === 'ios' ? (
                    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
                      <Feather name="map-pin" size={14} color={theme.textSecondary} />
                      <ThemedText numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>{selectedLocation.name}</ThemedText>
                    </BlurView>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)' }}>
                      <Feather name="map-pin" size={14} color={theme.textSecondary} />
                      <ThemedText numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>{selectedLocation.name}</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : null}
          {selectedLocation ? (
            <View style={{ position: 'absolute', bottom: Spacing.xl + insets.bottom, left: 0, right: 0, alignItems: 'center' }}>
              <Pressable
                onPress={() => {
                  if (!selectedLocation) return;
                  const { lat, lng, name } = selectedLocation;
                  const label = encodeURIComponent(name || `${lat},${lng}`);
                  const url = Platform.select({
                    ios: `maps:0,0?q=${label}@${lat},${lng}`,
                    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
                    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                  });
                  if (url) Linking.openURL(url).catch(() => {});
                }}
                style={{ borderRadius: 22, overflow: 'hidden' }}
              >
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 }}>
                    <Feather name="navigation" size={16} color={theme.text} />
                    <ThemedText style={{ fontWeight: '600' }}>
                      {t("Open in Maps", "Открыть в Картах")}
                    </ThemedText>
                  </BlurView>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8, backgroundColor: isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)' }}>
                    <Feather name="navigation" size={16} color={theme.text} />
                    <ThemedText style={{ fontWeight: '600' }}>
                      {t("Open in Maps", "Открыть в Картах")}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={!!selectedMessage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <ThemedView style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { paddingTop: Spacing.md }]}>
            <ThemedText type="h4">{t("Description", "Описание")}</ThemedText>
            <Pressable onPress={() => setSelectedMessage(null)} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <ThemedText type="body" style={{ lineHeight: 24 }}>
              {selectedMessage?.caption}
            </ThemedText>
          </ScrollView>
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
  imageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - Spacing.sm * 2,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
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
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContainer: {
    width: "100%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
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
  categoryItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reportInput: {
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    borderWidth: 1,
    textAlignVertical: "top",
    marginBottom: Spacing.md,
  },
  reportSubmitButton: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  captionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  captionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  captionModalContent: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "60%",
  },
  captionModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
});
