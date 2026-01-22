import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleSubmit = () => {
    if (!comment.trim()) return;
    
    addCommentMutation.mutate(comment.trim());
    setComment("");
  };

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => {
      const commentWithUser: CommentWithUser = {
        ...item,
      };

      return (
        <CommentItem
          comment={commentWithUser}
          onUserPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
        />
      );
    },
    [navigation]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <FlatList
        data={comments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.commentsList,
          { paddingTop: insets.top + Spacing.xl },
          comments.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={<EmptyComments />}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Avatar emoji={user?.emoji || "🐸"} size={32} />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
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
    </KeyboardAvoidingView>
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
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
});
