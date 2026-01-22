import React, { useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, Pressable, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = Spacing.xs;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  location: string | null;
  createdAt: string;
}

function ProfileHeader({
  onSettings,
  onCopyId,
}: {
  onSettings: () => void;
  onCopyId: () => void;
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/users", user?.id, "posts"],
    enabled: !!user?.id,
  });

  return (
    <Animated.View entering={FadeIn} style={styles.header}>
      <View style={styles.headerTop}>
        <Avatar emoji={user?.emoji || "🐸"} size={100} />
        <ThemedText type="h2" style={styles.username}>
          {user?.username}
        </ThemedText>
        <Pressable
          onPress={() => {
            onCopyId();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          style={[styles.idButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            ID: {user?.id?.slice(0, 8)}...
          </ThemedText>
          <Feather name="copy" size={14} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <ThemedText type="h4">{posts.length}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Posts
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="h4">0</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Likes
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="h4">0</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Saved
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

function PostGridItem({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.gridItem}>
      <Image
        source={{ uri: post.imageUrl }}
        style={styles.gridImage}
        contentFit="cover"
        transition={200}
      />
    </Pressable>
  );
}

function EmptyPosts() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="image" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        No posts yet
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ProfileTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/users", user?.id, "posts"],
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
    setRefreshing(false);
  }, [queryClient, user?.id]);

  const handleCopyId = async () => {
    if (user?.id) {
      await Clipboard.setStringAsync(user.id);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const isLastRow = Math.floor(index / NUM_COLUMNS) === Math.floor((posts.length - 1) / NUM_COLUMNS);
      const column = index % NUM_COLUMNS;

      return (
        <View
          style={{
            marginRight: column < NUM_COLUMNS - 1 ? GRID_GAP : 0,
            marginBottom: isLastRow ? 0 : GRID_GAP,
          }}
        >
          <PostGridItem
            post={item}
            onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
          />
        </View>
      );
    },
    [posts.length, navigation]
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
        ListHeaderComponent={
          <ProfileHeader
            onSettings={() => navigation.navigate("Settings")}
            onCopyId={handleCopyId}
          />
        }
        ListEmptyComponent={<EmptyPosts />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTop: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  username: {
    marginTop: Spacing.lg,
  },
  idButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  stat: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
  },
});
