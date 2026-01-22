import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
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

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId, otherUserName, otherUserUsername, otherUserEmoji, otherUserId } = route.params;
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
      >
        <View style={[styles.header, { top: Spacing.sm }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={45} 
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
              />
            )}
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>

          <Pressable
            onPress={() => otherUserId && navigation.navigate("UserProfile", { userId: otherUserId })}
            style={styles.userInfo}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={45}
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
              />
            )}
            <View style={{ marginRight: Spacing.sm }}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>{otherUserName || "Пользователь"}</ThemedText>
              {otherUserUsername ? <ThemedText type="caption" style={{ opacity: 0.6 }}>@{otherUserUsername}</ThemedText> : null}
            </View>
            <Avatar emoji={otherUserEmoji || "🐸"} size={32} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[
            isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
            isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
            isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            'transparent'
          ]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 120,
            zIndex: 90, 
            pointerEvents: 'none',
          }}
        />

        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: 8, paddingBottom: insets.top + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={21}
        />

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.inputWrapper}>
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
          <View style={{ height: insets.bottom > 0 ? insets.bottom : Spacing.md }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
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
  inputContainer: {
    paddingTop: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 150,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    borderRadius: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
