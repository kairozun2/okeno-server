import React, { useState, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

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

function BannedScreen() {
  const { logout, user } = useAuth();
  
  return (
    <View style={[styles.root, { backgroundColor: "#121212", justifyContent: "center", alignItems: "center", padding: Spacing.xl }]}>
      <Avatar emoji={user?.emoji || "🚫"} size={100} />
      <ThemedText type="h1" style={{ marginTop: Spacing.xl, color: "#fff", textAlign: "center" }}>
        Your account has been banned
      </ThemedText>
      <ThemedText type="body" style={{ marginTop: Spacing.md, color: "#aaa", textAlign: "center", marginBottom: Spacing.xl }}>
        You no longer have access to the Moments community.
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
  
  const handleLoadingFinish = useCallback(() => {
    setShowLoading(false);
  }, []);

  const isReady = !isLoading;

  if (user?.isBanned) {
    return <BannedScreen />;
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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
