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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable 
          onPress={() => navigation.goBack()}
          style={{ marginLeft: Spacing.sm }}
        >
          <Feather name="chevron-left" size={28} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme.text]);

  const { data: archivedPosts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/users", user?.id, "archived"],
    enabled: !!user?.id,
    staleTime: 0,
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/users/${user?.id}/archived/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
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
      <View style={styles.unarchiveOverlay}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            unarchiveMutation.mutate(item.id);
          }}
          style={styles.unarchiveIcon}
        >
          <Feather name="arrow-up" size={18} color="#FFF" />
        </Pressable>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Loading...</ThemedText>
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
              Your archive is empty.{"\n"}Your hidden memories will be stored here.
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
  unarchiveOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  unarchiveIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
  }
});
