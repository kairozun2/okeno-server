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
      <Feather name="plus" size={24} color="#fff" />
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
                intensity={80}
                tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerTransparent: true,
          headerBlurEffect: isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight",
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
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatsTab"
          component={ChatsListScreen}
          options={{
            headerTitle: "Chats",
            headerRight: () => <NewChatButton />,
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            headerTitle: "Profile",
            headerRight: () => <SettingsButton />,
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={24} color={color} />
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
