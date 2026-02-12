import React, { useState, useCallback, useMemo, useLayoutEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, ScrollView, Dimensions, ActivityIndicator, Platform, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { enUS, ru } from "date-fns/locale";

function formatCompactDate(date: Date, language: string) {
  const locale = language === "ru" ? ru : enUS;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return language === "ru" ? "Вчера" : "Yest";
  
  // Compact format: "22 Jan" or "22 Янв"
  return format(date, "d MMM", { locale });
}
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { apiRequest, getImageUrl } from "@/lib/query-client";
import { fetchAndCacheChats } from "@/lib/sync";
import * as Database from "@/lib/database";
import { useRefresh } from "@/contexts/RefreshContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ChatSettings {
  id: string;
  userId: string;
  otherUserId: string;
  nickname: string | null;
  backgroundImage: string | null;
}

interface Chat {
  id: string;
  user1Id: string;
  user2Id: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  emoji: string;
  isVerified?: boolean;
}

interface ChatWithDetails extends Chat {
  isGroup?: boolean;
  name?: string;
  groupEmoji?: string;
  otherUser?: User;
  members?: User[];
  lastMessage?: string;
  unreadCount?: number;
}

const SWIPE_ACTION_WIDTH = 72;

function ChatItem({
  chat,
  onPress,
  onDelete,
  onEditGroup,
  allChatSettings,
  language,
  currentUserId,
  onSwipeOpen,
  closeRef,
}: {
  chat: ChatWithDetails;
  onPress: () => void;
  onDelete: () => void;
  onEditGroup?: () => void;
  allChatSettings: ChatSettings[];
  language: string;
  currentUserId?: string;
  onSwipeOpen: (chatId: string) => void;
  closeRef: React.MutableRefObject<Record<string, () => void>>;
}) {
  const { theme } = useTheme();

  const isGroup = chat.isGroup === true;
  const isGroupAdmin = isGroup && chat.user1Id === currentUserId;
  const actionsCount = isGroupAdmin ? 2 : 1;
  const maxSwipe = SWIPE_ACTION_WIDTH * actionsCount;

  const displayEmoji = isGroup ? (chat.groupEmoji || "🐸") : (chat.otherUser?.emoji || "🐸");
  const displayName = isGroup
    ? (chat.name || "Group")
    : (allChatSettings?.find((s: ChatSettings) => s.otherUserId === chat.otherUser?.id)?.nickname || chat.otherUser?.username || "User");
  const memberCount = isGroup && chat.members ? chat.members.length : 0;

  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, []);

  React.useEffect(() => {
    closeRef.current[chat.id] = closeSwipe;
    return () => {
      delete closeRef.current[chat.id];
    };
  }, [chat.id, closeSwipe, closeRef]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const notifySwipeOpen = () => {
    onSwipeOpen(chat.id);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newX = contextX.value + event.translationX;
      if (newX > 0) {
        translateX.value = 0;
      } else if (newX < -maxSwipe) {
        translateX.value = -maxSwipe;
      } else {
        translateX.value = newX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -40) {
        translateX.value = withSpring(-maxSwipe, { damping: 20, stiffness: 200 });
        runOnJS(triggerHaptic)();
        runOnJS(notifySwipeOpen)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (translateX.value < -10) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      } else {
        runOnJS(onPress)();
        runOnJS(triggerHaptic)();
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    width: -translateX.value > 0 ? -translateX.value : 0,
    opacity: -translateX.value > 10 ? withTiming(1, { duration: 100 }) : withTiming(0, { duration: 100 }),
  }));

  const handleDelete = () => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    onDelete();
  };

  const handleEdit = () => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    if (onEditGroup) onEditGroup();
  };

  return (
    <Animated.View entering={FadeIn} style={{ overflow: 'hidden' }}>
      <Animated.View style={[styles.swipeActionsContainer, actionsStyle]}>
        {isGroupAdmin ? (
          <Pressable
            onPress={handleEdit}
            style={[styles.swipeAction, { backgroundColor: theme.link }]}
          >
            <Feather name="edit-2" size={20} color="#fff" />
            <ThemedText type="caption" style={{ color: "#fff", fontSize: 10, marginTop: 2 }}>
              {language === "ru" ? "Ред." : "Edit"}
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleDelete}
          style={[styles.swipeAction, { backgroundColor: theme.error }]}
        >
          <Feather name="trash-2" size={20} color="#fff" />
          <ThemedText type="caption" style={{ color: "#fff", fontSize: 10, marginTop: 2 }}>
            {language === "ru" ? "Удал." : "Delete"}
          </ThemedText>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.chatItem,
            { backgroundColor: theme.backgroundRoot },
            rowStyle,
          ]}
        >
          <Avatar emoji={displayEmoji} size={44} />
          <View style={styles.chatInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, flexGrow: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
                  <ThemedText type="body" style={styles.chatName} truncate maxLength={12}>
                    {displayName}
                  </ThemedText>
                  {!isGroup && chat.otherUser?.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
                </View>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, flexShrink: 0, marginLeft: Spacing.xs, fontSize: 11 }}>
                {formatCompactDate(new Date(chat.updatedAt), language)}
              </ThemedText>
            </View>
            <View style={styles.chatPreview}>
              {isGroup ? (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: 4 }} truncate maxLength={15}>
                  {memberCount} {language === "ru" ? "уч." : (memberCount === 1 ? "member" : "members")}
                </ThemedText>
              ) : (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: 4 }} truncate maxLength={15}>
                  @{chat.otherUser?.username || "user"}
                </ThemedText>
              )}
              <ThemedText
                type="small"
                numberOfLines={1}
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                • {typeof chat.lastMessage === 'string' ? chat.lastMessage : (language === "ru" ? "Начните разговор" : "Start a conversation")}
              </ThemedText>
              {chat.unreadCount && chat.unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: theme.link }]}>
                  <ThemedText type="caption" style={{ color: "#fff", fontWeight: "600", fontSize: 11 }}>
                    {chat.unreadCount}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function EmptyChats() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={40} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No chats yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Start a conversation by visiting a user's profile
      </ThemedText>
    </View>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ChatsTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ChatsListScreen({ navigation }: Props) {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight() || 64;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { setChatsRefreshing } = useRefresh();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [nickname, setNickname] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [longPressChat, setLongPressChat] = useState<ChatWithDetails | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupEmoji, setEditGroupEmoji] = useState("");

  const swipeCloseRef = useRef<Record<string, () => void>>({});
  const openSwipeIdRef = useRef<string | null>(null);

  const handleSwipeOpen = useCallback((chatId: string) => {
    if (openSwipeIdRef.current && openSwipeIdRef.current !== chatId) {
      const closeFn = swipeCloseRef.current[openSwipeIdRef.current];
      if (closeFn) closeFn();
    }
    openSwipeIdRef.current = chatId;
  }, []);

  const presetBackgrounds = [
    "/uploads/bg-preset-1.png",
    "/uploads/bg-preset-2.png",
    "/uploads/bg-preset-3.png",
    "/uploads/bg-preset-4.png",
    "/uploads/bg-preset-5.png",
    "/uploads/bg-preset-6.png",
  ];

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  // Removed redundant helper function

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: language === "ru" ? "Чаты" : "Chats",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("CreateGroupChat");
            }}
            style={{ padding: Spacing.sm }}
          >
            <Feather name="users" size={20} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettingsModal(true);
            }}
            style={{ padding: Spacing.sm, marginRight: Spacing.sm }}
          >
            <Feather name="edit" size={20} color={theme.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, theme.text, language]);

  const { data: chatsData = [], isLoading } = useQuery<ChatWithDetails[]>({
    queryKey: ["/api/users", user?.id, "chats"],
    queryFn: async () => {
      try {
        const chats = await fetchAndCacheChats(user?.id || "");
        return Array.isArray(chats) ? chats : [];
      } catch (error) {
        console.log("Chats fetch error, trying local database:", error);
        const localChats = await Database.getChats(user?.id || "");
        return localChats as ChatWithDetails[];
      }
    },
    enabled: !!user?.id,
    staleTime: 5000,
    refetchInterval: 3000,
  });

  const { data: allChatSettings = [] } = useQuery<ChatSettings[]>({
    queryKey: ["/api/users", user?.id, "chat-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${user?.id}/chat-settings`, null);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const saveChatSettingsMutation = useMutation({
    mutationFn: async (data: { otherUserId: string; nickname?: string | null; backgroundImage?: string | null; isGlobal?: boolean }) => {
      await apiRequest("POST", `/api/users/${user?.id}/chat-settings`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chat-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chat-settings", variables.otherUserId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSettingsModal(false);
      setSelectedChat(null);
      setNickname("");
      setBackgroundImage(null);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await apiRequest("DELETE", `/api/chats/${chatId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const editGroupMutation = useMutation({
    mutationFn: async ({ chatId, name, groupEmoji }: { chatId: string; name: string; groupEmoji: string }) => {
      await apiRequest("PATCH", `/api/group-chats/${chatId}`, { name, groupEmoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditGroupModal(false);
      setLongPressChat(null);
    },
  });

  const handleDeleteChat = useCallback((chat: ChatWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteChatMutation.mutate(chat.id);
  }, []);

  const handleEditGroup = useCallback((chat: ChatWithDetails) => {
    setLongPressChat(chat);
    setEditGroupName(chat.name || '');
    setEditGroupEmoji(chat.groupEmoji || '🐸');
    setShowEditGroupModal(true);
  }, []);

  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIsUploadingBackground(true);
      
      try {
        const mimeType = asset.mimeType || "image/jpeg";
        const base64data = `data:${mimeType};base64,${asset.base64}`;
        
        const uploadResponse = await apiRequest("POST", "/api/upload", {
          image: base64data,
          type: "background",
        });
        
        const data = await uploadResponse.json();
        if (data.url) {
          setBackgroundImage(data.url);
        } else {
          throw new Error("No URL in upload response");
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setIsUploadingBackground(false);
      }
    }
  };

  const handleSelectChat = (chat: ChatWithDetails) => {
    setSelectedChat(chat);
    const existing = allChatSettings.find(s => s.otherUserId === chat.otherUser?.id);
    setNickname(existing?.nickname || "");
    setBackgroundImage(existing?.backgroundImage || null);
  };

  const handleSaveSettings = async () => {
    if (!selectedChat?.otherUser?.id) return;
    saveChatSettingsMutation.mutate({
      otherUserId: selectedChat.otherUser.id,
      nickname: nickname || null,
      backgroundImage,
      isGlobal,
    });
    try {
      await apiRequest("PATCH", `/api/chats/${selectedChat.id}/background`, { backgroundImage });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", selectedChat.id, "info"] });
    } catch {}
  };

  const handleCloseModal = () => {
    setShowSettingsModal(false);
    setSelectedChat(null);
    setNickname("");
    setBackgroundImage(null);
    setIsGlobal(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setChatsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chats"] });
    setRefreshing(false);
    setChatsRefreshing(false);
  }, [queryClient, user?.id, setChatsRefreshing]);

  const sortedChats = useMemo(() => {
    return [...chatsData].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [chatsData]);

  const renderItem = useCallback(
    ({ item }: { item: ChatWithDetails }) => {
      const isGroupAdmin = item.isGroup === true && item.user1Id === user?.id;
      return (
        <ChatItem
          chat={item}
          allChatSettings={allChatSettings}
          language={language}
          currentUserId={user?.id}
          onPress={() => {
            if (item.isGroup) {
              navigation.navigate("Chat", {
                chatId: item.id,
                isGroupChat: true,
                groupName: item.name,
                groupEmoji: item.groupEmoji,
              });
            } else {
              const settings = allChatSettings.find(s => s.otherUserId === item.otherUser?.id);
              navigation.navigate("Chat", { 
                chatId: item.id,
                otherUserId: item.otherUser?.id,
                otherUserName: item.otherUser?.username,
                otherUserNickname: settings?.nickname,
                otherUserEmoji: item.otherUser?.emoji,
                otherUserUsername: item.otherUser?.username,
              } as any);
            }
          }}
          onDelete={() => handleDeleteChat(item)}
          onEditGroup={isGroupAdmin ? () => handleEditGroup(item) : undefined}
          onSwipeOpen={handleSwipeOpen}
          closeRef={swipeCloseRef}
        />
      );
    },
    [navigation, allChatSettings, language, user?.id, handleSwipeOpen]
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedChats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xs,
          paddingBottom: tabBarHeight + Spacing.lg,
        }}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={!isLoading ? <EmptyChats /> : null}
      />

      <Modal
        visible={showEditGroupModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditGroupModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top - 10 : Spacing.md }]}>
            <Pressable onPress={() => setShowEditGroupModal(false)} style={styles.modalHeaderButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h3" style={styles.modalTitle}>
              {t("Edit Group", "Редактировать группу")}
            </ThemedText>
            <Pressable 
              onPress={() => {
                if (longPressChat) {
                  editGroupMutation.mutate({ chatId: longPressChat.id, name: editGroupName, groupEmoji: editGroupEmoji });
                }
              }}
              style={styles.modalHeaderButton}
              disabled={editGroupMutation.isPending}
            >
              <Feather name="check" size={24} color={theme.link} />
            </Pressable>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ fontSize: 40 }}>{editGroupEmoji}</ThemedText>
              </View>
            </View>
            
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, fontWeight: '500' }}>
              {t("Group Name", "Название группы")}
            </ThemedText>
            <TextInput
              value={editGroupName}
              onChangeText={setEditGroupName}
              placeholder={t("Enter group name...", "Введите название группы...")}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.nicknameInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              maxLength={50}
            />
            
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.xl, fontWeight: '500' }}>
              {t("Group Emoji", "Эмодзи группы")}
            </ThemedText>
            <TextInput
              value={editGroupEmoji}
              onChangeText={(text) => setEditGroupEmoji(text.slice(-2))}
              placeholder="🐸"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.nicknameInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border, fontSize: 32, textAlign: 'center' },
              ]}
              maxLength={4}
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : Spacing.md }]}>
            <View style={styles.modalHeaderButton}>
              {selectedChat && (
                <Pressable onPress={() => setSelectedChat(null)} style={styles.modalHeaderBackButton}>
                  <Feather name="chevron-left" size={24} color={theme.text} />
                </Pressable>
              )}
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>
              {selectedChat ? t("Chat Settings", "Настройки чата") : t("Select Chat", "Выберите чат")}
            </ThemedText>
            <Pressable 
              onPress={selectedChat ? handleSaveSettings : handleCloseModal} 
              style={styles.modalHeaderButton}
              disabled={selectedChat ? (saveChatSettingsMutation.isPending || isUploadingBackground) : false}
            >
              <Feather 
                name={selectedChat ? "check" : "x"} 
                size={24} 
                color={selectedChat ? (isUploadingBackground ? theme.textSecondary : theme.link) : theme.text} 
              />
            </Pressable>
          </View>

          {selectedChat ? (
            <ScrollView 
              style={styles.settingsContent}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            >
              <View style={styles.selectedUserHeader}>
                <Avatar emoji={selectedChat.otherUser?.emoji || "🐸"} size={48} />
                <ThemedText type="h3" style={{ marginTop: Spacing.sm }} truncate maxLength={20}>
                  {selectedChat.otherUser?.username}
                </ThemedText>
              </View>

              <View style={styles.settingSection}>
                <ThemedText type="body" style={[styles.settingLabel, { color: theme.textSecondary }]}>
                  {t("Chat Nickname", "Никнейм в чате")}
                </ThemedText>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder={t("Enter nickname...", "Введите никнейм...")}
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.nicknameInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  maxLength={30}
                />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {t("This nickname is only visible to you", "Этот никнейм виден только вам")}
                </ThemedText>
              </View>

              <View style={styles.settingSection}>
                <ThemedText type="body" style={[styles.settingLabel, { color: theme.textSecondary }]}>
                  {t("Preset Backgrounds", "Готовые фоны")}
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsContainer}>
                  {presetBackgrounds.map((url, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setBackgroundImage(url);
                      }}
                      style={[
                        styles.presetItem,
                        backgroundImage === url && { borderColor: theme.link, borderWidth: 2 }
                      ]}
                    >
                      <Image 
                        source={{ uri: url.startsWith("http") ? url : getImageUrl(url) }} 
                        style={styles.presetImage} 
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.settingSection}>
                <ThemedText type="body" style={[styles.settingLabel, { color: theme.textSecondary }]}>
                  {t("Chat Background", "Фон чата")}
                </ThemedText>
                <Pressable
                  onPress={pickBackgroundImage}
                  style={[styles.backgroundPreview, { borderColor: theme.border }]}
                  disabled={isUploadingBackground}
                >
                  {isUploadingBackground ? (
                    <View style={[styles.backgroundPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                      <ActivityIndicator size="large" color={theme.link} />
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                        {t("Uploading...", "Загрузка...")}
                      </ThemedText>
                    </View>
                  ) : backgroundImage ? (
                    <Image
                      source={{ uri: backgroundImage.startsWith("http") ? backgroundImage : getImageUrl(backgroundImage) }}
                      style={styles.backgroundImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.backgroundPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="image" size={40} color={theme.textSecondary} />
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                        {t("Tap to choose", "Нажмите, чтобы выбрать")}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
                {backgroundImage ? (
                  <Pressable
                    onPress={() => setBackgroundImage(null)}
                    style={[styles.removeButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="trash-2" size={16} color={theme.error} />
                    <ThemedText type="caption" style={{ color: theme.error, marginLeft: Spacing.xs }}>
                      {t("Remove background", "Удалить фон")}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.chatsList}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            >
              <ThemedText type="body" style={[styles.selectHint, { color: theme.textSecondary }]}>
                {t("Select a chat to customize", "Выберите чат для настройки")}
              </ThemedText>
              {sortedChats.map((chat) => (
                <Pressable
                  key={chat.id}
                  onPress={() => handleSelectChat(chat)}
                  style={({ pressed }) => [
                    styles.chatSelectItem,
                    { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                  ]}
                >
                  <Avatar emoji={chat.otherUser?.emoji || "🐸"} size={44} />
                  <View style={styles.chatSelectInfo}>
                    <ThemedText type="body" style={{ fontWeight: "500" }} truncate maxLength={15}>
                      {chat.otherUser?.username || "User"}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }} truncate maxLength={20}>
                      @{chat.otherUser?.username}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              ))}
              {sortedChats.length === 0 && (
                <View style={styles.noChatsContainer}>
                  <Feather name="message-circle" size={40} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}>
                    {t("You have no chats yet", "У вас пока нет чатов")}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  swipeActionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  swipeAction: {
    width: SWIPE_ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  chatName: {
    fontWeight: "500",
  },
  chatPreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  modalHeaderButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderBackButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    flex: 1,
    textAlign: "center",
  },
  chatsList: {
    flex: 1,
  },
  selectHint: {
    textAlign: "center",
    marginVertical: Spacing.lg,
  },
  chatSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chatSelectInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  noChatsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  settingsContent: {
    flex: 1,
  },
  selectedUserHeader: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  settingSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  settingLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  nicknameInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  backgroundPreview: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  backgroundPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
    alignSelf: "center",
  },
  presetsContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  presetItem: {
    width: 60,
    height: 100,
    borderRadius: 8,
    marginRight: Spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetImage: {
    width: "100%",
    height: "100%",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    padding: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
});
