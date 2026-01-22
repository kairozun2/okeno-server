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
      <Feather name="plus" size={22} color="#fff" />
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
      <Feather name="bell" size={20} color={theme.textSecondary} />
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
      <Feather name="settings" size={20} color={theme.textSecondary} />
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
      <Feather name="edit" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

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
            backgroundColor: Platform.OS === "ios" ? "transparent" : theme.backgroundRoot,
            borderTopWidth: 0,
            elevation: 0,
            height: 50 + insets.bottom,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={60}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerTransparent: true,
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
            headerTitle: () => <HeaderTitle title="Moments" />,
            headerRight: () => <NotificationsButton />,
            tabBarIcon: ({ color }) => (
              <Feather name="home" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatsTab"
          component={ChatsListScreen}
          options={{
            headerTitle: "Чаты",
            headerRight: () => <NewChatButton />,
            tabBarIcon: ({ color }) => (
              <Feather name="message-circle" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            headerTitle: "Профиль",
            headerRight: () => <SettingsButton />,
            tabBarIcon: ({ color }) => (
              <Feather name="user" size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <View style={[styles.fabContainer, { bottom: 60 + insets.bottom }]}>
        <CreatePostButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
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
