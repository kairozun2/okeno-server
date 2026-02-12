import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Dimensions, FlatList, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { apiRequest, getApiUrl, getImageUrl } from "@/lib/query-client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - 4) / 3;

type Props = NativeStackScreenProps<RootStackParamList, "GroupChatInfo">;

type MediaTab = "photos" | "voice" | "links";

interface MediaMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number | null;
  createdAt: string;
}

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    username: string;
    emoji: string;
    isVerified?: boolean;
  };
}

export default function GroupChatInfoScreen({ navigation, route }: Props) {
  const { chatId, groupName, groupEmoji } = route.params;
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [activeTab, setActiveTab] = useState<MediaTab>("photos");

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const membersQuery = useQuery<GroupMember[]>({
    queryKey: ["/api/group-chats", chatId, "members"],
    queryFn: async () => {
      const url = new URL(`/api/group-chats/${chatId}/members`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!chatId,
    staleTime: 30000,
  });

  const mediaQuery = useQuery<MediaMessage[]>({
    queryKey: ["/api/chats", chatId, "media", activeTab],
    queryFn: async () => {
      const url = new URL(`/api/chats/${chatId}/media?type=${activeTab}`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    enabled: !!chatId,
    staleTime: 15000,
  });

  const membersMap = useMemo(() => {
    const map: Record<string, { username: string; emoji: string }> = {};
    if (membersQuery.data) {
      membersQuery.data.forEach((m) => {
        if (m.userId && m.user) {
          map[m.userId] = { username: m.user.username, emoji: m.user.emoji };
        }
      });
    }
    return map;
  }, [membersQuery.data]);

  const extractLinks = useCallback((content: string): string[] => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return content.match(urlRegex) || [];
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={20}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="chevron-left" size={28} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme.text]);

  const tabs: { key: MediaTab; label: string; icon: string }[] = [
    { key: "photos", label: t("Photos", "Фото"), icon: "image" },
    { key: "voice", label: t("Voice", "Голосовые"), icon: "mic" },
    { key: "links", label: t("Links", "Ссылки"), icon: "link" },
  ];

  const renderPhotoItem = useCallback(({ item }: { item: MediaMessage }) => {
    if (!item.imageUrl) return null;
    const imageUrl = getImageUrl(item.imageUrl);
    if (!imageUrl) return null;
    return (
      <Pressable
        style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 4, overflow: 'hidden', margin: 1 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </Pressable>
    );
  }, []);

  const renderVoiceItem = useCallback(({ item }: { item: MediaMessage }) => {
    const sender = membersMap[item.senderId];
    const duration = item.voiceDuration || 0;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return (
      <View style={[styles.mediaRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.voiceIcon, { backgroundColor: theme.link + '20' }]}>
          <Feather name="mic" size={18} color={theme.link} />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText type="body" style={{ fontWeight: '500' }}>
            {sender?.username || t("User", "Пользователь")}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {`${mins}:${secs.toString().padStart(2, '0')}`} · {format(new Date(item.createdAt), "d MMM, HH:mm")}
          </ThemedText>
        </View>
      </View>
    );
  }, [membersMap, theme]);

  const renderLinkItem = useCallback(({ item }: { item: MediaMessage }) => {
    const links = extractLinks(item.content);
    const sender = membersMap[item.senderId];
    return (
      <View>
        {links.map((link, i) => (
          <Pressable
            key={`${item.id}-${i}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL(link);
            }}
            style={[styles.mediaRow, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.voiceIcon, { backgroundColor: theme.link + '20' }]}>
              <Feather name="external-link" size={18} color={theme.link} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="small" style={{ color: theme.link }} numberOfLines={1}>
                {link}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {sender?.username || t("User", "Пользователь")} · {format(new Date(item.createdAt), "d MMM, HH:mm")}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }, [membersMap, theme, extractLinks]);

  const media = mediaQuery.data || [];

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.emojiContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={styles.emojiText}>{groupEmoji || "🐸"}</ThemedText>
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            {groupName || t("Group", "Группа")}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {membersQuery.data ? `${membersQuery.data.length} ${t("members", "участников")}` : ""}
          </ThemedText>
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: '600', marginBottom: Spacing.sm }}>
            {t("MEMBERS", "УЧАСТНИКИ")}
          </ThemedText>
          <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12, overflow: 'hidden' }}>
            {membersQuery.isLoading ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.link} />
              </View>
            ) : (membersQuery.data || []).map((member, index) => {
              const isLast = index === (membersQuery.data?.length || 0) - 1;
              const isAdmin = member.role === "admin";
              return (
                <Pressable
                  key={member.id}
                  onPress={() => {
                    if (member.userId !== user?.id) {
                      navigation.navigate("UserProfile", { userId: member.userId });
                    }
                  }}
                  style={[styles.memberRow, { borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
                >
                  <Avatar emoji={member.user?.emoji || "🐸"} size={40} />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>
                        {member.user?.username || "User"}
                      </ThemedText>
                      {member.user?.isVerified ? <VerifiedBadge size={14} /> : null}
                    </View>
                    <ThemedText type="caption" style={{ color: isAdmin ? theme.link : theme.textSecondary }}>
                      {isAdmin ? t("Admin", "Админ") : t("Member", "Участник")}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
          <View style={{ flexDirection: 'row', backgroundColor: theme.backgroundSecondary, borderRadius: 10, padding: 3 }}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: activeTab === tab.key ? theme.cardBackground : 'transparent',
                    borderRadius: 8,
                  },
                ]}
              >
                <Feather name={tab.icon as any} size={14} color={activeTab === tab.key ? theme.text : theme.textSecondary} />
                <ThemedText
                  type="caption"
                  style={{
                    color: activeTab === tab.key ? theme.text : theme.textSecondary,
                    fontWeight: activeTab === tab.key ? '600' : '400',
                    marginLeft: 4,
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: Spacing.md }}>
            {mediaQuery.isLoading ? (
              <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.link} />
              </View>
            ) : media.length === 0 ? (
              <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                <Feather
                  name={activeTab === "photos" ? "image" : activeTab === "voice" ? "mic" : "link"}
                  size={32}
                  color={theme.textSecondary}
                />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  {activeTab === "photos" ? t("No photos yet", "Нет фотографий") :
                   activeTab === "voice" ? t("No voice messages yet", "Нет голосовых сообщений") :
                   t("No links yet", "Нет ссылок")}
                </ThemedText>
              </View>
            ) : activeTab === "photos" ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {media.map((item) => (
                  <View key={item.id}>
                    {renderPhotoItem({ item })}
                  </View>
                ))}
              </View>
            ) : activeTab === "voice" ? (
              <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12, overflow: 'hidden' }}>
                {media.map((item) => (
                  <View key={item.id}>{renderVoiceItem({ item })}</View>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12, overflow: 'hidden' }}>
                {media.map((item) => (
                  <View key={item.id}>{renderLinkItem({ item })}</View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emojiContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  emojiText: {
    fontSize: 48,
    lineHeight: 58,
    textAlign: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
