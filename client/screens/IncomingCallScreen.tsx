import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";

export default function IncomingCallScreen({ route, navigation }: any) {
  const { callerId, callerName, callerEmoji, chatId } = route.params || {};
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answeredRef = useRef(false);

  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);

  useEffect(() => {
    pulse1.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
    pulse2.value = withDelay(500,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      )
    );
    pulse3.value = withDelay(1000,
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, []);

  useEffect(() => {
    dismissTimerRef.current = setTimeout(() => {
      if (!answeredRef.current) {
        navigation.goBack();
      }
    }, 25000);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 2 - pulse1.value,
  }));
  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 2 - pulse2.value,
  }));
  const pulseStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse3.value }],
    opacity: 2 - pulse3.value,
  }));

  const handleAccept = async () => {
    answeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiRequest("POST", "/api/call/answer", { userId: user?.id });
    } catch {}
    navigation.replace("CallScreen", {
      userId: callerId,
      displayName: callerName,
      displayEmoji: callerEmoji,
      chatId,
      isIncoming: true,
    });
  };

  const handleDecline = async () => {
    answeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await apiRequest("POST", "/api/call/answer", { userId: user?.id });
    } catch {}
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <LinearGradient
        colors={[
          isDark ? 'rgba(52, 120, 246, 0.3)' : 'rgba(52, 120, 246, 0.2)',
          isDark ? 'rgba(20, 20, 40, 0.95)' : 'rgba(240, 242, 255, 0.95)',
          isDark ? '#000' : '#f0f2ff',
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.avatarSection, { marginTop: insets.top + 80 }]}>
        <View style={styles.pulseContainer}>
          <Animated.View style={[styles.pulseRing, pulseStyle3, { borderColor: theme.accent + '15' }]} />
          <Animated.View style={[styles.pulseRing, pulseStyle2, { borderColor: theme.accent + '25' }]} />
          <Animated.View style={[styles.pulseRing, pulseStyle1, { borderColor: theme.accent + '40' }]} />

          <View style={styles.avatarWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={30}
                tint="dark"
                style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]}
              />
            ) : null}
            <Avatar emoji={callerEmoji || "?"} size={80} />
          </View>
        </View>

        <ThemedText type="h2" style={[styles.nameText, { color: theme.text }]}>
          {callerName || t("User", "Pользователь")}
        </ThemedText>

        <Animated.View entering={FadeIn.duration(500)}>
          <ThemedText type="body" style={[styles.statusText, { color: theme.accent }]}>
            {t("Incoming call", "Входящий звонок")}
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View
        entering={SlideInDown.duration(400).springify()}
        style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.controlsRow}>
          <View style={styles.buttonColumn}>
            <Pressable
              onPress={handleDecline}
              style={styles.actionButton}
              testID="button-decline-call"
            >
              <LinearGradient
                colors={['#FF4444', '#CC0000']}
                style={[StyleSheet.absoluteFill, { borderRadius: 35 }]}
              />
              <Feather name="phone-off" size={28} color="#fff" />
            </Pressable>
            <ThemedText type="caption" style={[styles.buttonLabel, { color: theme.textSecondary }]}>
              {t("Decline", "Отклонить")}
            </ThemedText>
          </View>

          <View style={styles.buttonColumn}>
            <Pressable
              onPress={handleAccept}
              style={styles.actionButton}
              testID="button-accept-call"
            >
              <LinearGradient
                colors={['#34C759', '#248A3D']}
                style={[StyleSheet.absoluteFill, { borderRadius: 35 }]}
              />
              <Feather name="phone" size={28} color="#fff" />
            </Pressable>
            <ThemedText type="caption" style={[styles.buttonLabel, { color: theme.textSecondary }]}>
              {t("Accept", "Принять")}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    flex: 1,
  },
  pulseContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  controls: {
    paddingHorizontal: Spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
  },
  buttonColumn: {
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
