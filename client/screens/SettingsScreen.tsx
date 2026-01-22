import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingItem {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

function SettingRow({ item }: { item: SettingItem }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: pressed
            ? theme.backgroundSecondary
            : theme.cardBackground,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather
          name={item.icon}
          size={20}
          color={item.danger ? theme.error : theme.text}
        />
      </View>
      <View style={styles.settingInfo}>
        <ThemedText
          type="body"
          style={[
            styles.settingTitle,
            item.danger ? { color: theme.error } : null,
          ]}
        >
          {item.title}
        </ThemedText>
        {item.subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {item.subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleCopyId = async () => {
    if (user?.id) {
      await Clipboard.setStringAsync(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied", "Your ID has been copied to clipboard");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const sections: SettingSection[] = [
    {
      title: "Account",
      items: [
        {
          icon: "user",
          title: "Account",
          subtitle: "ID recovery and account settings",
          onPress: handleCopyId,
        },
      ],
    },
    {
      title: "Privacy",
      items: [
        {
          icon: "shield",
          title: "Privacy & Security",
          subtitle: "Permissions and data protection",
          onPress: () => {},
        },
        {
          icon: "smartphone",
          title: "Active Sessions",
          subtitle: "Manage devices",
          onPress: () => navigation.navigate("Sessions"),
        },
      ],
    },
    {
      title: "Archive",
      items: [
        {
          icon: "archive",
          title: "Archive",
          subtitle: "View archived posts",
          onPress: () => {},
        },
        {
          icon: "eye-off",
          title: "Hidden Users",
          subtitle: "Manage hidden users",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "volume-2",
          title: "Sound Effects",
          subtitle: "Disabled",
          onPress: () => {},
        },
        {
          icon: "moon",
          title: "Appearance",
          subtitle: "System",
          onPress: () => {},
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: "log-out",
          title: "Sign Out",
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
    >
      <Animated.View entering={FadeIn} style={styles.profileSection}>
        <Avatar emoji={user?.emoji || "🐸"} size={80} />
        <ThemedText type="h3" style={styles.username}>
          {user?.username}
        </ThemedText>
        <Pressable onPress={handleCopyId} style={styles.idRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {user?.id}
          </ThemedText>
          <Feather name="copy" size={14} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>

      {sections.map((section, sectionIndex) => (
        <Animated.View
          key={sectionIndex}
          entering={FadeIn.delay(sectionIndex * 50)}
          style={styles.section}
        >
          {section.title ? (
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {section.title.toUpperCase()}
            </ThemedText>
          ) : null}
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: theme.cardBackground, borderRadius: BorderRadius.lg },
            ]}
          >
            {section.items.map((item, itemIndex) => (
              <React.Fragment key={itemIndex}>
                <SettingRow item={item} />
                {itemIndex < section.items.length - 1 ? (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.border },
                    ]}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  username: {
    marginTop: Spacing.md,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.md,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  sectionContent: {
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginLeft: 36 + Spacing.lg + Spacing.md,
  },
});
