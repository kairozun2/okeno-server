import React, { useState, useCallback, useLayoutEffect } from "react";
import { Share, View, StyleSheet, RefreshControl, Pressable, Dimensions, Alert, FlatList, Modal, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const HEADER_TRIGGER_HEIGHT = 100;

interface User {
  id: string;
  username: string;
  emoji: string;
  isVerified?: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  location: string | null;
  createdAt: string;
}

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { theme, language } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportCategory, setReportCategory] = useState<string | null>(null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

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
        reportedUserId: userId,
        reason: reportCategory ? `${REPORT_CATEGORIES.find(c => c.id === reportCategory)?.label}: ${reportReason}` : reportReason,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Report sent", "We will review your report within 24 hours.");
      setShowReportModal(false);
      setReportReason("");
      setReportCategory(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to send report");
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${currentUser?.id}/blocked`, {
        blockedUserId: userId,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("User blocked", "You will no longer see content from this user.");
      navigation.goBack();
    },
  });

  const handleReport = () => {
    if (!reportCategory) {
      Alert.alert("Error", "Please select a report category");
      return;
    }
    if (reportCategory === "other" && !reportReason.trim()) {
      Alert.alert("Error", "Please specify the reason");
      return;
    }
    reportMutation.mutate();
  };

  const handleBlock = () => {
    Alert.alert(
      "Block user?",
      "You will no longer see content from this user and won't be able to receive messages from them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  };

  const { data: profileUser, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${userId}`, null);
      return response.json();
    },
  });

  const { data: posts = [], isLoading: isPostsLoading } = useQuery<Post[]>({
    queryKey: ["/api/users", userId, "posts"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${userId}/posts`, null);
      return response.json();
    },
  });

  const headerEmojiStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_TRIGGER_HEIGHT, HEADER_TRIGGER_HEIGHT + 40],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [HEADER_TRIGGER_HEIGHT, HEADER_TRIGGER_HEIGHT + 40],
      [0.5, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [HEADER_TRIGGER_HEIGHT, HEADER_TRIGGER_HEIGHT + 40],
      [10, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Animated.View style={[styles.headerTitleContainer, headerEmojiStyle]}>
          <Avatar emoji={profileUser?.emoji || "🐸"} size={32} />
        </Animated.View>
      ),
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
      headerRight: () => (
        <Pressable 
          onPress={() => setShowActionSheet(true)} 
          hitSlop={20}
          style={{ 
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 0,
          }}
        >
          <Feather name="more-horizontal" size={24} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, profileUser?.emoji, headerEmojiStyle, currentUser?.id, userId, theme.text, profileUser?.username]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats", {
        user1Id: currentUser?.id,
        user2Id: userId,
      });
      return response.json();
    },
    onSuccess: (chat) => {
      navigation.navigate("Chat", { 
        chatId: chat.id,
        otherUserId: profileUser?.id,
        otherUserName: profileUser?.username,
        otherUserEmoji: profileUser?.emoji,
      });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] }),
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "posts"] }),
    ]);
    setRefreshing(false);
  }, [queryClient, userId]);

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startChatMutation.mutate();
  };

  const handleHide = () => {
    Alert.alert(
      "Hide user",
      "You will no longer see posts from this user in your feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("POST", `/api/users/${currentUser?.id}/hidden`, {
                hiddenUserId: userId,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to hide user");
            }
          },
        },
      ]
    );
  };

  const handleShareProfile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const shareUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/user/${userId}`;
      await Share.share({
        message: `Check out ${profileUser?.username}'s profile on Okeno: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // Silent fail
    }
  };

  const renderHeader = () => {
    if (isUserLoading && !profileUser) {
      return (
        <View style={[styles.header, { opacity: 0.5 }]}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.backgroundSecondary }} />
          <View style={{ width: 120, height: 20, marginTop: Spacing.sm, backgroundColor: theme.backgroundSecondary, borderRadius: 4 }} />
        </View>
      );
    }

    return (
      <View style={styles.header}>
        <Avatar emoji={profileUser?.emoji || "🐸"} size={72} />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm }}>
          <ThemedText type="h3" style={[styles.username, { marginTop: 0 }]} truncate maxLength={15}>
            {profileUser?.username}
          </ThemedText>
          {profileUser?.isVerified ? <VerifiedBadge size={18} style={{ marginLeft: 6 }} /> : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <ThemedText type="h4">{posts.length}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {t("posts", "посты")}
            </ThemedText>
          </View>
        </View>

        {String(currentUser?.id) !== String(userId) ? (
          <View style={styles.actions}>
            <Button onPress={handleMessage} style={styles.messageButton}>
              {t("Message", "Сообщение")}
            </Button>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button 
              onPress={handleShareProfile}
              style={[styles.messageButton, { backgroundColor: theme.backgroundSecondary }]}
              textStyle={{ color: theme.text }}
            >
              {t("Share Profile", "Поделиться профилем")}
            </Button>
          </View>
        )}
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const column = index % NUM_COLUMNS;

      return (
        <Pressable
          onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            marginRight: column < NUM_COLUMNS - 1 ? GRID_GAP : 0,
            marginBottom: GRID_GAP,
          }}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={(e) => console.log(`Profile image load error for ${item.id}:`, e)}
          />
        </Pressable>
      );
    },
    [navigation]
  );

  return (
    <ThemedView style={styles.container}>
      <Animated.FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
            progressViewOffset={insets.top + Spacing.xl}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !isPostsLoading ? (
            <View style={styles.emptyContainer}>
              <Feather name="image" size={36} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                No posts yet
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <View style={styles.actionSheetOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFillObject} 
            onPress={() => setShowActionSheet(false)}
          />
          <Animated.View 
            entering={FadeIn}
            style={[styles.actionSheetContainer, { backgroundColor: theme.backgroundRoot }]}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActionSheet(false);
                setTimeout(() => handleShareProfile(), 100);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name="send" size={20} color={theme.text} />
              <ThemedText style={styles.actionSheetText}>{t("Share Profile", "Поделиться профилем")}</ThemedText>
            </Pressable>
            
            <View style={[styles.actionSheetDivider, { backgroundColor: theme.border }]} />
            
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActionSheet(false);
                setTimeout(() => setShowReportModal(true), 100);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name="flag" size={20} color={theme.error} />
              <ThemedText style={[styles.actionSheetText, { color: theme.error }]}>{t("Report", "Пожаловаться")}</ThemedText>
            </Pressable>
            
            <View style={[styles.actionSheetDivider, { backgroundColor: theme.border }]} />
            
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActionSheet(false);
                setTimeout(() => handleBlock(), 100);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name="slash" size={20} color={theme.error} />
              <ThemedText style={[styles.actionSheetText, { color: theme.error }]}>{t("Block", "Заблокировать")}</ThemedText>
            </Pressable>
            
            <View style={[styles.actionSheetDivider, { backgroundColor: theme.border }]} />
            
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActionSheet(false);
              }}
              style={({ pressed }) => [styles.actionSheetItem, pressed && { opacity: 0.6 }]}
            >
              <ThemedText style={[styles.actionSheetText, { color: theme.textSecondary }]}>{t("Cancel", "Отмена")}</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Report</ThemedText>
            <Pressable onPress={() => setShowReportModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              Select a category and describe the reason for the report. We will review it within 24 hours.
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
              multiline
              numberOfLines={4}
              style={[
                styles.reportInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />

            <Pressable
              onPress={handleReport}
              disabled={reportMutation.isPending}
              style={[styles.reportButton, { backgroundColor: theme.error }]}
            >
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                Send Report
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleBlock}
              style={[styles.blockButton, { borderColor: theme.error }]}
            >
              <Feather name="slash" size={18} color={theme.error} />
              <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
                Block User
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  username: {
    marginTop: Spacing.sm,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  stat: {
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  messageButton: {
    flex: 1,
    minWidth: 120,
    paddingHorizontal: Spacing.md,
  },
  hideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  reportInput: {
    height: 100,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: "top",
    marginTop: Spacing.md,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  reportButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  blockButton: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    borderWidth: 1,
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
    paddingBottom: Spacing.xl,
  },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  actionSheetText: {
    marginLeft: Spacing.md,
    fontSize: 16,
    fontWeight: "500",
  },
  actionSheetDivider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
});
