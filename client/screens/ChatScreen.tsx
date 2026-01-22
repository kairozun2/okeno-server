import React, { useState, useCallback, useRef, useEffect } from "react";
import * as Clipboard from 'expo-clipboard';
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform, ImageBackground, Modal, ActionSheetIOS, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS 
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
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
  isSelected,
  onSwipeReply,
}: {
  message: Message;
  isOwn: boolean;
  onLongPress: (msg: Message) => void;
  replyMessage?: Message | null;
  language: string;
  isSelected: boolean;
  onSwipeReply: (msg: Message) => void;
}) {
  const { theme, isDark } = useTheme();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX(isOwn ? [-10, 0] : [0, 10]) // Swipe left for own, right for others
    .onUpdate((event) => {
      const translation = event.translateX;
      if (isOwn) {
        // Swipe left (negative)
        if (translation < 0) {
          translateX.value = Math.max(translation, -60);
        }
      } else {
        // Swipe right (positive)
        if (translation > 0) {
          translateX.value = Math.min(translation, 60);
        }
      }
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > 40) {
        runOnJS(onSwipeReply)(message);
        if (Haptics.impactAsync) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ zIndex: isSelected ? 1001 : 1 }, animatedStyle]}>
        <Pressable 
          onLongPress={() => onLongPress(message)}
          delayLongPress={150}
          style={({ pressed }) => [
            styles.messageBubble,
            isOwn ? styles.ownMessage : styles.otherMessage,
            { 
              backgroundColor: isOwn 
                ? (isSelected ? (isDark ? "#4a9eff" : "#2a89ff") : theme.link) 
                : (isSelected ? (isDark ? "#323235" : "#f0f0f2") : theme.cardBackground),
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: isSelected ? 1.05 : 1 }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isSelected ? 0.3 : 0,
              shadowRadius: 8,
              elevation: isSelected ? 10 : 0,
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
          
          {(message as any).reactions && (message as any).reactions.length > 0 && (
            <View style={[
              styles.reactionsBadge,
              { 
                backgroundColor: 'transparent',
                right: isOwn ? 10 : undefined,
                left: !isOwn ? 10 : undefined,
              }
            ]}>
              {(message as any).reactions.map((r: any, idx: number) => (
                <ThemedText key={idx} style={{ fontSize: 13 }}>{r.emoji}</ThemedText>
              ))}
            </View>
          )}

          <View style={styles.messageFooter}>
            {message.isEdited ? (
              <ThemedText
                type="caption"
                style={[styles.editedLabel, { color: isOwn ? "rgba(255,255,255,0.5)" : theme.textSecondary }]}
              >
                {t("edited", "изм.")}
              </ThemedText>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText
                type="caption"
                style={[
                  styles.messageTime,
                  { color: isOwn ? "rgba(255,255,255,0.7)" : theme.textSecondary, marginRight: 2 },
                ]}
              >
                {formatMessageTime(new Date(message.createdAt))}
              </ThemedText>
              {isOwn && (
                <Feather 
                  name="check" 
                  size={11} 
                  color={message.isRead ? "#fff" : "rgba(255,255,255,0.4)"} 
                  style={{ marginLeft: 2 }}
                />
              )}
              {isOwn && message.isRead && (
                <Feather 
                  name="check" 
                  size={11} 
                  color="#fff" 
                  style={{ marginLeft: -7 }}
                />
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId, otherUserName, otherUserUsername, otherUserEmoji, otherUserId } = route.params;
  const { theme, isDark, language, hapticsEnabled, chatFullscreen } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerTranslateY = useSharedValue(0);
  const emojiPickerOpacity = useSharedValue(0);

  const REACTION_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢", "🙏"];

  const openEmojiPicker = useCallback(() => {
    setShowEmojiPicker(true);
    emojiPickerTranslateY.value = withSpring(0, { damping: 15 });
    emojiPickerOpacity.value = withSpring(1);
  }, []);

  const closeEmojiPicker = useCallback(() => {
    emojiPickerTranslateY.value = withSpring(20);
    emojiPickerOpacity.value = withSpring(0, {}, () => {
      runOnJS(setShowEmojiPicker)(false);
    });
    // Ensure scrolling isn't blocked by resetting selection state
    setSelectedMessage(null);
  }, []);

  const handleReaction = useCallback((emoji: string) => {
    if (!selectedMessage) return;
    
    // Add reaction optimistically
    queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: Message[]) =>
          page.map((msg: Message) => {
            if (msg.id === selectedMessage.id) {
              const currentReactions = (msg as any).reactions || [];
              // Prevent duplicate same-emoji reaction from same user
              const alreadyReacted = currentReactions.some((r: any) => r.emoji === emoji && r.userId === user?.id);
              if (alreadyReacted) return msg;

              return {
                ...msg,
                reactions: [...currentReactions, { emoji, userId: user?.id }]
              };
            }
            return msg;
          })
        ),
      };
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeEmojiPicker();
    setShowActionModal(false);
    setSelectedMessage(null);
  }, [selectedMessage, closeEmojiPicker, chatId, user?.id, queryClient]);

  const emojiPickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emojiPickerTranslateY.value }],
    opacity: emojiPickerOpacity.value,
  }));
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

  const sendTypingStatus = useCallback(() => {
    if (!user?.id) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    fetch(new URL(`/api/chats/${chatId}/typing`, getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
      credentials: "include"
    }).catch(() => {});

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
  const backgroundImage = chatSettings?.backgroundImage;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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
    refetchInterval: 1000,
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
    onMutate: async (newMessageData) => {
      await queryClient.cancelQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      const previousMessages = queryClient.getQueryData(["/api/chats", chatId, "messages"]);
      
      const tempId = "temp-" + Date.now();
      const optimisticMessage = {
        id: tempId,
        chatId,
        senderId: user?.id || "",
        content: newMessageData.content,
        replyToId: newMessageData.replyToId,
        createdAt: new Date().toISOString(),
        isRead: false,
        isOptimistic: true,
      };

      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return { pages: [[optimisticMessage]], pageParams: [0] };
        return {
          ...oldData,
          pages: [[optimisticMessage, ...oldData.pages[0]], ...oldData.pages.slice(1)],
        };
      });

      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], context?.previousMessages);
    },
    onSettled: () => {
      // Don't invalidate immediately if we want to keep optimistic state longer
      // or ensure the server actually supports reactions in the schema
      // For now, let's keep it and ensure we're not clearing it accidentally
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
    
    requestAnimationFrame(() => {
      if (editingMessage) {
        editMutation.mutate({ messageId: editingMessage.id, content });
        setEditingMessage(null);
      } else {
        sendMutation.mutate({ content, replyToId: replyTo?.id });
        setReplyTo(null);
      }
    });
  };

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowActionModal(false);
  }, []);

  const handleLongPress = (msg: Message) => {
    // Immediate haptic and modal state update
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(msg);
    setShowActionModal(true);
    openEmojiPicker();
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setEditingMessage(null);
    setShowActionModal(false);
    setSelectedMessage(null); // Clear selection
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setMessage(msg.content);
    setReplyTo(null);
    setShowActionModal(false);
    setSelectedMessage(null); // Clear selection
  };

  const handleDelete = (msg: Message) => {
    deleteMutation.mutate(msg.id);
    setShowActionModal(false);
    setSelectedMessage(null); // Clear selection
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
        isSelected={selectedMessage?.id === item.id && showActionModal}
        onSwipeReply={handleReply}
      />
    ),
    [user?.id, language, messages, selectedMessage?.id, showActionModal, handleReply]
  );

  const chatContent = (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, flex: 1 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (chatFullscreen ? 0 : 45) : 0}
      >
        <View style={[styles.header, { top: chatFullscreen ? insets.top + Spacing.xs : Spacing.sm }]}>
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
            <Feather name={chatFullscreen ? "arrow-left" : "x"} size={20} color={theme.text} />
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
            <View style={{ marginRight: Spacing.sm, alignItems: 'flex-end' }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ThemedText type="small" style={{ fontWeight: "600" }} truncate maxLength={12}>{displayName}</ThemedText>
                {userData?.isVerified ? <VerifiedBadge size={14} /> : null}
              </View>
              {isOtherUserTyping ? (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
                  <ThemedText type="caption" style={{ color: theme.link, fontSize: 10 }}>{t("typing...", "печатает...")}</ThemedText>
                </Animated.View>
              ) : null}
            </View>
            <Avatar emoji={displayEmoji} size={32} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[
            isDark ? 'rgba(0, 0, 0, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            'transparent'
          ]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + (chatFullscreen ? 180 : 140),
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
          <View style={[styles.inputWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom / 2 : Spacing.sm }]}>
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
        </View>

        <Modal
          visible={showActionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionModal(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setShowActionModal(false)}
          >
            <BlurView
              intensity={20}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={{
                width: 280,
                alignSelf: 'center',
                position: 'absolute',
                bottom: insets.bottom + Spacing.xl,
              }}
            >
              {showEmojiPicker && (
                <Animated.View 
                  style={[
                    styles.emojiPickerContainer, 
                    emojiPickerStyle,
                    { backgroundColor: isDark ? "rgba(28,28,30,0.95)" : "rgba(255,255,255,0.95)" }
                  ]}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => handleReaction(emoji)}
                      style={styles.emojiButton}
                      hitSlop={8}
                    >
                      <ThemedText style={{ fontSize: 28 }}>{emoji}</ThemedText>
                    </Pressable>
                  ))}
                </Animated.View>
              )}

              <View 
                style={[
                  styles.actionSheetContent, 
                  { backgroundColor: isDark ? "rgba(28,28,30,0.95)" : "rgba(255,255,255,0.95)" }
                ]}
              >
                <Pressable
                  style={[styles.actionItem, { borderBottomColor: "rgba(255,255,255,0.1)" }]}
                  onPress={() => selectedMessage && handleReply(selectedMessage)}
                >
                  <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 17 }}>{t("Reply", "Ответить")}</ThemedText>
                  <Feather name="corner-up-left" size={20} color={isDark ? "#fff" : "#000"} />
                </Pressable>

                <Pressable
                  style={[styles.actionItem, { borderBottomColor: "rgba(255,255,255,0.1)" }]}
                  onPress={() => selectedMessage && handleCopy(selectedMessage.content)}
                >
                  <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 17 }}>{t("Copy", "Скопировать")}</ThemedText>
                  <Feather name="copy" size={20} color={isDark ? "#fff" : "#000"} />
                </Pressable>
                
                {selectedMessage?.senderId === user?.id ? (
                  <>
                    <Pressable
                      style={[styles.actionItem, { borderBottomColor: "rgba(255,255,255,0.1)" }]}
                      onPress={() => selectedMessage && handleEdit(selectedMessage)}
                    >
                      <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 17 }}>{t("Edit", "Изменить")}</ThemedText>
                      <Feather name="edit-2" size={20} color={isDark ? "#fff" : "#000"} />
                    </Pressable>
                    
                    <Pressable
                      style={[styles.actionItem, { borderBottomColor: "rgba(255,255,255,0.1)" }]}
                      onPress={() => selectedMessage && handleDelete(selectedMessage)}
                    >
                      <ThemedText type="body" style={{ flex: 1, color: "#FF453A", fontSize: 17 }}>{t("Delete", "Удалить")}</ThemedText>
                      <Feather name="trash-2" size={20} color="#FF453A" />
                    </Pressable>
                  </>
                ) : null}
              </View>
            </Animated.View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }}>
      {backgroundImage ? (
        <ImageBackground
          source={{ uri: getDirectLink(backgroundImage) }}
          style={{ flex: 1, backgroundColor: '#000' }}
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
  container: {
    flex: 1,
  },
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  reactionsBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 1,
    zIndex: 10,
  },
  emojiPickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.sm,
    borderRadius: 20,
    marginBottom: Spacing.sm,
    overflow: 'visible',
  },
  actionSheetContent: {
    borderRadius: 14,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
  },
  emojiButton: {
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
