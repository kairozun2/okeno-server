import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

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
import AdminPanelScreen from "@/screens/AdminPanelScreen";
import BlockedUsersScreen from "@/screens/BlockedUsersScreen";
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
  Chat: { chatId: string; otherUserId?: string; otherUserName?: string; otherUserEmoji?: string; otherUserUsername?: string };
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
  AdminPanel: undefined;
  BlockedUsers: undefined;
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
        intensity={60}
        tint={isDark ? "dark" : "light"}
        style={{ padding: Spacing.sm, borderRadius: 16 }}
      >
        <Feather name="x" size={22} color={theme.text} />
      </BlurView>
    </Pressable>
  );
}

function ChatHeaderTitle({ name, username, onPress, emoji, isVerified }: { name?: string; username?: string; emoji?: string; onPress: () => void; isVerified?: boolean }) {
  const { isDark } = useTheme();
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
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={{ padding: 4, borderRadius: 20 }}
        >
          <Avatar emoji={emoji || "🐸"} size={32} />
        </BlurView>
      </View>
    </Pressable>
  );
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const modalOptions = useModalScreenOptions();
  const { theme, isDark, chatFullscreen } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
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
                  name={(route.params as any).otherUserName}
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
              presentation: "modal",
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
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStackNavigator}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
