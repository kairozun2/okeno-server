import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MiniAppViewer">;

export default function MiniAppViewerScreen({ navigation, route }: Props) {
  const { appName, appUrl, appEmoji } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  const splashOpacity = useSharedValue(1);
  const splashScale = useSharedValue(0.9);
  const controlsOpacity = useSharedValue(1);

  const validUrl = appUrl.startsWith("http://") || appUrl.startsWith("https://") ? appUrl : `https://${appUrl}`;

  useEffect(() => {
    splashScale.value = withTiming(1, { duration: 400 });

    const timer = setTimeout(() => {
      splashOpacity.value = withTiming(0, { duration: 400 });
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      controlsOpacity.value = withTiming(0, { duration: 300 });
    }, 5000);
  }, []);

  const showControls = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 200 });
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const onScrollMessage = useCallback(() => {
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      controlsOpacity.value = withTiming(0, { duration: 200 });
    }
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      showControls();
    }, 600);
  }, [showControls]);

  const injectedJS = `
    (function() {
      var lastY = 0;
      var scrolling = false;
      var timer = null;
      window.addEventListener('scroll', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll' }));
      }, { passive: true });
      document.addEventListener('touchmove', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll' }));
      }, { passive: true });
    })();
    true;
  `;

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "scroll") {
        onScrollMessage();
      }
    } catch (_) {}
  }, [onScrollMessage]);

  const splashAnimStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ scale: splashScale.value }],
    pointerEvents: splashOpacity.value > 0.1 ? "auto" as const : "none" as const,
  }));

  const controlsAnimStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    pointerEvents: controlsOpacity.value > 0.1 ? "auto" as const : "none" as const,
  }));

  const emoji = appEmoji || "🌐";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <StatusBar hidden />

      {error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
            {isDark ? "Не удалось загрузить" : "Failed to load"}
          </ThemedText>
          <Pressable
            onPress={() => { setError(false); setIsLoading(true); }}
            style={[styles.retryBtn, { backgroundColor: "#3478F6" }]}
          >
            <ThemedText type="body" style={{ color: "#FFF" }}>
              {isDark ? "Повторить" : "Retry"}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
            <ThemedText type="body" style={{ color: "#3478F6" }}>
              {isDark ? "Закрыть" : "Close"}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          {Platform.OS === "web" ? (
            <View style={styles.webFallback}>
              <Feather name="smartphone" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                Mini apps work best in Expo Go
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                {validUrl}
              </ThemedText>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.retryBtn, { backgroundColor: "#3478F6", marginTop: Spacing.xl }]}
              >
                <ThemedText type="body" style={{ color: "#FFF" }}>
                  {isDark ? "Закрыть" : "Close"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: validUrl }}
              style={StyleSheet.absoluteFill}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => { setIsLoading(false); scheduleAutoHide(); }}
              onError={() => { setIsLoading(false); setError(true); }}
              onMessage={handleWebViewMessage}
              injectedJavaScript={injectedJS}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled
              bounces
              allowsBackForwardNavigationGestures
            />
          )}

          <Animated.View style={[styles.controlsBar, { top: insets.top + 8 }, controlsAnimStyle]}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); webViewRef.current?.reload(); }}
              style={styles.controlBtn}
            >
              <Feather name="refresh-cw" size={18} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.goBack(); }}
              style={styles.controlBtn}
            >
              <Feather name="x" size={20} color="#FFF" />
            </Pressable>
          </Animated.View>

          {isLoading && !error ? (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.backgroundRoot }]}>
              <ActivityIndicator size="large" color="#3478F6" />
            </View>
          ) : null}
        </>
      )}

      <Animated.View style={[styles.splashOverlay, { backgroundColor: theme.backgroundRoot }, splashAnimStyle]}>
        <View style={styles.splashContent}>
          <View style={[styles.splashIcon, { backgroundColor: "rgba(52,120,246,0.1)" }]}>
            <Text style={{ fontSize: 44 }}>{emoji}</Text>
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: "center" }}>{appName}</ThemedText>
          <ActivityIndicator color="#3478F6" style={{ marginTop: Spacing.xl }} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controlsBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 100,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  splashContent: {
    alignItems: "center",
  },
  splashIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
});
