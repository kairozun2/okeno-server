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
import { Avatar } from "@/components/Avatar";
import { ThemedText } from "@/components/ThemedText";
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

function ChatHeaderTitle({ name, username, onPress, emoji }: { name?: string; username?: string; emoji?: string; onPress: () => void }) {
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
        <ThemedText type="body" style={{ fontWeight: "600", lineHeight: 18 }}>
          {name || "Пользователь"}
        </ThemedText>
        {username ? (
          <ThemedText type="caption" style={{ opacity: 0.7, lineHeight: 14 }}>
            @{username}
          </ThemedText>
        ) : null}
      </View>
      <View style={{ borderRadius: 20, overflow: "hidden" }}>
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
  const { theme, isDark } = useTheme();
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
            options={({ route, navigation }) => ({
              ...modalOptions,
              headerTitle: () => (
                <ChatHeaderTitle 
                  name={route.params?.otherUserName}
                  username={route.params?.otherUserUsername}
                  emoji={route.params?.otherUserEmoji}
                  onPress={() => {
                    if (route.params?.otherUserId) {
                      navigation.navigate("UserProfile", { userId: route.params.otherUserId });
                    }
                  }}
                />
              ),
              headerTransparent: true,
              headerBackground: () => (
                <BlurView
                  intensity={80}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              ),
              headerRight: () => null,
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              gestureEnabled: false,
            })}
          />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Комментарии",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
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
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Уведомления",
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
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
