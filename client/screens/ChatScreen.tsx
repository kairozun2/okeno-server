import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
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
          backgroundColor: isOwn ? theme.link : theme.backgroundSecondary,
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
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
      </ThemedText>
    </Animated.View>
  );
}

function EmptyChat() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
        Start the conversation
      </ThemedText>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route }: Props) {
  const { chatId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
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
    // Mark messages as read
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        data={messages.toReversed()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted={messages.length > 0}
        contentContainerStyle={[
          styles.messagesList,
          { paddingTop: headerHeight + Spacing.lg },
        ]}
        ListEmptyComponent={<EmptyChat />}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom || Spacing.lg,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
            },
          ]}
          placeholder="Message..."
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
            size={20}
            color={message.trim() ? "#fff" : theme.textSecondary}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
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
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleY: -1 }],
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
