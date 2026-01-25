import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persistOptions } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

import { ThemeProvider } from "./hooks/useTheme";
import { RefreshProvider } from "@/contexts/RefreshContext";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

const SETTINGS_ICON_SOURCES = [
  require("./assets/icons/settings/account.png"),
  require("./assets/icons/settings/privacy.png"),
  require("./assets/icons/settings/support.png"),
  require("./assets/icons/settings/delete.png"),
  require("./assets/icons/settings/storage.png"),
  require("./assets/icons/settings/language.png"),
  require("./assets/icons/settings/archive.png"),
  require("./assets/icons/settings/appearance.png"),
  require("./assets/icons/settings/sessions.png"),
  require("./assets/icons/settings/hidden.png"),
  require("./assets/icons/settings/haptics.png"),
  require("./assets/icons/settings/chat.png"),
  require("./assets/icons/settings/help.png"),
  require("./assets/icons/settings/bug.png"),
  require("./assets/icons/settings/discord.png"),
  require("./assets/icons/settings/archive-box.png"),
];

function BannedScreen() {
  const { logout, user } = useAuth();
  
  return (
    <View style={[styles.root, { backgroundColor: "#121212", justifyContent: "center", alignItems: "center", padding: Spacing.xl }]}>
      <Avatar emoji={user?.emoji || "🚫"} size={100} />
      <ThemedText type="h1" style={{ marginTop: Spacing.xl, color: "#fff", textAlign: "center" }}>
        Your account has been banned
      </ThemedText>
      <ThemedText type="body" style={{ marginTop: Spacing.md, color: "#aaa", textAlign: "center", marginBottom: Spacing.xl }}>
        You no longer have access to the Okeno community.
      </ThemedText>
      <Button onPress={logout} style={{ width: "100%", backgroundColor: "#fff" }} textStyle={{ color: "#000" }}>
        Return to login
      </Button>
    </View>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showLoading, setShowLoading] = useState(true);
  const [iconsPreloaded, setIconsPreloaded] = useState(false);
  
  useEffect(() => {
    const preload = async () => {
      try {
        await Image.prefetch(SETTINGS_ICON_SOURCES);
      } finally {
        setIconsPreloaded(true);
      }
    };
    preload();
  }, []);
  
  const handleLoadingFinish = useCallback(() => {
    setShowLoading(false);
  }, []);

  const isReady = !isLoading && iconsPreloaded;

  if (user?.isBanned) {
    return <BannedScreen />;
  }

  // Ensure navigation doesn't start until icons are ready to prevent flicker for new users
  if (!isReady && showLoading) {
    return (
      <View style={styles.root}>
        <LoadingScreen 
          emoji={user?.emoji || "🐸"} 
          isReady={false} 
          onFinish={handleLoadingFinish} 
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
      {showLoading && (
        <LoadingScreen 
          emoji={user?.emoji || "🐸"} 
          isReady={isReady} 
          onFinish={handleLoadingFinish} 
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider 
          client={queryClient} 
          persistOptions={persistOptions}
        >
          <AuthProvider>
            <RefreshProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <AppContent />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </RefreshProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
