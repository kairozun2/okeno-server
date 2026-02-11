import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import FeedScreen from "@/screens/FeedScreen";
import ChatsListScreen from "@/screens/ChatsListScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { RefreshableTitle } from "@/components/RefreshableTitle";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackNavigator";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { useRefresh } from "@/contexts/RefreshContext";

export type MainTabParamList = {
  FeedTab: undefined;
  ChatsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function CreatePostButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (iconOnly) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("CreatePost");
        }}
        style={styles.headerButton}
      >
        <Feather name="plus" size={22} color={theme.text} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("CreatePost");
      }}
      style={[styles.fabButton, { backgroundColor: theme.link }]}
    >
      <Feather name="plus" size={22} color="#fff" />
    </Pressable>
  );
}

function SearchButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("UserSearch");
      }}
      style={styles.headerButton}
    >
      <Feather name="search" size={20} color={theme.text} />
    </Pressable>
  );
}

function NotificationsButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("Notifications");
      }}
      style={styles.headerButton}
    >
      <Feather name="bell" size={20} color={theme.text} />
    </Pressable>
  );
}

function SettingsButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("Settings");
      }}
      style={styles.headerButton}
    >
      <Feather name="settings" size={20} color={theme.text} />
    </Pressable>
  );
}

function EditChatButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.headerButton, { marginRight: Spacing.sm }]}
    >
      <Feather name="edit" size={20} color={theme.text} />
    </Pressable>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark, language } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { feedRefreshing, chatsRefreshing } = useRefresh();
  const [showPlus, setShowPlus] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/users", user?.id, "unread-messages"],
    queryFn: async () => {
      if (!user?.id) return { count: 0 };
      const url = new URL(`/api/users/${user.id}/unread-messages`, getApiUrl());
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Poll every 5 seconds for stability and free tier
  });

  const unreadCount = unreadData?.count || 0;

  const headerBackground = () => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundRoot }]} />
  );

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="FeedTab"
        screenOptions={{
          tabBarActiveTintColor: theme.link,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: theme.backgroundRoot,
            borderTopWidth: 0,
            elevation: 0,
            height: 50 + insets.bottom,
          },
          tabBarItemStyle: {
            paddingTop: 16,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundRoot }]} />
          ),
          headerTransparent: true,
          headerBackground,
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 17,
          },
        }}
      >
        <Tab.Screen
          name="FeedTab"
          component={FeedScreen}
          options={{
            headerTitle: () => (
              <HeaderTitle 
                title={language === "ru" ? "Okeno" : "Okeno"} 
                onFadeComplete={() => setShowPlus(true)} 
                refreshing={feedRefreshing}
              />
            ),
            headerLeft: () => (
              <View style={{ marginLeft: Spacing.sm, width: 40 }}>
                {showPlus ? (
                  <Animated.View entering={FadeIn} exiting={FadeOut}>
                    <CreatePostButton iconOnly />
                  </Animated.View>
                ) : null}
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <SearchButton />
                <NotificationsButton />
              </View>
            ),
            tabBarIcon: ({ color }) => (
              <Feather name="home" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatsTab"
          component={ChatsListScreen}
          options={{
            headerTitle: () => (
              <RefreshableTitle 
                title={language === "ru" ? "Чаты" : "Chats"} 
                refreshing={chatsRefreshing}
              />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.error,
              fontSize: 10,
              lineHeight: 14,
              marginTop: Platform.OS === 'ios' ? -2 : 0,
            },
            tabBarIcon: ({ color }) => (
              <Feather name="message-circle" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Feather name="user" size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: Spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
