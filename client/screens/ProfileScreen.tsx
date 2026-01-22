import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, RefreshControl, Pressable, Dimensions, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { 
  FadeIn, 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate,
  Extrapolate
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  location: string | null;
  createdAt: string;
}

function PostGridItem({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.gridItem}>
      <Image
        source={{ uri: post.imageUrl }}
        style={styles.gridImage}
        contentFit="cover"
        transition={100}
      />
    </Pressable>
  );
}

function EmptyPosts() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="image" size={36} color={theme.textSecondary} />
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Пока нет публикаций
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ProfileTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight() || 64;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [100, 150],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const emojiStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [100, 150],
      [0, 1],
      Extrapolate.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [100, 150],
      [20, 0],
      Extrapolate.CLAMP
    );
    return { 
      opacity,
      transform: [{ translateY }]
    };
  });

  const mainAvatarStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0, 100],
      [1.2, 1, 0.8],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [50, 100],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const column = index % NUM_COLUMNS;
      return (
        <View
          style={{
            marginRight: column < NUM_COLUMNS - 1 ? GRID_GAP : 0,
            marginBottom: GRID_GAP,
          }}
        >
          <PostGridItem
            post={item}
            onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
          />
        </View>
      );
    },
    [navigation]
  );

  const headerComponent = useMemo(() => (
    <View style={styles.header}>
      <Animated.View style={[styles.avatarContainer, mainAvatarStyle]}>
        <Avatar emoji={user?.emoji || "🐸"} size={80} />
      </Animated.View>
      <ThemedText type="h3" style={styles.username}>
        {user?.username}
      </ThemedText>
      <Pressable onPress={handleCopyId} style={styles.idButton}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          ID: {user?.id?.slice(0, 8)}...
        </ThemedText>
        <Feather name="copy" size={12} color={theme.textSecondary} />
      </Pressable>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <ThemedText type="h4">{posts.length}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            публикаций
          </ThemedText>
        </View>
      </View>
    </View>
  ), [user, posts.length, theme, mainAvatarStyle]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.customHeader, { height: headerHeight + insets.top }]}>
        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.headerCenter}>
            <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
              <ThemedText style={styles.headerTitleText}>Профиль</ThemedText>
            </Animated.View>
            <Animated.View style={[styles.headerEmojiContainer, emojiStyle]}>
              <ThemedText style={styles.headerEmojiText}>{user?.emoji || "🐸"}</ThemedText>
            </Animated.View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => navigation.navigate("QRCode")}
              style={styles.headerIconButton}
            >
              <Feather name="grid" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={styles.headerIconButton}
            >
              <Feather name="settings" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <Animated.FlatList
        onScroll={scrollHandler}
        data={posts}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{
          paddingTop: headerHeight + insets.top + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
            progressViewOffset={headerHeight + insets.top}
          />
        }
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={<EmptyPosts />}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    width: "100%",
  },
  headerLeft: {
    width: 80,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  headerRight: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.xs,
  },
  headerTitleContainer: {
    position: "absolute",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerEmojiContainer: {
    position: "absolute",
  },
  headerEmojiText: {
    fontSize: 24,
  },
  headerIconButton: {
    padding: Spacing.sm,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  username: {
    fontWeight: "700",
  },
  idButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    opacity: 0.8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  stat: {
    alignItems: "center",
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    marginTop: Spacing.sm,
  },
});
