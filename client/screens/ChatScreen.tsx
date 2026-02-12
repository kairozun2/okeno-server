import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { View, StyleSheet, TextInput, Pressable, FlatList, Platform, ImageBackground, Modal, ActionSheetIOS, Linking, Dimensions, Keyboard, LayoutAnimation, ScrollView } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
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
import { apiRequest, getApiUrl, getImageUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number | null;
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

function VoiceMessagePlayer({ 
  voiceUrl, 
  voiceDuration, 
  isOwn,
  theme,
}: { 
  voiceUrl: string; 
  voiceDuration: number; 
  isOwn: boolean;
  theme: any;
}) {
  const player = useAudioPlayer(voiceUrl);
  const status = useAudioPlayerStatus(player);
  
  const isPlaying = status.playing;
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const togglePlayback = async () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.voiceMessageContainer}>
      <Pressable 
        onPress={togglePlayback}
        style={[
          styles.voicePlayButton,
          { backgroundColor: theme.backgroundSecondary }
        ]}
      >
        <Feather 
          name={isPlaying ? "pause" : "play"} 
          size={18} 
          color={theme.text} 
        />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={[styles.voiceProgress, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.voiceProgressFill, 
              { 
                width: `${progress * 100}%`,
                backgroundColor: theme.link 
              }
            ]} 
          />
        </View>
        <ThemedText 
          type="caption" 
          style={{ color: theme.textSecondary, fontSize: 11 }}
        >
          {formatTime(voiceDuration)}
        </ThemedText>
      </View>
    </View>
  );
}

function CodeBlock({ code, theme, isDark }: { code: string; theme: any; isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
      borderRadius: 8,
      padding: 10,
      marginVertical: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    }}>
      <ThemedText style={{
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
        lineHeight: 18,
        color: isDark ? '#e6e6e6' : '#1a1a1a',
      }}>
        {code.trim()}
      </ThemedText>
    </View>
  );
}

