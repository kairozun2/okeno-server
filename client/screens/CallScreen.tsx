import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dialingSource = require("../../assets/audio/dialing.wav");

export default function CallScreen({ route, navigation }: any) {
  const { userId, displayName, displayEmoji, chatId, isIncoming } = route.params || {};
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const [callState, setCallState] = useState<"connecting" | "ringing" | "connected" | "declined" | "unavailable">(isIncoming ? "connected" : "connecting");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const missedCallSentRef = useRef(false);
  const connectedTimeRef = useRef(0);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unavailableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialingPlayer = useAudioPlayer(isIncoming ? null : dialingSource);

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

  const cleanupCallTimers = () => {
    if (ringingTimerRef.current) { clearTimeout(ringingTimerRef.current); ringingTimerRef.current = null; }
    if (unavailableTimerRef.current) { clearTimeout(unavailableTimerRef.current); unavailableTimerRef.current = null; }
    if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
    try { if (dialingPlayer) dialingPlayer.pause(); } catch {}
  };

  const initiateCall = () => {
    cleanupCallTimers();

    setCallState("connecting");
    setElapsed(0);
    missedCallSentRef.current = false;

    if (chatId && userId && user?.id) {
      apiRequest("POST", "/api/call/end", { recipientId: userId })
        .catch(() => {})
        .finally(() => {
          apiRequest("POST", "/api/call", {
            callerId: user.id,
            recipientId: userId,
            chatId,
          }).catch(() => {});
        });
    }

    ringingTimerRef.current = setTimeout(() => {
      setCallState("ringing");
      try { if (dialingPlayer) dialingPlayer.play(); } catch {}
    }, 2000);

    unavailableTimerRef.current = setTimeout(() => {
      setCallState(prev => (prev === "connected" || prev === "declined") ? prev : "unavailable");
      try { if (dialingPlayer) dialingPlayer.pause(); } catch {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 30000);

    statusPollRef.current = setInterval(async () => {
      try {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/call/status/${userId}`, baseUrl);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "answered") {
          setCallState("connected");
          connectedTimeRef.current = Date.now();
          try { if (dialingPlayer) dialingPlayer.pause(); } catch {}
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (unavailableTimerRef.current) clearTimeout(unavailableTimerRef.current);
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        } else if (data.status === "declined") {
          setCallState("declined");
          try { if (dialingPlayer) dialingPlayer.pause(); } catch {}
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (unavailableTimerRef.current) clearTimeout(unavailableTimerRef.current);
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        } else if (!data.exists) {
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        }
      } catch {}
    }, 1500);
  };

  useEffect(() => {
    if (isIncoming) return;

    try {
      if (dialingPlayer) {
        dialingPlayer.loop = true;
        dialingPlayer.volume = 0.5;
      }
    } catch {}

    initiateCall();

    return () => {
      cleanupCallTimers();
      if (userId) {
        apiRequest("POST", "/api/call/end", { recipientId: userId }).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendMissedCall = async () => {
    if (missedCallSentRef.current || !chatId || !user?.id) return;
    missedCallSentRef.current = true;
    try {
      await apiRequest("POST", "/api/messages", {
        chatId,
        senderId: user.id,
        content: `📞 ${t("Missed call", "Пропущенный звонок")}`,
      });
    } catch {}
  };

  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (callState === "unavailable" || callState === "ringing") {
      await sendMissedCall();
    }
    if (userId) {
      apiRequest("POST", "/api/call/end", { recipientId: userId }).catch(() => {});
    }
    navigation.goBack();
  };

  useEffect(() => {
    if (callState === "unavailable") {
      sendMissedCall();
    }
  }, [callState]);

  const statusText = callState === "connecting"
    ? t("Connecting...", "Подключение...")
    : callState === "ringing"
    ? t("Ringing...", "Звоним...")
    : callState === "connected"
    ? t("Connected", "На связи")
    : callState === "declined"
    ? t("Declined", "Отклонено")
    : t("Didn't answer", "Не ответил");

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

      <Pressable
        onPress={handleEndCall}
        style={[styles.backButton, { top: insets.top + Spacing.sm }]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={50}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
          />
        ) : null}
        <Feather name="arrow-left" size={20} color={theme.text} />
      </Pressable>

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
            <Avatar emoji={displayEmoji || "🐸"} size={80} />
          </View>
        </View>

        <ThemedText type="h2" style={[styles.nameText, { color: theme.text }]}>
          {displayName || t("User", "Пользователь")}
        </ThemedText>

        <Animated.View entering={FadeIn.duration(500)} key={callState}>
          <ThemedText type="body" style={[styles.statusText, { 
            color: (callState === "unavailable" || callState === "declined") ? '#FF6B6B' : callState === "connected" ? '#34C759' : theme.accent 
          }]}>
            {statusText}
          </ThemedText>
        </Animated.View>

        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {formatTime(elapsed)}
        </ThemedText>
      </View>

      {callState === "unavailable" || callState === "declined" ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.unavailableHint}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}
            />
          ) : null}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              initiateCall();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.sm }}
          >
            <Feather name="phone" size={16} color={theme.accent} />
            <ThemedText type="body" style={{ color: theme.accent, marginLeft: 8, fontWeight: '600' }}>
              {t("Call again", "Позвонить снова")}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View 
        entering={SlideInDown.duration(400).springify()}
        style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsMuted(!isMuted);
            }}
            style={[styles.controlButton]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={60}
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, { borderRadius: 30, overflow: 'hidden' }]}
              />
            ) : null}
            <View style={[styles.controlInner, isMuted ? { backgroundColor: theme.accent + '40' } : null]}>
              <Feather name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? theme.accent : theme.text} />
            </View>
          </Pressable>

          <Pressable
            onPress={handleEndCall}
            style={styles.endCallButton}
          >
            <LinearGradient
              colors={['#FF4444', '#CC0000']}
              style={[StyleSheet.absoluteFill, { borderRadius: 35 }]}
            />
            <Feather name="phone-off" size={28} color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsSpeaker(!isSpeaker);
            }}
            style={[styles.controlButton]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={60}
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, { borderRadius: 30, overflow: 'hidden' }]}
              />
            ) : null}
            <View style={[styles.controlInner, isSpeaker ? { backgroundColor: theme.accent + '40' } : null]}>
              <Feather name={isSpeaker ? "volume-2" : "volume-1"} size={24} color={isSpeaker ? theme.accent : theme.text} />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    overflow: 'hidden',
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
  unavailableHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    padding: Spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  controls: {
    paddingHorizontal: Spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  controlInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
