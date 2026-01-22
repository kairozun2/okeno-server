import React, { useState, useCallback, useLayoutEffect } from "react";
import { Share, View, StyleSheet, RefreshControl, Pressable, Dimensions, Alert, FlatList, Modal, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const HEADER_TRIGGER_HEIGHT = 100;

interface User {
  id: string;
  username: string;
  emoji: string;
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
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reports", {
        reporterId: currentUser?.id,
        reportedUserId: userId,
        reason: reportReason,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Жалоба отправлена", "Мы рассмотрим вашу жалобу в течение 24 часов.");
      setShowReportModal(false);
      setReportReason("");
    },
    onError: () => {
      Alert.alert("Ошибка", "Не удалось отправить жалобу");
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
      Alert.alert("Пользователь заблокирован", "Вы больше не увидите контент этого пользователя.");
      navigation.goBack();
    },
  });

  const handleReport = () => {
    if (!reportReason.trim()) {
      Alert.alert("Ошибка", "Укажите причину жалобы");
      return;
    }
    reportMutation.mutate();
  };

  const handleBlock = () => {
    Alert.alert(
      "Заблокировать пользователя?",
      "Вы больше не увидите контент этого пользователя и не сможете получать от него сообщения.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Заблокировать",
          style: "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  };

  const { data: profileUser, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/users", userId],
  });

  const { data: posts = [], isLoading: isPostsLoading } = useQuery<Post[]>({
    queryKey: ["/api/users", userId, "posts"],
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
    });
  }, [navigation, profileUser?.emoji, headerEmojiStyle]);

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
      "Скрыть пользователя",
      "Вы больше не увидите публикации этого пользователя в ленте.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Скрыть",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("POST", `/api/users/${currentUser?.id}/hidden`, {
                hiddenUserId: userId,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Ошибка", "Не удалось скрыть пользователя");
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
        message: `Посмотри профиль ${profileUser?.username} в приложении Moments: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
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
      <Animated.View entering={FadeIn} style={styles.header}>
        <Avatar emoji={profileUser?.emoji || "🐸"} size={72} />
        <ThemedText type="h3" style={styles.username} truncate maxLength={15}>
          {profileUser?.username}
        </ThemedText>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <ThemedText type="h4">{posts.length}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              публикаций
            </ThemedText>
          </View>
        </View>

        {currentUser?.id !== userId ? (
          <View style={styles.actions}>
            <Button onPress={handleMessage} style={styles.messageButton}>
              Написать
            </Button>
            <Pressable 
              onPress={handleShareProfile}
              style={[styles.hideButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="send" size={20} color={theme.text} />
            </Pressable>
            <Pressable 
              onPress={() => setShowReportModal(true)}
              style={[styles.hideButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="flag" size={20} color={theme.error} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable 
              onPress={handleShareProfile}
              style={[styles.hideButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="send" size={20} color={theme.text} />
            </Pressable>
          </View>
        )}
      </Animated.View>
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
          paddingTop: insets.top + Spacing.xl,
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
                Пока нет публикаций
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Пожаловаться</ThemedText>
            <Pressable onPress={() => setShowReportModal(false)} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              Опишите причину жалобы. Мы рассмотрим её в течение 24 часов.
            </ThemedText>

            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Причина жалобы..."
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
                Отправить жалобу
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleBlock}
              style={[styles.blockButton, { borderColor: theme.error }]}
            >
              <Feather name="slash" size={18} color={theme.error} />
              <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
                Заблокировать пользователя
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
    maxWidth: 160,
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
    height: 120,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: "top",
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
});
