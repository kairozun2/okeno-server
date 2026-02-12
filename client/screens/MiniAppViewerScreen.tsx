import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar, Text, Linking, Modal, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MiniAppViewer">;

export default function MiniAppViewerScreen({ navigation, route }: Props) {
  const { appName, appUrl, appEmoji } = route.params;
  const { theme, isDark, language } = useTheme();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const splashOpacity = useSharedValue(1);
  const splashScale = useSharedValue(0.9);
  const loadingProgress = useSharedValue(0);
  const toastOpacity = useSharedValue(0);

  const validUrl = appUrl.startsWith("http://") || appUrl.startsWith("https://") ? appUrl : `https://${appUrl}`;

  useEffect(() => {
    splashScale.value = withTiming(1, { duration: 400 });
    setCurrentUrl(validUrl);
    const timer = setTimeout(() => {
      splashOpacity.value = withTiming(0, { duration: 400 });
    }, 2500);
    return () => clearTimeout(timer);
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
      if (data.type === "pageshow" || data.type === "visible") {
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
              {t("Close", "Закрыть")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <StatusBar barStyle="light-content" />

          <View style={[styles.progressBarContainer, { top: insets.top }]}>
            <Animated.View style={[styles.progressBar, { backgroundColor: theme.accent }, loadingBarStyle]} />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="wifi-off" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                {t("Failed to load app", "Не удалось загрузить приложение")}
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
                  {t("Retry", "Повторить")}
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
            <View style={[styles.loadingOverlay, { backgroundColor: theme.backgroundRoot }]}>
              <ActivityIndicator size="large" color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {t("Loading...", "Загрузка...")}
              </ThemedText>
            </View>
          ) : null}

          <View style={[styles.floatingControls, { top: insets.top + 8 }]} pointerEvents="box-none">
            {canGoBack ? (
              <Pressable onPress={goBack} style={styles.floatingBtn}>
                <BlurView intensity={60} tint="dark" style={styles.floatingBtnBlur}>
                  <Feather name="chevron-left" size={20} color="#FFF" />
                </BlurView>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            <View style={styles.floatingGroup}>
              <BlurView intensity={60} tint="dark" style={styles.floatingGroupBlur}>
                <Pressable
                  onPress={() => { setMenuVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={styles.floatingGroupBtn}
                >
                  <Feather name="more-vertical" size={18} color="#FFF" />
                </Pressable>
                <View style={styles.floatingGroupDivider} />
                <Pressable onPress={handleClose} style={styles.floatingGroupBtn}>
                  <Feather name="x" size={20} color="#FFF" />
                </Pressable>
              </BlurView>
            </View>
          </View>

      <Animated.View style={[styles.splashOverlay, { backgroundColor: theme.backgroundRoot }, splashAnimStyle]}>
        <View style={styles.splashContent}>
          <View style={[styles.splashIcon, { backgroundColor: isDark ? 'rgba(52,120,246,0.12)' : 'rgba(52,120,246,0.08)' }]}>
            <Text style={{ fontSize: 44 }}>{displayEmoji}</Text>
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: "center" }}>{appName}</ThemedText>
          <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.xl }} />
        </View>
      </Animated.View>

      {copiedToast ? (
        <Animated.View style={[styles.toast, { bottom: insets.bottom + 24 }, toastAnimStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.toastInner}>
            <Feather name="check" size={16} color="#4CD964" />
            <Text style={styles.toastText}>
              {t("Link copied", "Ссылка скопирована")}
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
          <View style={styles.menuSheet}>
            <BlurView intensity={90} tint="dark" style={[styles.menuSheetBlur, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.menuSheetHandle} />

              <View style={styles.menuAppInfo}>
                <Text style={{ fontSize: 28 }}>{displayEmoji}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.menuAppName, { color: "#FFF" }]}>{appName}</Text>
                </View>
              </View>

              <View style={[styles.menuDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

              <Pressable style={styles.menuItem} onPress={handleReload}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(52,120,246,0.2)' }]}>
                  <Feather name="refresh-cw" size={18} color="#5AC8FA" />
                </View>
                <Text style={[styles.menuText, { color: "#FFF" }]}>
                  {t("Reload", "Обновить")}
                </Text>
              </Pressable>

              <Pressable style={styles.menuItem} onPress={handleCopyLink}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(76,217,100,0.2)' }]}>
                  <Feather name="copy" size={18} color="#4CD964" />
                </View>
                <Text style={[styles.menuText, { color: "#FFF" }]}>
                  {t("Copy Link", "Копировать ссылку")}
                </Text>
              </Pressable>

              <Pressable style={styles.menuItem} onPress={handleShare}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255,149,0,0.2)' }]}>
                  <Feather name="share" size={18} color="#FF9F0A" />
                </View>
                <Text style={[styles.menuText, { color: "#FFF" }]}>
                  {t("Share", "Поделиться")}
                </Text>
              </Pressable>

              <Pressable style={styles.menuItem} onPress={handleOpenInBrowser}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(142,155,173,0.2)' }]}>
                  <Feather name="external-link" size={18} color="#8E9BAD" />
                </View>
                <Text style={[styles.menuText, { color: "#FFF" }]}>
                  {t("Open in Browser", "Открыть в браузере")}
                </Text>
              </Pressable>

              <View style={[styles.menuDivider, { backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4 }]} />

              <Pressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <Text style={[styles.menuCancelText, { color: 'rgba(255,255,255,0.5)' }]}>
                  {t("Cancel", "Отмена")}
                </Text>
              </Pressable>
            </BlurView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    zIndex: 15,
    backgroundColor: "transparent",
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
  },
  floatingControls: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  floatingBtn: {
    borderRadius: 20,
    overflow: "hidden",
  },
  floatingBtnBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  floatingGroup: {
    borderRadius: 20,
    overflow: "hidden",
  },
  floatingGroupBlur: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  floatingGroupBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingGroupDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  menuSheetBlur: {
    paddingTop: 8,
    backgroundColor: "rgba(15,25,45,0.65)",
  },
  menuSheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginBottom: 16,
  },
  menuAppInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  menuAppName: {
    fontSize: 18,
    fontWeight: "600",
  },
  _menuAppDomain: {
    fontSize: 13,
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 14,
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
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
