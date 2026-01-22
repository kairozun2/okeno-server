import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Comment {
  id: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: string;
}

interface CommentWithUser extends Comment {
  user?: {
    id: string;
    username: string;
    emoji: string;
  };
}

function CommentItem({
  comment,
  onUserPress,
}: {
  comment: CommentWithUser;
  onUserPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.commentItem}>
      <Pressable onPress={onUserPress}>
        <Avatar emoji={comment.user?.emoji || "🐸"} size={36} />
      </Pressable>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Pressable onPress={onUserPress}>
            <ThemedText type="small" style={styles.commentUsername}>
              {comment.user?.username || "Пользователь"}
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru })}
          </ThemedText>
        </View>
        <ThemedText type="body">{comment.content}</ThemedText>
      </View>
    </Animated.View>
  );
}

function EmptyComments() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-square" size={40} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
        Пока нет комментариев
      </ThemedText>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Comments">;

export default function CommentsScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/posts", postId, "comments"],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/comments", {
        userId: user?.id,
        postId,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments", "count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleSubmit = () => {
    if (!comment.trim()) return;
    
    addCommentMutation.mutate(comment.trim());
    setComment("");
  };

  const renderItem = useCallback(
    ({ item }: { item: CommentWithUser }) => {
      return (
        <CommentItem
          comment={item}
          onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        />
      );
    },
    [navigation]
  );

  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={sortedComments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted={comments.length > 0}
          contentContainerStyle={[
            styles.commentsList,
            { paddingTop: headerHeight + Spacing.md },
            comments.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={<EmptyComments />}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={{
            paddingBottom: insets.bottom > 0 ? insets.bottom + Spacing.md : Spacing.xl,
            paddingTop: Spacing.sm,
          }}
        >
          <View style={styles.inputWrapper}>
            <Avatar emoji={user?.emoji || "🐸"} size={32} />
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 20,
                },
              ]}
              placeholder="Комментарий..."
              placeholderTextColor={theme.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={!comment.trim() || addCommentMutation.isPending}
            >
              <ThemedText
                type="link"
                style={{
                  opacity: comment.trim() && !addCommentMutation.isPending ? 1 : 0.5,
                  fontWeight: "600",
                }}
              >
                Отправить
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  commentContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  commentUsername: {
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    transform: [{ scaleY: -1 }],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
});
