import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar, Text, Linking, Dimensions, Modal, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const splashOpacity = useSharedValue(1);
  const splashScale = useSharedValue(0.9);
  const loadingProgress = useSharedValue(0);
  const toastOpacity = useSharedValue(0);
  const swipeY = useSharedValue(0);

  const validUrl = appUrl.startsWith("http://") || appUrl.startsWith("https://") ? appUrl : `https://${appUrl}`;
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    splashScale.value = withTiming(1, { duration: 400 });
    setCurrentUrl(validUrl);
    const timer = setTimeout(() => {
      splashOpacity.value = withTiming(0, { duration: 400 });
    }, 2500);
    return () => {
      clearTimeout(timer);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const loadingBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(loadingProgress.value, [0, 1], [0, 100])}%`,
    opacity: loadingProgress.value > 0 && loadingProgress.value < 1 ? 1 : 0,
  }));

  const splashAnimStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ scale: splashScale.value }],
    pointerEvents: splashOpacity.value > 0.1 ? "auto" as const : "none" as const,
  }));

  const toastAnimStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: interpolate(toastOpacity.value, [0, 1], [20, 0]) }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeY.value }],
    borderRadius: swipeY.value > 10 ? 16 : 0,
    overflow: "hidden" as const,
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeY.value, [0, screenHeight * 0.3], [0, 0.5]),
    backgroundColor: "#000",
  }));

  const userAgent = Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

  const injectedJS = `
    (function() {
      var throttled = false;
      window.addEventListener('scroll', function() {
        if (!throttled) {
          throttled = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', y: window.scrollY }));
          setTimeout(function() { throttled = false; }, 200);
        }
      }, { passive: true });

      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, maximum-scale=5';
        document.head.appendChild(meta);
      }

      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'visible' }));
        }
      });

      window.addEventListener('pageshow', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageshow' }));
      });

      window.Okeno = {
        platform: 'ios',
        colorScheme: '${isDark ? 'dark' : 'light'}',
        themeParams: {
          bg_color: '${isDark ? '#0A1628' : '#FFFFFF'}',
          text_color: '${isDark ? '#FFFFFF' : '#000000'}',
          hint_color: '${isDark ? '#8E9BAD' : '#999999'}',
          link_color: '#3478F6',
          button_color: '#3478F6',
          button_text_color: '#FFFFFF',
        },
        close: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
        },
        ready: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        },
      };
    })();
    true;
  `;

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "scroll") {
      } else if (data.type === "pageshow" || data.type === "visible") {
        setIsLoading(false);
      } else if (data.type === "close") {
        navigation.goBack();
      } else if (data.type === "ready") {
        setIsLoading(false);
      }
    } catch (_) {}
  }, [navigation]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    if (navState.url) setCurrentUrl(navState.url);
    if (navState.title) setCurrentTitle(navState.title);
  }, []);

  const handleLoadProgress = useCallback(({ nativeEvent }: any) => {
    const progress = nativeEvent.progress;
    if (!isInitialLoad) {
      loadingProgress.value = withTiming(progress, { duration: 200 });
      if (progress >= 1) {
        setTimeout(() => {
          loadingProgress.value = withTiming(0, { duration: 300 });
        }, 300);
      }
    }
  }, [isInitialLoad]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      webViewRef.current?.goBack();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [canGoBack]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
  }, [navigation]);

  const handleReload = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.reload();
    setMenuVisible(false);
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    const urlToOpen = currentUrl || validUrl;
    Linking.openURL(urlToOpen).catch(() => {});
    setMenuVisible(false);
  }, [currentUrl, validUrl]);

  const handleCopyLink = useCallback(async () => {
    const urlToCopy = currentUrl || validUrl;
    await Clipboard.setStringAsync(urlToCopy);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMenuVisible(false);
    setCopiedToast(true);
    toastOpacity.value = withTiming(1, { duration: 200 });
    setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => setCopiedToast(false), 300);
    }, 1500);
  }, [currentUrl, validUrl]);

  const handleShare = useCallback(async () => {
    const urlToShare = currentUrl || validUrl;
    try {
      await Share.share({
        message: `${appName} — ${urlToShare}`,
        url: urlToShare,
      });
    } catch (_) {}
    setMenuVisible(false);
  }, [currentUrl, validUrl, appName]);

  const closeSwipe = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        swipeY.value = e.translationY * 0.6;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100) {
        swipeY.value = withTiming(screenHeight, { duration: 200 });
        runOnJS(closeSwipe)();
      } else {
        swipeY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    })
    .activeOffsetY(15)
    .failOffsetX([-15, 15]);

  const displayEmoji = appEmoji || "🌐";

  const getDomainFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />

      {swipeY.value > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]} pointerEvents="none" />
      ) : null}

      <Animated.View style={[styles.container, { backgroundColor: theme.backgroundRoot }, containerAnimStyle]}>

          <GestureDetector gesture={swipeGesture}>
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? '#1A2438' : '#F8F8F8', borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  {canGoBack ? (
                    <Pressable onPress={goBack} style={styles.headerBtn} hitSlop={8}>
                      <Feather name="chevron-left" size={24} color={theme.accent} />
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.headerCenter}>
                  <View style={styles.headerTitleRow}>
                    <Text style={{ fontSize: 16 }}>{displayEmoji}</Text>
                    <ThemedText type="body" style={{ color: theme.text, fontWeight: '600', marginLeft: 6, fontSize: 16 }} numberOfLines={1}>
                      {appName}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                    {getDomainFromUrl(currentUrl || validUrl)}
                  </ThemedText>
                </View>

                <View style={styles.headerRight}>
                  <Pressable onPress={() => { setMenuVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.headerBtn} hitSlop={8}>
                    <Feather name="more-vertical" size={20} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={handleClose} style={[styles.headerBtn, { marginLeft: 4 }]} hitSlop={8}>
                    <Feather name="x" size={22} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <Animated.View style={[styles.progressBar, { backgroundColor: theme.accent }, loadingBarStyle]} />
              </View>
            </View>
          </GestureDetector>

          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="wifi-off" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                {isDark ? "Не удалось загрузить приложение" : "Failed to load app"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                {getDomainFromUrl(validUrl)}
              </ThemedText>
              <Pressable
                onPress={() => { setError(false); setIsLoading(true); setIsInitialLoad(true); webViewRef.current?.reload(); }}
                style={[styles.retryBtn, { backgroundColor: theme.accent }]}
              >
                <Feather name="refresh-cw" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: '600' }}>
                  {isDark ? "Повторить" : "Retry"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: validUrl }}
              style={{ flex: 1 }}
              userAgent={userAgent}
              onLoadStart={() => {
                setIsLoading(true);
                if (!isInitialLoad) {
                  loadingProgress.value = 0.1;
                }
              }}
              onLoadEnd={() => {
                setIsLoading(false);
                setIsInitialLoad(false);
                loadingProgress.value = withTiming(1, { duration: 200 });
                setTimeout(() => {
                  loadingProgress.value = withTiming(0, { duration: 300 });
                }, 400);
              }}
              onLoadProgress={handleLoadProgress}
              onError={() => { setIsLoading(false); setIsInitialLoad(false); setError(true); }}
              onHttpError={(syntheticEvent) => {
                const { statusCode } = syntheticEvent.nativeEvent;
                if (statusCode >= 500) { setIsLoading(false); setError(true); }
              }}
              onContentProcessDidTerminate={() => { webViewRef.current?.reload(); }}
              onNavigationStateChange={handleNavigationStateChange}
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
              originWhitelist={["https://*", "http://*", "about:*", "data:*"]}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.startsWith("http://") || request.url.startsWith("https://")) return true;
                if (request.url.startsWith("about:") || request.url.startsWith("data:") || request.url.startsWith("blob:")) return true;
                if (request.url.startsWith("tel:") || request.url.startsWith("mailto:") || request.url.startsWith("sms:")) {
                  Linking.openURL(request.url).catch(() => {});
                  return false;
                }
                if (request.url.startsWith("intent:") || request.url.startsWith("market:")) {
                  return false;
                }
                return true;
              }}
            />
          )}

          {isLoading && isInitialLoad && !error ? (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.backgroundRoot, top: insets.top + 52 }]}>
              <ActivityIndicator size="large" color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {isDark ? "Загрузка..." : "Loading..."}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

      <Animated.View style={[styles.splashOverlay, { backgroundColor: theme.backgroundRoot }, splashAnimStyle]}>
        <View style={styles.splashContent}>
          <View style={[styles.splashIcon, { backgroundColor: isDark ? 'rgba(52,120,246,0.12)' : 'rgba(52,120,246,0.08)' }]}>
            <Text style={{ fontSize: 44 }}>{displayEmoji}</Text>
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: "center" }}>{appName}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {getDomainFromUrl(validUrl)}
          </ThemedText>
          <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.xl }} />
        </View>
      </Animated.View>

      {copiedToast ? (
        <Animated.View style={[styles.toast, { bottom: insets.bottom + 24 }, toastAnimStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.toastInner}>
            <Feather name="check" size={16} color="#4CD964" />
            <Text style={styles.toastText}>
              {isDark ? "Ссылка скопирована" : "Link copied"}
            </Text>
          </BlurView>
        </Animated.View>
      ) : null}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: isDark ? '#2A3548' : '#FFFFFF', top: insets.top + 44, right: 16 }]}>
            <Pressable style={styles.menuItem} onPress={handleReload}>
              <Feather name="refresh-cw" size={18} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {isDark ? "Обновить" : "Reload"}
              </Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <Pressable style={styles.menuItem} onPress={handleCopyLink}>
              <Feather name="copy" size={18} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {isDark ? "Копировать ссылку" : "Copy Link"}
              </Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <Pressable style={styles.menuItem} onPress={handleShare}>
              <Feather name="share" size={18} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {isDark ? "Поделиться" : "Share"}
              </Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <Pressable style={styles.menuItem} onPress={handleOpenInBrowser}>
              <Feather name="external-link" size={18} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {isDark ? "Открыть в браузере" : "Open in Browser"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 8,
  },
  headerLeft: {
    width: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 72,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: "transparent",
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuContainer: {
    position: "absolute",
    width: 220,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 15,
    marginLeft: 12,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  toast: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 300,
  },
  toastInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  toastText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});
