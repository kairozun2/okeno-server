import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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
    isVerified?: boolean;
  };
}

function CommentItem({
  comment,
  onUserPress,
  language,
}: {
  comment: CommentWithUser;
  onUserPress: () => void;
  language: string;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.commentItem}>
      <Pressable onPress={onUserPress}>
        <Avatar emoji={comment.user?.emoji || "🐸"} size={36} />
      </Pressable>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Pressable onPress={onUserPress}>
              <ThemedText type="small" style={styles.commentUsername} truncate maxLength={12}>
                {comment.user?.username || (language === "ru" ? "Пользователь" : "User")}
              </ThemedText>
            </Pressable>
            {comment.user?.isVerified ? <VerifiedBadge size={12} /> : null}
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatDistanceToNow(new Date(comment.createdAt), { 
              addSuffix: true, 
              locale: language === "ru" ? ru : enUS 
            })}
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
        No comments yet
      </ThemedText>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Comments">;

export default function CommentsScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

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
          language={language}
        />
      );
    },
    [navigation, language]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={25}
    >
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <ThemedText type="h3">{t("Comments", "Комментарии")}</ThemedText>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <FlatList
          data={comments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.commentsList,
            comments.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={40} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {t("No comments yet", "Пока нет комментариев")}
              </ThemedText>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
          <View style={styles.inputWrapper}>
            <Avatar emoji={user?.emoji || "🐸"} size={32} />
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                },
              ]}
              placeholder={t("Comment...", "Комментарий...")}
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
                {t("Send", "Отправить")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
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
    paddingTop: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    borderRadius: 20,
  },
});
