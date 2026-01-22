import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
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
import { useScreenOptions, useModalScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Chat: { chatId: string };
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
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{ padding: Spacing.sm }}
    >
      <Feather name="x" size={22} color={theme.text} />
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
            options={({ navigation }) => ({
              ...modalOptions,
              headerTitle: "Chat",
              gestureEnabled: false,
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{
              ...modalOptions,
              headerTitle: "Comments",
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              ...modalOptions,
              headerTitle: "Settings",
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              ...modalOptions,
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{
              ...modalOptions,
              headerTitle: "New Post",
            }}
          />
          <Stack.Screen
            name="Sessions"
            component={SessionsScreen}
            options={{
              ...modalOptions,
              headerTitle: "Active Sessions",
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              ...modalOptions,
              headerTitle: "Notifications",
            }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{
              ...modalOptions,
              headerTitle: "",
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
  );
}
