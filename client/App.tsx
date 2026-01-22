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

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showLoading, setShowLoading] = useState(true);
  
  const handleLoadingFinish = useCallback(() => {
    setShowLoading(false);
  }, []);

  const isReady = !isLoading;

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
