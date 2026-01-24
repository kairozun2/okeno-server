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

type Props = NativeStackScreenProps<RootStackParamList, "SavedPosts">;

interface Post {
  id: string;
  imageUrl: string;
}

export default function SavedPostsScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("Saved", "Сохранённые"),
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
    });
  }, [navigation, theme.text, language]);

  const { data: savedPosts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/users", user?.id, "saved"],
    enabled: !!user?.id,
    staleTime: 0,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("POST", `/api/posts/${postId}/save`, { userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "saved"] });
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const renderItem = ({ item }: { item: Post }) => (
    <Pressable
      onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
      style={styles.item}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.unsaveOverlay}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            unsaveMutation.mutate(item.id);
          }}
          style={styles.unsaveIcon}
        >
          <Feather name="bookmark" size={16} color="#FFF" />
        </Pressable>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t("Loading...", "Загрузка...")}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={savedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bookmark" size={48} color={theme.textSecondary} style={{ marginBottom: Spacing.md }} />
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              {t("No saved posts yet.\nTap the bookmark icon on posts to save them here.", "Пока нет сохранённых публикаций.\nНажмите на иконку закладки, чтобы сохранить.")}
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
  unsaveOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  unsaveIcon: {
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
