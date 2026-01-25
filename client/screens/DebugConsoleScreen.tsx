import React, { useState, useRef } from "react";
import { View, StyleSheet, TextInput, ScrollView, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function DebugConsoleScreen() {
  const { theme, language } = useTheme();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "--- Debug Console Initialized ---",
    "Commands: diag, system_info, clear",
    "Secret: okeno_admin_elevate_2026",
  ]);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const adminMutation = useMutation({
    mutationFn: async (cmd: string) => {
      return apiRequest("POST", "/api/debug/execute", { command: cmd, userId: user?.id });
    },
    onSuccess: async (data: any) => {
      addLog(`[OK] ${data.message || "Command executed"}`);
      if (data.data) {
        Object.entries(data.data).forEach(([key, value]) => {
          addLog(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        });
      }
      
      // If we elevated to admin, refresh user data immediately
      if (command.includes("admin_elevate")) {
        addLog("Refreshing user profile...");
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
        addLog("[OK] Profile refreshed. Close console and check profile.");
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: any) => {
      addLog(`[ERROR] ${error.message || "Execution failed"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  });

  const handleExecute = () => {
    const trimmedCmd = command.trim();
    if (!trimmedCmd) return;
    
    addLog(`> ${trimmedCmd}`);
    
    if (trimmedCmd.toLowerCase() === "diag") {
      addLog("=== LOCAL DIAGNOSTICS ===");
      addLog(`User ID: ${user?.id || 'N/A'}`);
      addLog(`Username: ${user?.username || 'N/A'}`);
      addLog(`Emoji: ${user?.emoji || 'N/A'}`);
      addLog(`Is Admin: ${user?.isAdmin ? 'YES' : 'NO'}`);
      addLog(`Is Verified: ${user?.isVerified ? 'YES' : 'NO'}`);
      addLog(`Is Banned: ${user?.isBanned ? 'YES' : 'NO'}`);
      addLog(`Platform: ${Platform.OS} v${Platform.Version}`);
      addLog(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
      addLog(`Language: ${language}`);
      addLog(`Screen: ${insets.top}t ${insets.bottom}b safe`);
      addLog("=========================");
      setCommand("");
      return;
    }

    if (trimmedCmd.toLowerCase() === "clear") {
      setLogs(["--- Console Cleared ---"]);
      setCommand("");
      return;
    }

    if (trimmedCmd.toLowerCase() === "help") {
      addLog("=== AVAILABLE COMMANDS ===");
      addLog("diag - Show local diagnostics");
      addLog("system_info - Show server stats");
      addLog("clear - Clear console");
      addLog("okeno_admin_elevate_2026 - Grant admin");
      addLog("==========================");
      setCommand("");
      return;
    }

    adminMutation.mutate(trimmedCmd);
    setCommand("");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText type="h3">Debug Console</ThemedText>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.logContainer}
        contentContainerStyle={[styles.logContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        {logs.map((log, i) => (
          <ThemedText key={i} style={[styles.logText, log.includes('[ERROR]') && { color: '#ff6b6b' }, log.includes('[OK]') && { color: '#51cf66' }]}>{log}</ThemedText>
        ))}
      </KeyboardAwareScrollView>

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            value={command}
            onChangeText={setCommand}
            placeholder="Enter command..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleExecute}
          />
          <Button onPress={handleExecute} style={styles.button}>
            <Feather name="play" size={20} color="#fff" />
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  logContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  logContent: {
    paddingBottom: Spacing.xl,
  },
  logText: {
    fontFamily: Platform.OS === 'ios' ? "Courier" : "monospace",
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
  }
});