function MessageBubble({
  message,
  isOwn,
  onLongPress,
  onDoubleTap,
  replyMessage,
  language,
  isSelected,
  onSwipeReply,
  onImagePress,
  senderName,
  senderEmoji,
  onMiniAppPress,
  miniApps,
}: {
  message: Message;
  isOwn: boolean;
  onLongPress: (msg: Message) => void;
  onDoubleTap: (msg: Message) => void;
  replyMessage?: Message | null;
  language: string;
  isSelected: boolean;
  onSwipeReply: (msg: Message) => void;
  onImagePress?: (imageUrl: string) => void;
  senderName?: string;
  senderEmoji?: string;
  onMiniAppPress?: (appId: string) => void;
  miniApps?: { id: string; name: string; emoji: string; url: string; isVerified: boolean }[];
}) {
  const { theme, isDark } = useTheme();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const lastTapRef = useRef(0);

  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX(isOwn ? [-8, 0] : [0, 8])
    .failOffsetY([-8, 8])
    .onUpdate((event) => {
      const translation = event.translationX;
      if (isOwn && translation < 0) {
        translateX.value = Math.max(translation, -40);
      } else if (!isOwn && translation > 0) {
        translateX.value = Math.min(translation, 40);
      }
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > 25) {
        runOnJS(onSwipeReply)(message);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
      translateX.value = withTiming(0, { duration: 100 });
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

  const renderMiniAppCard = (appId: string, displayText: string, appInfo?: { emoji: string; name: string; isVerified?: boolean }) => (
    <Pressable
      onPress={() => onMiniAppPress?.(appId)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 2,
        gap: 6,
      }}
    >
      {appInfo ? (
        <ThemedText style={{ fontSize: 20 }}>{appInfo.emoji}</ThemedText>
      ) : null}
      <ThemedText type="body" style={{ color: theme.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
        {appInfo?.name || displayText || t("Mini App", "Мини-приложение")}
      </ThemedText>
      {appInfo?.isVerified ? <VerifiedBadge size={12} /> : null}
      <View style={{ flex: 1 }} />
      <View style={{
        backgroundColor: 'rgba(52,120,246,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
      }}>
        <ThemedText type="caption" style={{ color: '#3478F6', fontWeight: '700', fontSize: 12 }}>
          {t("Open", "Открыть")}
        </ThemedText>
      </View>
    </Pressable>
  );

  const renderContent = (content: string, isOwn: boolean) => {
    const miniAppMatch = content.match(/\/miniapp:([a-f0-9-]+)/i);
    if (miniAppMatch) {
      const appId = miniAppMatch[1];
      const displayText = content.replace(/\n?\/miniapp:[a-f0-9-]+/i, '').trim();
      const appInfo = miniApps?.find(a => a.id === appId);
      return renderMiniAppCard(appId, displayText, appInfo);
    }

    if (miniApps && miniApps.length > 0) {
      const contentLower = content.trim().toLowerCase();
      const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
      const matchedApp = miniApps.find(app => {
        const normalizedUrl = normalize(app.url);
        const normalizedContent = normalize(contentLower);
        return normalizedContent === normalizedUrl
          || normalizedContent.startsWith(normalizedUrl + '/')
          || normalizedUrl.startsWith(normalizedContent + '/')
          || contentLower.includes(app.url.toLowerCase())
          || contentLower.includes(normalizedUrl);
      });
      if (matchedApp) {
        return renderMiniAppCard(matchedApp.id, '', matchedApp);
      }
    }

    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = content.match(codeBlockRegex);

    if (codeBlocks) {
      const segments = content.split(codeBlockRegex);
      const result: React.ReactNode[] = [];
      segments.forEach((segment, i) => {
        if (segment.trim()) {
          result.push(<React.Fragment key={`t${i}`}>{renderTextWithLinks(segment, isOwn)}</React.Fragment>);
        }
        if (codeBlocks[i]) {
          const codeContent = codeBlocks[i].replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
          result.push(<CodeBlock key={`c${i}`} code={codeContent} theme={theme} isDark={isDark} />);
        }
      });
      return <View>{result}</View>;
    }

    const inlineCodeRegex = /`[^`]+`/g;
    const inlineCodes = content.match(inlineCodeRegex);
    if (inlineCodes) {
      const parts = content.split(inlineCodeRegex);
      return (
        <ThemedText type="body" style={{ color: theme.text }}>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {inlineCodes[i] ? (
                <ThemedText style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 13,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: theme.text,
                  paddingHorizontal: 4,
                  borderRadius: 3,
                }}>
                  {inlineCodes[i].replace(/`/g, '')}
                </ThemedText>
              ) : null}
            </React.Fragment>
          ))}
        </ThemedText>
      );
    }

    return renderTextWithLinks(content, isOwn);
  };

  const renderTextWithLinks = (content: string, isOwn: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/g;
    const parts = content.split(urlRegex);
    const matches = content.match(urlRegex);

    if (!matches) {
      return (
        <ThemedText type="body" style={{ color: theme.text }}>
          {content}
        </ThemedText>
      );
    }

    return (
      <ThemedText type="body" style={{ color: theme.text }}>
        {parts.map((part, i) => {
          if (part === undefined) return null;
          if (matches.includes(part)) {
            return (
              <ThemedText
                key={i}
                type="body"
                style={{ color: theme.link, textDecorationLine: 'underline' }}
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

  const hasReactions = (message as any).reactions && (message as any).reactions.length > 0;

  const isMissedCall = typeof message.content === 'string' && message.content.includes("📞");

  if (isMissedCall) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 4, width: '100%' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? 'rgba(255,70,70,0.1)' : 'rgba(255,70,70,0.06)',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          gap: 4,
        }}>
          <Feather name={isOwn ? "phone-outgoing" : "phone-incoming"} size={11} color="#FF6B6B" />
          <ThemedText type="caption" style={{ color: '#FF6B6B', fontWeight: '600', fontSize: 11 }}>
            {isOwn
              ? t("Outgoing call", "Исходящий звонок")
              : t("Missed call", "Пропущенный звонок")}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 10 }}>
            {formatMessageTime(new Date(message.createdAt))}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ zIndex: isSelected ? 1001 : 1, width: '100%' }, animatedStyle]}>
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownMessage : styles.otherMessage,
          { marginBottom: hasReactions ? 14 : Spacing.xs },
        ]}>
        <Pressable 
          onLongPress={() => onLongPress(message)}
          onPress={() => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              onDoubleTap(message);
              lastTapRef.current = 0;
            } else {
              lastTapRef.current = now;
            }
          }}
          delayLongPress={150}
          style={({ pressed }) => [
            styles.messageInner,
            { 
              backgroundColor: isSelected ? (isDark ? "#323235" : "#f0f0f2") : theme.cardBackground,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: isSelected ? 1.05 : 1 }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isSelected ? 0.3 : 0,
              shadowRadius: isSelected ? 8 : 0,
              elevation: isSelected ? 10 : 0,
              overflow: 'hidden',
              borderBottomRightRadius: isOwn ? Spacing.xs : undefined,
              borderBottomLeftRadius: !isOwn ? Spacing.xs : undefined,
            },
          ]}
        >
          
          {senderName ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 }}>
              {senderEmoji ? <Avatar emoji={senderEmoji} size={16} /> : null}
              <ThemedText type="caption" style={{ color: theme.link, fontWeight: "600", fontSize: 11 }}>
                {senderName}
              </ThemedText>
            </View>
          ) : null}
          {replyMessage ? (
            <View style={[styles.replyContainer, { borderLeftColor: theme.link }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                {t("Reply", "Ответ")}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {replyMessage.voiceUrl ? t("Voice message", "Голосовое") : replyMessage.imageUrl ? t("Photo", "Фото") : (typeof replyMessage.content === 'string' ? replyMessage.content : "")}
              </ThemedText>
            </View>
          ) : null}
          {message.imageUrl ? (
            <Pressable
              onPress={() => {
                const now = Date.now();
                if (now - lastTapRef.current < 300) {
                  onDoubleTap(message);
                  lastTapRef.current = 0;
                } else {
                  lastTapRef.current = now;
                  setTimeout(() => {
                    if (lastTapRef.current !== 0) {
                      onImagePress?.(message.imageUrl!);
                      lastTapRef.current = 0;
                    }
                  }, 300);
                }
              }}
              onLongPress={() => onLongPress(message)}
              delayLongPress={150}
            >
              <Image
                source={{ uri: message.imageUrl }}
                style={{ 
                  width: 200, 
                  height: 150, 
                  borderRadius: BorderRadius.sm,
                  marginBottom: message.content ? Spacing.xs : 0,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            </Pressable>
          ) : null}
          {message.voiceUrl ? (
            <VoiceMessagePlayer 
              voiceUrl={message.voiceUrl} 
              voiceDuration={message.voiceDuration || 0} 
              isOwn={isOwn}
              theme={theme}
            />
          ) : null}
          {message.content ? renderContent(typeof message.content === 'string' ? message.content : "", isOwn) : null}
          
          <View style={styles.messageFooter}>
            {message.isEdited ? (
              <ThemedText
                type="caption"
                style={[styles.editedLabel, { color: theme.textSecondary }]}
              >
                {t("edited", "изм.")}
              </ThemedText>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText
                type="caption"
                style={[
                  styles.messageTime,
                  { color: theme.textSecondary, marginRight: 2 },
                ]}
              >
                {formatMessageTime(new Date(message.createdAt))}
              </ThemedText>
              {isOwn && (
                <Feather 
                  name="check" 
                  size={11} 
                  color={message.isRead ? theme.link : theme.textSecondary} 
                  style={{ marginLeft: 2 }}
                />
              )}
              {isOwn && message.isRead && (
                <Feather 
                  name="check" 
                  size={11} 
                  color={theme.link} 
                  style={{ marginLeft: -7 }}
                />
              )}
            </View>
          </View>
        </Pressable>
          {hasReactions ? (
            <View 
              pointerEvents="none"
              style={[
                styles.reactionsBadge,
                { 
                  backgroundColor: 'transparent',
                  right: isOwn ? 4 : undefined,
                  left: !isOwn ? 4 : undefined,
                }
              ]}
            >
              {(message as any).reactions.map((r: any, idx: number) => (
                <ThemedText key={idx} style={{ fontSize: 14, lineHeight: 20 }}>{r.emoji}</ThemedText>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId, otherUserName, otherUserUsername, otherUserEmoji, otherUserId, isGroupChat, groupName, groupEmoji } = route.params;
  const { theme, isDark, language, hapticsEnabled, chatFullscreen, quickReactionEmoji, scrollAssistEnabled } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Optimized state management for user identity to prevent flicker
  const [identity, setIdentity] = useState({
    name: (route.params as any).otherUserNickname || otherUserName || "",
    emoji: otherUserEmoji || "🐸"
  });

  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerTranslateY = useSharedValue(0);
  const emojiPickerOpacity = useSharedValue(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const { data: miniAppsForCommand = [] } = useQuery<{ id: string; name: string; emoji: string; url: string; isVerified: boolean }[]>({
    queryKey: ["/api/mini-apps"],
    queryFn: async () => {
      const url = new URL("/api/mini-apps", getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });

  const miniAppCommandActive = message.startsWith("/m ");
  const miniAppSearchTerm = miniAppCommandActive ? message.slice(3).toLowerCase().trim() : "";
  const filteredMiniApps = miniAppCommandActive && miniAppSearchTerm.length >= 1
    ? miniAppsForCommand.filter(app => app.name.toLowerCase().includes(miniAppSearchTerm))
    : [];

  const REACTION_EMOJIS = ["💕", "🥲", "☺️", "🥹", "😅", "🤣", "😟"];

  const openEmojiPicker = useCallback(() => {
    setShowEmojiPicker(true);
    emojiPickerTranslateY.value = 0; // No animation, set directly
    emojiPickerOpacity.value = 1; // No animation, set directly
  }, []);

  const closeEmojiPicker = useCallback(() => {
    // Immediate state cleanup
    setShowEmojiPicker(false);
    setSelectedMessage(null);
    setShowActionModal(false);
    
    // Animate shared values
    emojiPickerTranslateY.value = 0;
    emojiPickerOpacity.value = 0;
  }, []);

  const handleReaction = useCallback(async (emoji: string) => {
    if (!selectedMessage) return;
    
    // 1. Immediate UI state cleanup to restore scrolling
    const targetMessageId = selectedMessage.id;
    setShowActionModal(false);
    setSelectedMessage(null);
    closeEmojiPicker();
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // 2. Perform optimistic update - logic changed to only allow one reaction per user
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg: Message) => {
              if (msg.id === targetMessageId) {
                const currentReactions = (msg as any).reactions || [];
                
                // Filter out any existing reaction from this user
                const otherReactions = currentReactions.filter((r: any) => r.userId !== user?.id);
                
                return {
                  ...msg,
                  reactions: [...otherReactions, { emoji, userId: user?.id }]
                };
              }
              return msg;
            })
          ),
        };
      });

      // 3. Persist to server
      await apiRequest("POST", `/api/messages/${targetMessageId}/reactions`, { 
        emoji,
        userId: user?.id 
      });
    } catch (error) {
      console.error("Failed to save reaction:", error);
    }
  }, [selectedMessage, closeEmojiPicker, chatId, user?.id, queryClient]);

  const emojiPickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emojiPickerTranslateY.value }],
    opacity: emojiPickerOpacity.value,
  }));
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

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
    refetchInterval: 2000,
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

  const { data: chatSettings, refetch: refetchChatSettings } = useQuery<ChatSettings | null>({
    queryKey: ["/api/users", user?.id, "chat-settings", otherUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${user?.id}/chat-settings/${otherUserId}`, null);
      if (response.status === 404) return null;
      return response.json();
    },
    enabled: !!user?.id && !!otherUserId,
    staleTime: 30000,
    gcTime: 300000,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id && otherUserId) {
        refetchChatSettings();
      }
    });
    return unsubscribe;
  }, [navigation, user?.id, otherUserId]);

  const getDirectLink = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("file://") || url.startsWith("blob:")) return "";
    if (url.startsWith("http")) return url;
    return getImageUrl(url);
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
      const data = await response.json();
      // Update local state immediately when data arrives
      setIdentity({
        name: data.username,
        emoji: data.emoji
      });
      return data;
    },
    enabled: !!otherUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { data: chatData } = useQuery<any>({
    queryKey: ["/api/chats", chatId, "info"],
    queryFn: async () => {
      const url = new URL(`/api/chats/${chatId}`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 30000,
  });

  const { data: groupMembersData } = useQuery<any[]>({
    queryKey: ["/api/group-chats", chatId, "members"],
    queryFn: async () => {
      const url = new URL(`/api/group-chats/${chatId}/members`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isGroupChat === true,
    staleTime: 1000 * 60 * 5,
  });

  const membersMap = useMemo(() => {
    const map: Record<string, { username: string; emoji: string }> = {};
    if (groupMembersData) {
      groupMembersData.forEach((m) => {
        const userId = m.userId || m.id;
        const username = m.user?.username || m.username || "";
        const emoji = m.user?.emoji || m.emoji || "🐸";
        if (userId) {
          map[userId] = { username, emoji };
        }
      });
    }
    return map;
  }, [groupMembersData]);

  const displayName = isGroupChat ? (groupName || t("Group", "Группа")) : (chatSettings?.nickname || userData?.username || identity.name || t("User", "Пользователь"));
  const displayEmoji = isGroupChat ? (groupEmoji || "🐸") : (userData?.emoji || identity.emoji || "🐸");
  const rawBackgroundImage = chatData?.backgroundImage || chatSettings?.backgroundImage || null;
  const backgroundImage = rawBackgroundImage && !rawBackgroundImage.startsWith("file://") && !rawBackgroundImage.startsWith("blob:") ? rawBackgroundImage : null;

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
      const msgs = await response.json() as Message[];
      return msgs; 
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      return lastPage.length === 20 ? allPages.length * 20 : undefined;
    },
    initialPageParam: 0,
    staleTime: 5000,
    refetchInterval: 2000, 
  });

  const messages = data?.pages.flat() || [];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !showMessageSearch) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.content && m.content.toLowerCase().includes(q));
  }, [searchQuery, messages, showMessageSearch]);

  const scrollToSearchResult = useCallback((messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowMessageSearch(false);
      setSearchQuery("");
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, replyToId, imageUrl, voiceUrl, voiceDuration }: { content: string; replyToId?: string | null; imageUrl?: string | null; voiceUrl?: string | null; voiceDuration?: number | null }) => {
      const response = await apiRequest("POST", "/api/messages", {
        chatId,
        senderId: user?.id,
        content,
        imageUrl,
        voiceUrl,
        voiceDuration,
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
        imageUrl: newMessageData.imageUrl,
        voiceUrl: newMessageData.voiceUrl,
        voiceDuration: newMessageData.voiceDuration,
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
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
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
      await apiRequest("DELETE", `/api/messages/${messageId}`, { senderId: user?.id });
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      const previousMessages = queryClient.getQueryData(["/api/chats", chatId, "messages"]);
      
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg: Message) => msg.id !== messageId)
          ),
        };
      });
      
      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], context?.previousMessages);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage("");
    
    // Immediate clear replyingTo/editingMessage
    if (editingMessage) {
      editMutation.mutate({ messageId: editingMessage.id, content });
      setEditingMessage(null);
    } else {
      sendMutation.mutate({ content, replyToId: replyTo?.id });
      setReplyTo(null);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendMutation.mutate({ 
          content: "", 
          imageUrl: result.assets[0].uri,
          replyToId: replyTo?.id 
        });
        setReplyTo(null);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;

      // Crucial for iOS: set audio mode to allow recording
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (recordingTimer.current) clearInterval(recordingTimer.current);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error("Start recording error:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const duration = recordingDuration;
      
      setIsRecording(false);
      setRecordingDuration(0);

      // Reset audio mode after recording
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (uri && duration > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        sendMutation.mutate({ 
          content: "", 
          voiceUrl: uri,
          voiceDuration: duration,
          replyToId: replyTo?.id 
        });
        setReplyTo(null);
      }
    } catch (error) {
      console.error("Stop recording error:", error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    try {
      await audioRecorder.stop();
      // Reset audio mode
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {}
    setIsRecording(false);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowActionModal(false);
  }, []);

  const handleDoubleTap = useCallback(async (msg: Message) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      queryClient.setQueryData(["/api/chats", chatId, "messages"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((m: Message) => {
              if (m.id === msg.id) {
                const currentReactions = (m as any).reactions || [];
                const otherReactions = currentReactions.filter((r: any) => r.userId !== user?.id);
                return { ...m, reactions: [...otherReactions, { emoji: quickReactionEmoji, userId: user?.id }] };
              }
              return m;
            })
          ),
        };
      });
      await apiRequest("POST", `/api/messages/${msg.id}/reactions`, { emoji: quickReactionEmoji, userId: user?.id });
    } catch {}
  }, [chatId, user?.id, quickReactionEmoji, queryClient]);

  const handleLongPress = (msg: Message) => {
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

  const handleImagePreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  }, []);

  const handleMiniAppPress = useCallback((appId: string) => {
    const app = miniAppsForCommand.find(a => a.id === appId);
    if (app) {
      (navigation as any).navigate("MiniAppViewer", {
        appId: app.id,
        appName: app.name,
        appUrl: app.url,
        appEmoji: app.emoji,
      });
    }
  }, [miniAppsForCommand, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const senderInfo = isGroupChat && item.senderId !== user?.id
        ? membersMap[item.senderId]
        : undefined;
      return (
        <MessageBubble
          message={item}
          isOwn={item.senderId === user?.id}
          onLongPress={() => handleLongPress(item)}
          onDoubleTap={handleDoubleTap}
          replyMessage={getReplyMessage(item.replyToId)}
          language={language}
          isSelected={selectedMessage?.id === item.id && showActionModal}
          onSwipeReply={handleReply}
          onImagePress={handleImagePreview}
          senderName={senderInfo?.username}
          senderEmoji={senderInfo?.emoji}
          onMiniAppPress={handleMiniAppPress}
          miniApps={miniAppsForCommand}
        />
      );
    },
    [user?.id, language, messages, selectedMessage?.id, showActionModal, handleReply, handleImagePreview, isGroupChat, membersMap, handleDoubleTap, handleMiniAppPress, miniAppsForCommand]
  );

  const chatContent = (
    <View style={[styles.container, { backgroundColor: backgroundImage ? 'transparent' : theme.backgroundRoot, flex: 1 }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? (chatFullscreen ? -30 : 15) : 0}
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

          <View style={[styles.headerCenter, { backgroundColor: 'transparent' }]} pointerEvents="none">
            {!isGroupChat && isOtherUserTyping ? (
              <Animated.View 
                entering={FadeIn.duration(400)} 
                exiting={FadeOut.duration(400)}
                style={styles.typingIndicatorWrapper}
              >
                {Platform.OS === 'ios' && (
                  <BlurView
                    intensity={60} 
                    tint={isDark ? "dark" : "light"}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}
                  />
                )}
                <View style={[
                  styles.typingIndicatorInner, 
                  { 
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                  }
                ]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600", fontSize: 12 }}>
                    {t("typing...", "печатает...")}
                  </ThemedText>
                </View>
              </Animated.View>
            ) : null}
          </View>

          {showMessageSearch ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.searchContainer}
            >
              {Platform.OS === 'ios' && (
                <BlurView
                  intensity={45}
                  tint={isDark ? "dark" : "light"}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
                />
              )}
              <Feather name="search" size={16} color={theme.textSecondary} style={{ marginLeft: 10 }} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("Search messages...", "Поиск сообщений...")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (searchResults.length > 0) {
                    scrollToSearchResult(searchResults[0].id);
                  }
                }}
              />
              <Pressable
                onPress={() => { setShowMessageSearch(false); setSearchQuery(""); }}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!isGroupChat && showCallMenu ? (
                <Animated.View entering={FadeIn.duration(150)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowCallMenu(false);
                      navigation.navigate("CallScreen" as any, { userId: otherUserId, displayName, displayEmoji, chatId });
                    }}
                    style={styles.headerButton}
                  >
                    {Platform.OS === 'ios' ? (
                      <BlurView
                        intensity={45}
                        tint={isDark ? "dark" : "light"}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
                      />
                    ) : null}
                    <Feather name="phone" size={18} color={theme.accent} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowCallMenu(false);
                    }}
                    style={styles.headerButton}
                  >
                    {Platform.OS === 'ios' ? (
                      <BlurView
                        intensity={45}
                        tint={isDark ? "dark" : "light"}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
                      />
                    ) : null}
                    <Feather name="x" size={16} color={theme.textSecondary} />
                  </Pressable>
                </Animated.View>
              ) : !isGroupChat ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCallMenu(true);
                  }}
                  style={styles.headerButton}
                >
                  {Platform.OS === 'ios' ? (
                    <BlurView
                      intensity={45}
                      tint={isDark ? "dark" : "light"}
                      style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
                    />
                  ) : null}
                  <Feather name="chevron-left" size={20} color={theme.text} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  if (isGroupChat && chatId) {
                    navigation.navigate("GroupChatInfo", { chatId, groupName: displayName, groupEmoji: displayEmoji, isVerified: chatData?.isVerified });
                  } else if (!isGroupChat && otherUserId) {
                    navigation.navigate("UserProfile", { userId: otherUserId });
                  }
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowMessageSearch(true);
                }}
                delayLongPress={400}
                style={styles.userInfo}
              >
                {Platform.OS === 'ios' ? (
                  <BlurView
                    intensity={45}
                    tint={isDark ? "dark" : "light"}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
                  />
                ) : null}
                <View style={{ marginRight: Spacing.sm, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <ThemedText type="small" style={{ fontWeight: "600" }} truncate maxLength={12}>{displayName}</ThemedText>
                    {isGroupChat && chatData?.isVerified ? <VerifiedBadge size={14} /> : null}
                    {!isGroupChat && userData?.isVerified ? <VerifiedBadge size={14} /> : null}
                  </View>
                </View>
                <Avatar emoji={displayEmoji} size={32} />
              </Pressable>
            </View>
          )}
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

        {showMessageSearch && searchQuery.trim().length > 0 ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[styles.searchResultsOverlay, { top: chatFullscreen ? insets.top + 52 : 48 }]}
          >
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
            />
            <ScrollView
              style={{ maxHeight: 200 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.length === 0 ? (
                <View style={{ padding: Spacing.md, alignItems: 'center' }}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {t("No messages found", "Сообщения не найдены")}
                  </ThemedText>
                </View>
              ) : searchResults.slice(0, 15).map((msg, idx) => (
                <Pressable
                  key={msg.id}
                  onPress={() => scrollToSearchResult(msg.id)}
                  style={({ pressed }) => [
                    styles.searchResultItem,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: idx < Math.min(searchResults.length, 15) - 1 ? StyleSheet.hairlineWidth : 0,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <ThemedText type="small" numberOfLines={2} style={{ color: theme.text }}>
                    {msg.content}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2, fontSize: 11 }}>
                    {format(new Date(msg.createdAt), "d MMM, HH:mm")}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: 16, paddingBottom: insets.top + 130 },
          ]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          windowSize={21}
          onScroll={(e) => {
            const offset = e.nativeEvent.contentOffset.y;
            if (offset > 300 && !showScrollDown) setShowScrollDown(true);
            else if (offset <= 300 && showScrollDown) setShowScrollDown(false);
          }}
          scrollEventThrottle={200}
        />

        {scrollAssistEnabled && showScrollDown ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
            <Pressable
              onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
              style={[styles.scrollDownButton, {
                bottom: 60,
              }]}
            >
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={styles.scrollDownBlur}
              >
                <Feather name="chevron-down" size={18} color={theme.text} />
              </BlurView>
            </Pressable>
          </Animated.View>
        ) : null}

        {filteredMiniApps.length > 0 ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[styles.miniAppSuggestions, { backgroundColor: isDark ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.95)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}
          >
            <ScrollView horizontal={false} style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {filteredMiniApps.map((app) => (
                <Pressable
                  key={app.id}
                  style={styles.miniAppSuggestionItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMessage("");
                    sendMutation.mutate({ content: `${app.emoji} ${app.name}\n/miniapp:${app.id}` });
                  }}
                >
                  <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ fontSize: 26, lineHeight: 32 }}>{app.emoji}</ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <ThemedText type="body" style={{ color: theme.text, fontWeight: '600' }}>{app.name}</ThemedText>
                      {app.isVerified ? <VerifiedBadge size={14} /> : null}
                    </View>
                  </View>
                  <Feather name="send" size={16} color={theme.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <View style={[styles.inputContainer, { backgroundColor: 'transparent' }]}>
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
          <View style={[styles.inputWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm }]}>
            {isRecording ? (
              <Animated.View 
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.recordingRow}
              >
                <Pressable
                  onPress={cancelRecording}
                  style={[
                    styles.attachButton,
                    { backgroundColor: "rgba(255,59,48,0.15)" }
                  ]}
                >
                  <Feather name="x" size={20} color="#ff3b30" />
                </Pressable>
                <View style={[styles.recordingIndicator, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}>
                  <View style={styles.recordingDot} />
                  <ThemedText type="body" style={{ color: "#ff3b30", fontWeight: "600" }}>
                    {formatDuration(recordingDuration)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={stopRecording}
                  style={[
                    styles.sendButton,
                    { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    }
                  ]}
                >
                  <Feather name="send" size={18} color={theme.text} />
                </Pressable>
              </Animated.View>
            ) : (
              <>
                <Pressable
                  onPress={handlePickImage}
                  disabled={sendMutation.isPending}
                  style={styles.attachButton}
                >
                  <Feather name="image" size={24} color={theme.textSecondary} />
                </Pressable>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                      borderRadius: 20,
                    },
                  ]}
                  placeholder={t("Message...", "Сообщение...")}
                  placeholderTextColor={theme.textSecondary}
                  value={message}
                  onChangeText={handleTextChange}
                  multiline
                  maxLength={1000}
                />
                {message.trim() ? (
                  <Pressable
                    onPress={handleSend}
                    disabled={sendMutation.isPending || editMutation.isPending}
                    style={[
                      styles.sendButton,
                      { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                      }
                    ]}
                  >
                    <Feather
                      name={editingMessage ? "check" : "send"}
                      size={18}
                      color={theme.text}
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPressIn={startRecording}
                    onPressOut={() => {
                      if (isRecording && recordingDuration > 0) {
                        stopRecording();
                      } else if (isRecording) {
                        cancelRecording();
                      }
                    }}
                    disabled={sendMutation.isPending}
                    style={styles.sendButton}
                  >
                    <Feather name="mic" size={24} color={theme.textSecondary} />
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>

        <Modal
          visible={showActionModal}
          transparent
          animationType="fade"
          onRequestClose={closeEmojiPicker}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={closeEmojiPicker}
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
              <Pressable onPress={(e) => e.stopPropagation()}>
                {showEmojiPicker && (
                  <View style={styles.emojiPickerRow}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => handleReaction(emoji)}
                        style={styles.emojiButton}
                        hitSlop={8}
                      >
                        <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={[styles.actionSheetContent, { overflow: 'hidden' }]}>
                  {Platform.OS === 'ios' ? (
                    <BlurView
                      intensity={80}
                      tint={isDark ? "dark" : "light"}
                      style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.6)' }]}
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)' }]} />
                  )}
                  <Pressable
                    style={[styles.actionItem, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                    onPress={() => selectedMessage && handleReply(selectedMessage)}
                  >
                    <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 15 }}>{t("Reply", "Ответить")}</ThemedText>
                    <Feather name="corner-up-left" size={18} color={isDark ? "#fff" : "#000"} />
                  </Pressable>

                  <Pressable
                    style={[styles.actionItem, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                    onPress={() => selectedMessage && handleCopy(selectedMessage.content)}
                  >
                    <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 15 }}>{t("Copy", "Скопировать")}</ThemedText>
                    <Feather name="copy" size={18} color={isDark ? "#fff" : "#000"} />
                  </Pressable>
                  
                  {selectedMessage?.senderId === user?.id ? (
                    <>
                      <Pressable
                        style={[styles.actionItem, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                        onPress={() => selectedMessage && handleEdit(selectedMessage)}
                      >
                        <ThemedText type="body" style={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: 15 }}>{t("Edit", "Изменить")}</ThemedText>
                        <Feather name="edit-2" size={18} color={isDark ? "#fff" : "#000"} />
                      </Pressable>
                      
                      <Pressable
                        style={[styles.actionItem, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                        onPress={() => selectedMessage && handleDelete(selectedMessage)}
                      >
                        <ThemedText type="body" style={{ flex: 1, color: "#FF453A", fontSize: 15 }}>{t("Delete", "Удалить")}</ThemedText>
                        <Feather name="trash-2" size={18} color="#FF453A" />
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        <Modal
          visible={!!previewImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <Pressable 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Pressable 
              onPress={() => setPreviewImageUrl(null)}
              style={{ position: 'absolute', top: insets.top + Spacing.md, right: Spacing.md, zIndex: 10 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color="#fff" />
              </View>
            </Pressable>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.7 }}
                contentFit="contain"
              />
            ) : null}
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff', overflow: 'hidden' }}>
      {backgroundImage ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: getDirectLink(backgroundImage) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)' }}>
            {chatContent}
          </View>
        </View>
      ) : (
        chatContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  typingIndicatorWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 100,
  },
  typingIndicatorInner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  scrollDownButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 50,
  },
  scrollDownBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    paddingRight: 4,
    minWidth: 180,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 38,
  },
  searchResultsOverlay: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 200,
  },
  searchResultItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "80%",
    marginBottom: Spacing.md,
    position: 'relative',
  },
  messageInner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
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
    gap: Spacing.xs,
  },
  recordingRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 150,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  recordingIndicator: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
  voiceMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 150,
  },
  voicePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceProgress: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  voiceProgressFill: {
    height: "100%",
    borderRadius: 2,
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
  emojiPickerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingTop: 10,
    paddingBottom: 0,
    marginBottom: 2,
    alignItems: 'center',
    gap: 2,
  },
  actionSheetContent: {
    borderRadius: 14,
    paddingVertical: 2,
  },
  emojiButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 26, // Slightly smaller text
    lineHeight: 32, // Controlled line height
    textAlign: 'center',
    includeFontPadding: false, // Android specific
    textAlignVertical: 'center', // Android specific
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  miniAppSuggestions: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  miniAppSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
});
