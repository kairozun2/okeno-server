import React, { useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, Pressable, Dimensions, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
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
const GRID_GAP = Spacing.xs;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

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
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileUser } = useQuery<User>({
    queryKey: ["/api/users", userId],
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/users", userId, "posts"],
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
      navigation.navigate("Chat", { chatId: chat.id });
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
      "Hide User",
      "You won't see this user's posts in your feed. You can unhide them later in Settings.",
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

  const renderHeader = () => (
    <Animated.View entering={FadeIn} style={styles.header}>
      <Avatar emoji={profileUser?.emoji || "🐸"} size={100} />
      <ThemedText type="h2" style={styles.username}>
        {profileUser?.username}
      </ThemedText>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <ThemedText type="h4">{posts.length}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Posts
          </ThemedText>
        </View>
      </View>

      {currentUser?.id !== userId ? (
        <View style={styles.actions}>
          <Button onPress={handleMessage} style={styles.messageButton}>
            Message
          </Button>
          <Pressable
            onPress={handleHide}
            style={[styles.hideButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="eye-off" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );

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
            borderRadius: BorderRadius.sm,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      );
    },
    [navigation]
  );

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={posts}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        estimatedItemSize={ITEM_SIZE}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="image" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No posts yet
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  username: {
    marginTop: Spacing.lg,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  stat: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  messageButton: {
    flex: 1,
    maxWidth: 200,
  },
  hideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
});
