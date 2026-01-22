import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Session {
  id: string;
  userId: string;
  deviceInfo: string | null;
  createdAt: string;
  lastActive: string;
}

function SessionItem({
  session,
  isCurrentSession,
  onTerminate,
}: {
  session: Session;
  isCurrentSession: boolean;
  onTerminate: () => void;
}) {
  const { theme } = useTheme();

  const getDeviceIcon = (deviceInfo: string | null): keyof typeof Feather.glyphMap => {
    if (!deviceInfo) return "smartphone";
    const lower = deviceInfo.toLowerCase();
    if (lower.includes("iphone") || lower.includes("ipad")) return "smartphone";
    if (lower.includes("android")) return "smartphone";
    if (lower.includes("mac") || lower.includes("windows")) return "monitor";
    return "smartphone";
  };

  return (
    <Animated.View
      entering={FadeIn}
      style={[styles.sessionItem, { backgroundColor: theme.cardBackground }]}
    >
      <View
        style={[styles.deviceIcon, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Feather
          name={getDeviceIcon(session.deviceInfo)}
          size={20}
          color={isCurrentSession ? theme.link : theme.text}
        />
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionHeader}>
          <ThemedText type="small" style={[styles.deviceName, { flex: 1 }]} numberOfLines={1}>
            {session.deviceInfo || "Device"}
          </ThemedText>
          {isCurrentSession ? (
            <View style={[styles.currentBadge, { backgroundColor: theme.success }]}>
              <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700", fontSize: 9 }}>
                ACTIVE
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
          Active {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true, locale: enUS })}
        </ThemedText>
      </View>
      {!isCurrentSession ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onTerminate();
          }}
          style={styles.terminateButton}
        >
          <Feather name="x" size={18} color={theme.error} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Sessions">;

export default function SessionsScreen({ navigation }: Props) {
  const { theme, language } = useTheme();
  const { user, sessionId } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("Active Sessions", "Активные сессии"),
      headerLeft: () => (
        <Pressable 
          onPress={() => navigation.goBack()}
          hitSlop={20}
          style={{ 
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 0,
          }}
        >
          <Feather name="chevron-left" size={28} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme.text, language]);

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/users", user?.id, "sessions"],
    enabled: !!user?.id,
  });

  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionIdToTerminate: string) => {
      await apiRequest("DELETE", `/api/sessions/${sessionIdToTerminate}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "sessions"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const terminateAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${user?.id}/sessions`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "sessions"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleTerminateSession = (session: Session) => {
    Alert.alert(
      "Terminate Session",
      "Are you sure you want to terminate this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate",
          style: "destructive",
          onPress: () => terminateSessionMutation.mutate(session.id),
        },
      ]
    );
  };

  const handleTerminateAll = () => {
    Alert.alert(
      "Terminate All Sessions",
      "This will sign you out from all devices except this one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate All",
          style: "destructive",
          onPress: () => terminateAllMutation.mutate(),
        },
      ]
    );
  };

  const otherSessions = sessions.filter((s) => s.id !== sessionId);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <ThemedText
          type="caption"
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          CURRENT SESSION
        </ThemedText>
        {sessions
          .filter((s) => s.id === sessionId)
          .map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isCurrentSession={true}
              onTerminate={() => {}}
            />
          ))}

        {otherSessions.length > 0 ? (
          <>
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}
            >
              OTHER SESSIONS
            </ThemedText>
            {otherSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isCurrentSession={false}
                onTerminate={() => handleTerminateSession(session)}
              />
            ))}

            <Button
              onPress={handleTerminateAll}
              style={[styles.terminateAllButton, { backgroundColor: theme.error }]}
              textStyle={{ fontSize: 14 }}
            >
              Terminate all other sessions
            </Button>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  deviceName: {
    fontWeight: "500",
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  terminateButton: {
    padding: Spacing.sm,
  },
  terminateAllButton: {
    marginTop: Spacing.xl,
  },
});
