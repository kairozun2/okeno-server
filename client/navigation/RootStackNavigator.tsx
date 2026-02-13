import React, { useEffect, useRef, useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { getApiUrl } from "@/lib/query-client";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthStackNavigator from "@/navigation/AuthStackNavigator";
import ChatScreen from "@/screens/ChatScreen";
import CommentsScreen from "@/screens/CommentsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import UserProfileScreen from "@/screens/UserProfileScreen";
import CreatePostScreen from "@/screens/CreatePostScreen";
import SessionsScreen from "@/screens/SessionsScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import PostDetailScreen from "@/screens/PostDetailScreen";
import QRCodeScreen from "@/screens/QRCodeScreen";
import UserSearchScreen from "@/screens/UserSearchScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import CacheSettingsScreen from "@/screens/CacheSettingsScreen";
import EditPostScreen from "@/screens/EditPostScreen";
import ArchiveScreen from "@/screens/ArchiveScreen";
import SavedPostsScreen from "@/screens/SavedPostsScreen";
import AdminPanelScreen from "@/screens/AdminPanelScreen";
import BlockedUsersScreen from "@/screens/BlockedUsersScreen";
import DebugConsoleScreen from "@/screens/DebugConsoleScreen";
import ThemeSelectionScreen from "@/screens/ThemeSelectionScreen";
import CreateGroupChatScreen from "@/screens/CreateGroupChatScreen";
import GroupChatInfoScreen from "@/screens/GroupChatInfoScreen";
import CallScreen from "@/screens/CallScreen";
import IncomingCallScreen from "@/screens/IncomingCallScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import SupportScreen from "@/screens/SupportScreen";
import MiniAppsScreen from "@/screens/MiniAppsScreen";
import MiniAppViewerScreen from "@/screens/MiniAppViewerScreen";
import { Avatar } from "@/components/Avatar";
import { ThemedText } from "@/components/ThemedText";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useScreenOptions, useModalScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Chat: { chatId: string; otherUserId?: string; otherUserName?: string; otherUserEmoji?: string; otherUserUsername?: string; isGroupChat?: boolean; groupName?: string; groupEmoji?: string };
  Comments: { postId: string };
  Settings: undefined;
  UserProfile: { userId: string };
  CreatePost: undefined;
  Sessions: undefined;
  Notifications: undefined;
  PostDetail: { postId: string };
  QRCode: undefined;
  UserSearch: undefined;
  PrivacyPolicy: undefined;
  CacheSettings: undefined;
  EditPost: { postId: string };
  Archive: undefined;
  SavedPosts: undefined;
  AdminPanel: undefined;
  BlockedUsers: undefined;
  DebugConsole: undefined;
  ThemeSelection: undefined;
  CreateGroupChat: undefined;
  GroupChatInfo: { chatId: string; groupName?: string; groupEmoji?: string; isVerified?: boolean };
  CallScreen: { userId?: string; displayName?: string; displayEmoji?: string; chatId?: string; isIncoming?: boolean };
  IncomingCall: { callerId: string; callerName: string; callerEmoji: string; chatId: string };
  NotificationSettings: undefined;
  Support: undefined;
  MiniApps: undefined;
  MiniAppViewer: { appId: string; appName: string; appUrl: string; appEmoji?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function CloseButton({ onPress }: { onPress: () => void }) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{ borderRadius: 16, overflow: "hidden" }}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 100}
        tint={isDark ? "dark" : "light"}
        style={{ padding: Spacing.sm, borderRadius: 16, backgroundColor: theme.backgroundRoot + 'A0' }}
      >
        <Feather name="x" size={22} color={theme.text} />
      </BlurView>
    </Pressable>
  );
}

function ChatHeaderTitle({ name, username, onPress, emoji, isVerified }: { name?: string; username?: string; emoji?: string; onPress: () => void; isVerified?: boolean }) {
  const { theme, isDark } = useTheme();
  return (
    <Pressable 
      onPress={onPress} 
      style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        flex: 1, 
        justifyContent: "flex-end",
        paddingRight: Spacing.sm,
      }}
    >
      <View style={{ marginRight: Spacing.sm, alignItems: "flex-end" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ThemedText type="body" style={{ fontWeight: "600", lineHeight: 18 }}>
            {name || "Пользователь"}
          </ThemedText>
          {isVerified ? <VerifiedBadge size={14} style={{ marginLeft: 4 }} /> : null}
        </View>
      </View>
      <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)" }}>
        <BlurView
          intensity={Platform.OS === "ios" ? 80 : 100}
          tint={isDark ? "dark" : "light"}
          style={{ padding: 4, borderRadius: 20, backgroundColor: theme.backgroundRoot + 'A0' }}
        >
          <Avatar emoji={emoji || "🐸"} size={32} />
        </BlurView>
      </View>
    </Pressable>
  );
}

function IncomingCallPoller() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const lastCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const poll = async () => {
      try {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/call/incoming/${user.id}`, baseUrl);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.hasCall && data.callerId !== lastCallIdRef.current) {
          lastCallIdRef.current = data.callerId;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.navigate("IncomingCall", {
            callerId: data.callerId,
            callerName: data.callerName,
            callerEmoji: data.callerEmoji,
            chatId: data.chatId,
          });
        } else if (!data.hasCall) {
          lastCallIdRef.current = null;
        }
      } catch {}
    };

    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [user?.id, navigation]);

  return null;
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const modalOptions = useModalScreenOptions();
  const { theme, isDark, chatFullscreen, language } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <React.Fragment>
      {isAuthenticated ? <IncomingCallPoller /> : null}
      <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              headerTitle: () => (
                <ChatHeaderTitle
                  name={(route.params as any).otherUserNickname || (route.params as any).otherUserName}
                  emoji={(route.params as any).otherUserEmoji}
                  isVerified={(route.params as any).otherUserUsername === "admin"}
                  onPress={() => {}}
                />
              ),
              headerShown: false,
              presentation: chatFullscreen ? "card" : "modal",
              animation: chatFullscreen ? "slide_from_right" : "slide_from_bottom",
              gestureEnabled: true,
              contentStyle: { backgroundColor: '#000' },
            })}
          />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Настройки",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Новая публикация",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Sessions"
            component={SessionsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Активные сеансы",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="QRCode"
            component={QRCodeScreen}
            options={{
              headerShown: false,
              presentation: "transparentModal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="UserSearch"
            component={UserSearchScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: language === "ru" ? "Уведомления и звук" : "Notifications & Sound",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: language === "ru" ? "Помощь и поддержка" : "Help & Support",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="CacheSettings"
            component={CacheSettingsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Данные и память",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="EditPost"
            component={EditPostScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Редактировать",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="Archive"
            component={ArchiveScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Архив",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="SavedPosts"
            component={SavedPostsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Сохранённые",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Blocked Users",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="DebugConsole"
            component={DebugConsoleScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Debug Console",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="ThemeSelection"
            component={ThemeSelectionScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Оформление",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="CreateGroupChat"
            component={CreateGroupChatScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="GroupChatInfo"
            component={GroupChatInfoScreen}
            options={({ navigation }) => ({
              ...screenOptions,
              headerTitle: "",
            })}
          />
          <Stack.Screen
            name="MiniApps"
            component={MiniAppsScreen}
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="MiniAppViewer"
            component={MiniAppViewerScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="CallScreen"
            component={CallScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="IncomingCall"
            component={IncomingCallScreen}
            options={{
              headerShown: false,
              animation: "fade",
              gestureEnabled: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStackNavigator}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
    </React.Fragment>
  );
}
