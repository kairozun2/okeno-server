import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform, ImageBackground, Modal, ActionSheetIOS, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  replyToId?: string | null;
  isEdited?: boolean;
  createdAt: string;
  isRead: boolean;
}

interface ChatSettings {
  id: string;
  userId: string;
  otherUserId: string;
  nickname: string | null;
  backgroundImage: string | null;
}

function formatMessageTime(date: Date): string {
  return format(date, "HH:mm");
}

function MessageBubble({
  message,
  isOwn,
  onLongPress,
  replyMessage,
  language,
}: {
  message: Message;
  isOwn: boolean;
  onLongPress: () => void;
  replyMessage?: Message | null;
  language: string;
}) {
  const { theme } = useTheme();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const handleUrlPress = useCallback(async (url: string) => {
    try {
      let supportedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        supportedUrl = `https://${url}`;
      }
      const supported = await Linking.canOpenURL(supportedUrl);
      if (supported) {
        await Linking.openURL(supportedUrl);
      }
    } catch {
      // Silent fail
    }
  }, []);

  const renderContent = (content: string, isOwn: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/g;
    const parts = content.split(urlRegex);
    const matches = content.match(urlRegex);

    if (!matches) {
      return (
        <ThemedText
          type="body"
          style={{ color: isOwn ? "#fff" : theme.text }}
        >
          {content}
        </ThemedText>
      );
    }

    let matchIndex = 0;
    return (
      <ThemedText
        type="body"
        style={{ color: isOwn ? "#fff" : theme.text }}
      >
        {parts.map((part, i) => {
          if (part === undefined) return null;
          if (matches.includes(part)) {
            return (
              <ThemedText
                key={i}
                type="body"
                style={{ color: isOwn ? "rgba(255,255,255,0.9)" : theme.link, textDecorationLine: 'underline' }}
                onPress={() => handleUrlPress(part)}
              >
                {part}
              </ThemedText>
            );
          }
          return part;
        })}
      </ThemedText>
    );
  };

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={300}>
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownMessage : styles.otherMessage,
          {
            backgroundColor: isOwn ? theme.link : theme.cardBackground,
          },
        ]}
      >
        {replyMessage ? (
          <View style={[styles.replyContainer, { borderLeftColor: isOwn ? "rgba(255,255,255,0.5)" : theme.link }]}>
            <ThemedText type="caption" style={{ color: isOwn ? "rgba(255,255,255,0.7)" : theme.textSecondary, fontWeight: "600" }}>
              {t("Reply", "Ответ")}
            </ThemedText>
            <ThemedText type="caption" style={{ color: isOwn ? "rgba(255,255,255,0.6)" : theme.textSecondary }} numberOfLines={1}>
              {typeof replyMessage.content === 'string' ? replyMessage.content : ""}
            </ThemedText>
          </View>
        ) : null}
        {renderContent(typeof message.content === 'string' ? message.content : "", isOwn)}
        <View style={styles.messageFooter}>
          {message.isEdited ? (
            <ThemedText
              type="caption"
              style={[styles.editedLabel, { color: isOwn ? "rgba(255,255,255,0.5)" : theme.textSecondary }]}
            >
              {t("edited", "изм.")}
            </ThemedText>
          ) : null}
          <ThemedText
            type="caption"
            style={[
              styles.messageTime,
              { color: isOwn ? "rgba(255,255,255,0.7)" : theme.textSecondary },
            ]}
          >
            {formatMessageTime(new Date(message.createdAt))}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId, otherUserName, otherUserUsername, otherUserEmoji, otherUserId } = route.params;
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  // Poll for typing status
  const { data: typingData } = useQuery<{ isTyping: boolean }>({
    queryKey: ["/api/chats", chatId, "typing", otherUserId],
    queryFn: async () => {
      if (!otherUserId) return { isTyping: false };
      const url = new URL(`/api/chats/${chatId}/typing/${otherUserId}`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return { isTyping: false };
      return response.json();
    },
    enabled: !!otherUserId,
    refetchInterval: 1500,
  });

  const isOtherUserTyping = typingData?.isTyping || false;

  // Send typing status when user types
  const sendTypingStatus = useCallback(() => {
    if (!user?.id) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    apiRequest("POST", `/api/chats/${chatId}/typing`, { userId: user.id }).catch(() => {});
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [chatId, user?.id]);

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (text.length > 0) {
      sendTypingStatus();
    }
  };

  const { data: chatSettings } = useQuery<ChatSettings | null>({
    queryKey: ["/api/users", user?.id, "chat-settings", otherUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${user?.id}/chat-settings/${otherUserId}`, null);
      if (response.status === 404) return null;
      return response.json();
    },
    enabled: !!user?.id && !!otherUserId,
  });

  const getDirectLink = (url: string) => {
    if (url.includes("imgbly.com") && !url.includes("i.imgbly.com")) {
      return url.replace("www.imgbly.com", "i.imgbly.com");
    }
    return url;
  };

  useEffect(() => {
    if (otherUserId && (!otherUserName || !otherUserEmoji)) {
      queryClient.prefetchQuery({
        queryKey: ["/api/users", otherUserId],
        queryFn: async () => {
          const response = await apiRequest("GET", `/api/users/${otherUserId}`, null);
          const userData = await response.json();
          // Update navigation params with actual data if we're on this screen
          navigation.setParams({
            otherUserName: userData.username,
            otherUserUsername: userData.username,
            otherUserEmoji: userData.emoji,
          } as any);
          return userData;
        }
      });
    }
  }, [otherUserId]);

  const { data: userData } = useQuery({
    queryKey: ["/api/users", otherUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${otherUserId}`, null);
      return response.json();
    },
    enabled: !!otherUserId,
  });

  const displayName = chatSettings?.nickname || userData?.username || otherUserName || t("User", "Пользователь");
  const displayEmoji = userData?.emoji || otherUserEmoji || "🐸";
  const displayUsername = userData?.username || otherUserUsername;
  const backgroundImage = chatSettings?.backgroundImage;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/chats", chatId, "messages"],
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL(`/api/chats/${chatId}/messages?limit=20&offset=${pageParam}`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json() as Promise<Message[]>;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      return lastPage.length === 20 ? allPages.length * 20 : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 3000,
  });

  const messages = data?.pages.flat() || [];

  const sendMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string | null }) => {
      const response = await apiRequest("POST", "/api/messages", {
        chatId,
        senderId: user?.id,
        content,
        replyToId,
      });
      return response.json();
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return { pages: [[newMessage]], pageParams: [0] };
        return {
          ...oldData,
          pages: [[newMessage, ...oldData.pages[0]], ...oldData.pages.slice(1)],
        };
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const response = await apiRequest("PATCH", `/api/messages/${messageId}`, {
        content,
        senderId: user?.id,
      });
      return response.json();
    },
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg: Message) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          ),
        };
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`, {
        senderId: user?.id,
      });
      return messageId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg: Message) => msg.id !== deletedId)
          ),
        };
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage("");
    
    if (editingMessage) {
      editMutation.mutate({ messageId: editingMessage.id, content });
      setEditingMessage(null);
    } else {
      sendMutation.mutate({ content, replyToId: replyTo?.id });
      setReplyTo(null);
    }
  };

  const handleLongPress = (msg: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(msg);
    
    if (Platform.OS === "ios") {
      const isOwn = msg.senderId === user?.id;
      const options = isOwn 
        ? [t("Reply", "Ответить"), t("Edit", "Редактировать"), t("Delete", "Удалить"), t("Cancel", "Отмена")]
        : [t("Reply", "Ответить"), t("Cancel", "Отмена")];
      const destructiveButtonIndex = isOwn ? 2 : undefined;
      const cancelButtonIndex = isOwn ? 3 : 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (isOwn) {
            if (buttonIndex === 0) handleReply(msg);
            else if (buttonIndex === 1) handleEdit(msg);
            else if (buttonIndex === 2) handleDelete(msg);
          } else {
            if (buttonIndex === 0) handleReply(msg);
          }
        }
      );
    } else {
      setShowActionModal(true);
    }
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setEditingMessage(null);
    setShowActionModal(false);
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setMessage(msg.content);
    setReplyTo(null);
    setShowActionModal(false);
  };

  const handleDelete = (msg: Message) => {
    deleteMutation.mutate(msg.id);
    setShowActionModal(false);
  };

  const cancelReplyOrEdit = () => {
    setReplyTo(null);
    setEditingMessage(null);
    setMessage("");
  };

  useEffect(() => {
    if (user?.id) {
      apiRequest("POST", `/api/chats/${chatId}/read`, { userId: user.id }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "chats"] });
    }
  }, [chatId, user?.id]);

  const getReplyMessage = useCallback((replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  }, [messages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isOwn={item.senderId === user?.id}
        onLongPress={() => handleLongPress(item)}
        replyMessage={getReplyMessage(item.replyToId)}
        language={language}
      />
    ),
    [user?.id, language, messages]
  );

  const chatContent = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ThemedText type="small" style={{ fontWeight: "600" }} truncate maxLength={12}>{displayName}</ThemedText>
                {userData?.isVerified ? <VerifiedBadge size={14} /> : null}
              </View>
              {isOtherUserTyping ? (
                <ThemedText type="caption" style={{ color: theme.link }}>{t("typing...", "печатает...")}</ThemedText>
              ) : displayUsername ? (
                <ThemedText type="caption" style={{ opacity: 0.6 }} truncate maxLength={15}>@{displayUsername}</ThemedText>
              ) : null}
            </View>
            <Avatar emoji={displayEmoji} size={32} />
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
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          keyboardDismissMode="interactive"
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
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
          {(replyTo || editingMessage) ? (
            <Animated.View 
              entering={FadeIn.duration(150)} 
              exiting={FadeOut.duration(100)}
              style={[styles.replyBar, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.link }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: theme.link, fontWeight: "600" }}>
                  {editingMessage ? t("Editing", "Редактирование") : t("Reply to", "Ответ на")}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
                  {(editingMessage?.content && typeof editingMessage.content === 'string') || (replyTo?.content && typeof replyTo.content === 'string') || ""}
                </ThemedText>
              </View>
              <Pressable onPress={cancelReplyOrEdit} style={styles.cancelReplyButton}>
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          ) : null}
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
              placeholder={t("Message...", "Сообщение...")}
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending || editMutation.isPending}
              style={[
                styles.sendButton,
                {
                  backgroundColor: message.trim() ? theme.link : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather
                name={editingMessage ? "check" : "send"}
                size={18}
                color={message.trim() ? "#fff" : theme.textSecondary}
              />
            </Pressable>
          </View>
          <View style={{ height: insets.bottom > 0 ? insets.bottom : Spacing.md }} />
        </View>

        <Modal
          visible={showActionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowActionModal(false)}>
            <View style={[styles.actionSheet, { backgroundColor: theme.backgroundRoot }]}>
              <Pressable
                style={[styles.actionItem, { borderBottomColor: theme.border }]}
                onPress={() => selectedMessage && handleReply(selectedMessage)}
              >
                <Feather name="corner-up-left" size={20} color={theme.text} />
                <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{t("Reply", "Ответить")}</ThemedText>
              </Pressable>
              
              {selectedMessage?.senderId === user?.id ? (
                <>
                  <Pressable
                    style={[styles.actionItem, { borderBottomColor: theme.border }]}
                    onPress={() => selectedMessage && handleEdit(selectedMessage)}
                  >
                    <Feather name="edit-2" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{t("Edit", "Редактировать")}</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.actionItem, { borderBottomColor: theme.border }]}
                    onPress={() => selectedMessage && handleDelete(selectedMessage)}
                  >
                    <Feather name="trash-2" size={20} color={theme.error} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md, color: theme.error }}>{t("Delete", "Удалить")}</ThemedText>
                  </Pressable>
                </>
              ) : null}
              
              <Pressable
                style={styles.actionItem}
                onPress={() => setShowActionModal(false)}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
                <ThemedText type="body" style={{ marginLeft: Spacing.md, color: theme.textSecondary }}>{t("Cancel", "Отмена")}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {backgroundImage ? (
        <ImageBackground
          source={{ uri: getDirectLink(backgroundImage) }}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          {chatContent}
        </ImageBackground>
      ) : (
        chatContent
      )}
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
  replyContainer: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
    gap: 4,
  },
  editedLabel: {
    fontSize: 9,
  },
  messageTime: {
    fontSize: 10,
  },
  inputContainer: {
    paddingTop: Spacing.sm,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
  },
  cancelReplyButton: {
    padding: Spacing.xs,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
