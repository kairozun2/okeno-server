import React, { useState, useCallback, useMemo } from "react";
import { Share, View, StyleSheet, Pressable, Dimensions, Modal, Platform, Alert, TextInput } from "react-native";
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
  navigation,
  onBlock,
  onReport,
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
    likeScale.value = withSpring(1.2, { damping: 10, stiffness: 200 }, () => {
      likeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLike();
  };

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
      const shareUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/post/${post.id}`;
      await Share.share({
        message: `Check out this moment on Moments: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing:", error);
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
      return `${diffInMins}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  }, [post.createdAt]);

  const [showActions, setShowActions] = useState(false);

  return (
    <Animated.View entering={FadeIn.delay(50)} style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable onPress={onUserPress} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
        </Pressable>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        animationType="slide"
        onRequestClose={() => setShowActions(false)}
      >
        <Pressable 
          style={styles.actionSheetOverlay} 
          onPress={() => setShowActions(false)}
        >
          <ThemedView style={styles.actionSheetContainer}>
            <Pressable 
              style={styles.actionSheetItem}
              onPress={() => {
                setShowActions(false);
                onReport();
              }}
            >
              <Feather name="flag" size={20} color={theme.error} />
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.error }}>Report</ThemedText>
            </Pressable>

            <Pressable 
              style={styles.actionSheetItem}
              onPress={() => {
                setShowActions(false);
                onBlock();
              }}
            >
              <Feather name="slash" size={20} color={theme.error} />
              <ThemedText style={{ marginLeft: Spacing.md, color: theme.error }}>Block</ThemedText>
            </Pressable>

            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: Spacing.xs, opacity: 0.5 }} />

            <Pressable 
              style={[styles.actionSheetItem, { marginTop: Spacing.xs }]}
              onPress={() => setShowActions(false)}
            >
              <ThemedText style={{ width: "100%", textAlign: "center", color: theme.textSecondary }}>Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Modal>

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.postImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
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
          <Pressable 
            onPress={handleShare}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
          >
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
        No posts yet
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
  const { user: currentUser } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
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
      Alert.alert("Report sent", "We will review your report within 24 hours.");
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
      Alert.alert("User blocked", "You will no longer see content from this user.");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleReport = () => {
    if (!reportCategory) {
      Alert.alert("Error", "Please select a report category");
      return;
    }
    reportMutation.mutate();
  };

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
        navigation={navigation}
        onLike={() => likeMutation.mutate({ postId: item.id, isLiked: item.isLiked })}
        onSave={() => saveMutation.mutate({ postId: item.id, isSaved: item.isSaved })}
        onComment={() => navigation.navigate("Comments", { postId: item.id })}
        onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        onBlock={() => {
          Alert.alert(
            "Block user?",
            "You will no longer see content from this user.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Block", style: "destructive", onPress: () => blockMutation.mutate(item.userId) }
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
            <View style={[styles.modalHeader, { paddingTop: Spacing.sm }]}>
              <ThemedText type="h4">Report</ThemedText>
              <Pressable onPress={() => setShowReportModal(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={{ padding: Spacing.md }}>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                Select a report category:
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
                      {cat.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="Additional details (optional)..."
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
                  {reportMutation.isPending ? "Sending..." : "Send"}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </Pressable>
      </Modal>

      <FlashList
        data={posts}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
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
               Maps are available in the Moments app via Expo Go on your device.
             </ThemedText>
             {selectedLocation && (
               <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }}>
                 Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
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
});
