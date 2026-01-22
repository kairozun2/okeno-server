import React, { useState, useCallback, useMemo, useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, ScrollView, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
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
import { apiRequest } from "@/lib/query-client";
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
  otherUser?: User;
  lastMessage?: string;
  unreadCount?: number;
}

function ChatItem({
  chat,
  onPress,
  allChatSettings,
  language,
}: {
  chat: ChatWithDetails;
  onPress: () => void;
  allChatSettings: ChatSettings[];
  language: string;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.chatItem,
          {
            backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
          },
        ]}
      >
        <Avatar emoji={chat.otherUser?.emoji || "🐸"} size={44} />
        <View style={styles.chatInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, flexGrow: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
                <ThemedText type="body" style={styles.chatName} truncate maxLength={12}>
                  {allChatSettings?.find((s: ChatSettings) => s.otherUserId === chat.otherUser?.id)?.nickname || chat.otherUser?.username || "User"}
                </ThemedText>
                {chat.otherUser?.isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
              </View>
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary, flexShrink: 0, marginLeft: Spacing.xs, fontSize: 11 }}>
              {formatCompactDate(new Date(chat.updatedAt), language)}
            </ThemedText>
          </View>
          <View style={styles.chatPreview}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: 4 }} truncate maxLength={15}>
              @{chat.otherUser?.username || "user"}
            </ThemedText>
            <ThemedText
              type="small"
              numberOfLines={1}
              style={{ color: theme.textSecondary, flex: 1 }}
            >
              • {typeof chat.lastMessage === 'string' ? chat.lastMessage : "Start a conversation"}
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
      </Pressable>
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

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const presetBackgrounds = [
    "https://www.imgbly.com/7LrPlX4Iji8B7My.png",
    "https://www.imgbly.com/dXlgA0NxiQ0OQrf.png",
    "https://www.imgbly.com/LfiUT8bTrfnCxxi.png",
    "https://www.imgbly.com/Oe0Zr0pZL1AaiYc.png",
    "https://www.imgbly.com/DtLmUPp1J7D93Y6.png",
    "https://www.imgbly.com/sXwxiUNCKhTknmC.png"
  ];

  // Helper function to get direct image links for imgbly
  const getDirectLink = (url: string) => {
    if (url.includes("imgbly.com") && !url.includes("i.imgbly.com")) {
      return url.replace("www.imgbly.com", "i.imgbly.com");
    }
    return url;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: language === "ru" ? "Чаты" : "Chats",
      headerRight: () => (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSettingsModal(true);
          }}
          style={{ padding: Spacing.sm, marginRight: Spacing.sm }}
        >
          <Feather name="edit" size={20} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme.text, language]);

  const { data: chatsData = [], isLoading } = useQuery<ChatWithDetails[]>({
    queryKey: ["/api/users", user?.id, "chats"],
    enabled: !!user?.id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "chat-settings"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSettingsModal(false);
      setSelectedChat(null);
      setNickname("");
      setBackgroundImage(null);
    },
  });

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  const handleSelectChat = (chat: ChatWithDetails) => {
    setSelectedChat(chat);
    const existing = allChatSettings.find(s => s.otherUserId === chat.otherUser?.id);
    setNickname(existing?.nickname || "");
    setBackgroundImage(existing?.backgroundImage || null);
  };

  const handleSaveSettings = () => {
    if (!selectedChat?.otherUser?.id) return;
    saveChatSettingsMutation.mutate({
      otherUserId: selectedChat.otherUser.id,
      nickname: nickname || null,
      backgroundImage,
      isGlobal,
    });
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
      return (
        <ChatItem
          chat={item}
          allChatSettings={allChatSettings}
          language={language}
          onPress={() => navigation.navigate("Chat", { 
            chatId: item.id,
            otherUserId: item.otherUser?.id,
            otherUserName: item.otherUser?.username,
            otherUserEmoji: item.otherUser?.emoji,
            otherUserUsername: item.otherUser?.username, // Pass the username too
          })}
        />
      );
    },
    [navigation, allChatSettings, language]
  );

  return (
    <ThemedView style={styles.container}>
      <FlashList
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
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
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
              disabled={selectedChat ? saveChatSettingsMutation.isPending : false}
            >
              <Feather 
                name={selectedChat ? "check" : "x"} 
                size={24} 
                color={selectedChat ? theme.link : theme.text} 
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
                        source={{ uri: getDirectLink(url) }} 
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
                >
                  {backgroundImage ? (
                    <Image
                      source={{ uri: getDirectLink(backgroundImage) }}
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
