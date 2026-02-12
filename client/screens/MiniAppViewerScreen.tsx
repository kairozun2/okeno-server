import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar, Text, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
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

  const controlsVisible = useRef(true);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      controlsOpacity.value = withTiming(0.35, { duration: 400 });
      controlsVisible.current = false;
    }, 6000);
  }, []);

  const showControls = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 200 });
    controlsVisible.current = true;
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const toggleControls = useCallback(() => {
    if (controlsVisible.current) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      controlsOpacity.value = withTiming(0.35, { duration: 300 });
      controlsVisible.current = false;
    } else {
      showControls();
    }
  }, [showControls]);

  const onScrollMessage = useCallback(() => {
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      controlsOpacity.value = withTiming(0.35, { duration: 200 });
      controlsVisible.current = false;
    }
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      showControls();
    }, 800);
  }, [showControls]);

  const userAgent = Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

  const injectedJS = `
    (function() {
      var throttled = false;
      window.addEventListener('scroll', function() {
        if (!throttled) {
          throttled = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll' }));
          setTimeout(function() { throttled = false; }, 300);
        }
      }, { passive: true });

      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, maximum-scale=5';
        document.head.appendChild(meta);
      }
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
    pointerEvents: "auto" as const,
  }));

  const displayEmoji = appEmoji || "🌐";

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
              userAgent={userAgent}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => { setIsLoading(false); showControls(); }}
              onError={() => { setIsLoading(false); setError(true); }}
              onHttpError={(syntheticEvent) => {
                const { statusCode } = syntheticEvent.nativeEvent;
                if (statusCode >= 500) { setIsLoading(false); setError(true); }
              }}
              onContentProcessDidTerminate={() => { webViewRef.current?.reload(); }}
              onMessage={handleWebViewMessage}
              injectedJavaScript={injectedJS}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              startInLoadingState={false}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              scrollEnabled
              bounces
              allowsBackForwardNavigationGestures
              overScrollMode="always"
              decelerationRate="normal"
              showsVerticalScrollIndicator
              showsHorizontalScrollIndicator={false}
              contentMode="mobile"
              setSupportMultipleWindows={false}
              mixedContentMode="compatibility"
              allowsLinkPreview={false}
              cacheEnabled
              cacheMode="LOAD_DEFAULT"
              originWhitelist={["https://*", "http://*"]}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.startsWith("http://") || request.url.startsWith("https://")) return true;
                if (request.url.startsWith("tel:") || request.url.startsWith("mailto:")) {
                  Linking.openURL(request.url).catch(() => {});
                  return false;
                }
                return false;
              }}
            />
          )}

          <Animated.View style={[styles.controlsBar, { top: insets.top + 8 }, controlsAnimStyle]}>
            <Pressable
              onPress={() => {
                if (!controlsVisible.current) { showControls(); return; }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                webViewRef.current?.reload();
              }}
              style={{ borderRadius: 20, overflow: 'hidden' }}
            >
              <BlurView intensity={50} tint="dark" style={styles.controlBtn}>
                <Feather name="refresh-cw" size={18} color="#FFF" />
              </BlurView>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!controlsVisible.current) { showControls(); return; }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.goBack();
              }}
              style={{ borderRadius: 20, overflow: 'hidden' }}
            >
              <BlurView intensity={50} tint="dark" style={styles.controlBtn}>
                <Feather name="x" size={20} color="#FFF" />
              </BlurView>
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
            <Text style={{ fontSize: 44 }}>{displayEmoji}</Text>
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
    backgroundColor: "rgba(0,0,0,0.25)",
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
