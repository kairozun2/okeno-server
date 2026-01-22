import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
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
import { useScreenOptions } from "@/hooks/useScreenOptions";
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
      <Feather name="x" size={24} color={theme.text} />
    </Pressable>
  );
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
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
              presentation: "modal",
              headerTitle: "Chat",
              headerTransparent: true,
              headerBlurEffect: "dark",
              gestureEnabled: false,
              headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
              headerStyle: {
                backgroundColor: 'transparent',
              },
            })}
          />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Comments",
              headerTransparent: true,
              headerBlurEffect: "dark",
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Settings",
              headerTransparent: true,
              headerBlurEffect: "dark",
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              presentation: "modal",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{
              presentation: "modal",
              headerTitle: "New Post",
            }}
          />
          <Stack.Screen
            name="Sessions"
            component={SessionsScreen}
            options={{
              headerTitle: "Active Sessions",
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Notifications",
            }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{
              presentation: "modal",
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
