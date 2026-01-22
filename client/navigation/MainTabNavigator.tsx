import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import FeedScreen from "@/screens/FeedScreen";
import ChatsListScreen from "@/screens/ChatsListScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Spacing } from "@/constants/theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackNavigator";
import { useNavigation } from "@react-navigation/native";

export type MainTabParamList = {
  FeedTab: undefined;
  ChatsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function CreatePostButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("CreatePost");
      }}
      style={[styles.fabButton, { backgroundColor: theme.link }]}
    >
      <Feather name="plus" size={28} color="#fff" />
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
      <Feather name="bell" size={22} color={theme.text} />
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
      <Feather name="settings" size={22} color={theme.text} />
    </Pressable>
  );
}

function NewChatButton() {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={styles.headerButton}
    >
      <Feather name="edit" size={22} color={theme.text} />
    </Pressable>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const screenOptions = useScreenOptions();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="FeedTab"
        screenOptions={{
          tabBarActiveTintColor: theme.tabIconSelected,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
            }),
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          ...screenOptions,
        }}
      >
        <Tab.Screen
          name="FeedTab"
          component={FeedScreen}
          options={{
            title: "Feed",
            headerTitle: () => <HeaderTitle title="Moments" />,
            headerRight: () => <NotificationsButton />,
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatsTab"
          component={ChatsListScreen}
          options={{
            title: "Chats",
            headerTitle: "Chats",
            headerRight: () => <NewChatButton />,
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            title: "Profile",
            headerTitle: "Profile",
            headerRight: () => <SettingsButton />,
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <View style={[styles.fabContainer, { bottom: 80 + insets.bottom }]}>
        <CreatePostButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
