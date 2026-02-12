import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MiniAppViewer">;

export default function MiniAppViewerScreen({ navigation, route }: Props) {
  const { appName, appUrl } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const validUrl = appUrl.startsWith("http://") || appUrl.startsWith("https://") ? appUrl : `https://${appUrl}`;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={{ padding: Spacing.sm, borderRadius: 16 }}
          >
            <Feather name="x" size={22} color={theme.text} />
          </BlurView>
        </Pressable>
        <ThemedText type="body" style={{ fontWeight: "600", flex: 1, textAlign: "center" }} numberOfLines={1}>
          {appName}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            webViewRef.current?.reload();
          }}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={{ padding: Spacing.sm, borderRadius: 16 }}
          >
            <Feather name="refresh-cw" size={18} color={theme.text} />
          </BlurView>
        </Pressable>
      </View>

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
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: validUrl }}
              style={styles.webview}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setError(true); }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          )}
          {isLoading && !error ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3478F6" />
            </View>
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
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
