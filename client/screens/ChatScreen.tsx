import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAvoidingView, KeyboardStickyView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[
        styles.messageBubble,
        isOwn ? styles.ownMessage : styles.otherMessage,
        {
          backgroundColor: isOwn ? theme.link : theme.cardBackground,
        },
      ]}
    >
      <ThemedText
        type="body"
        style={{ color: isOwn ? "#fff" : theme.text }}
      >
        {message.content}
      </ThemedText>
      <ThemedText
        type="caption"
        style={[
          styles.messageTime,
          { color: isOwn ? "rgba(255,255,255,0.7)" : theme.textSecondary },
        ]}
      >
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ru })}
      </ThemedText>
    </Animated.View>
  );
}

function EmptyChat() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={40} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
        Начните переписку
      </ThemedText>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId } = route.params;
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        chatId,
        senderId: user?.id,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMutation.mutate(message.trim());
    setMessage("");
  };

  useEffect(() => {
    if (user?.id) {
      apiRequest("POST", `/api/chats/${chatId}/read`, { userId: user.id }).catch(() => {});
    }
  }, [chatId, user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === user?.id} />
    ),
    [user?.id]
  );

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const EmptyChatState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={40} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
        Начните переписку
      </ThemedText>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted={messages.length > 0}
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: headerHeight + Spacing.md },
            messages.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={EmptyChatState}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={{
            paddingBottom: insets.bottom > 0 ? insets.bottom + Spacing.md : Spacing.xl,
            paddingTop: Spacing.sm,
          }}
        >
          <View style={styles.inputWrapper}>
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
              placeholder="Сообщение..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              style={[
                styles.sendButton,
                {
                  backgroundColor: message.trim() ? theme.link : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather
                name="send"
                size={18}
                color={message.trim() ? "#fff" : theme.textSecondary}
              />
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
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  ownMessage: {
    alignSelf: "flex-end",
    borderBottomRightRadius: Spacing.xs,
  },
  otherMessage: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: Spacing.xs,
  },
  messageTime: {
    marginTop: Spacing.xs,
    alignSelf: "flex-end",
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleY: -1 }],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 150,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
