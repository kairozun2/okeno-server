import React from "react";
import { View, StyleSheet, FlatList, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_SIZE = SCREEN_WIDTH / COLUMN_COUNT;

type Props = NativeStackScreenProps<RootStackParamList, "Archive">;

interface Post {
  id: string;
  imageUrl: string;
}

export default function ArchiveScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: archivedPostIds, isLoading: loadingIds } = useQuery<string[]>({
    queryKey: ["/api/users", user?.id, "archived"],
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: allPosts, isLoading: loadingPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    staleTime: 0,
  });

  const archivedPosts = allPosts?.filter(p => archivedPostIds?.includes(p.id)) || [];

  const unarchiveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/users/${user?.id}/archived/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "archived"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const renderItem = ({ item }: { item: Post }) => (
    <Pressable
      onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
      style={styles.item}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <Pressable
        onPress={() => unarchiveMutation.mutate(item.id)}
        style={[styles.unarchiveBadge, { backgroundColor: theme.cardBackground }]}
      >
        <Feather name="rotate-ccw" size={12} color={theme.text} />
      </Pressable>
    </Pressable>
  );

  if (loadingIds || loadingPosts) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Загрузка...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={archivedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="archive" size={48} color={theme.textSecondary} style={{ marginBottom: Spacing.md }} />
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              В архиве пока ничего нет.{"\n"}Здесь будут храниться ваши скрытые воспоминания.
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  image: {
    flex: 1,
  },
  unarchiveBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
  }
});
