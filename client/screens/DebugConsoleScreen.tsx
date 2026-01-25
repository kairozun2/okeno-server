import React, { useState } from "react";
import { View, StyleSheet, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function DebugConsoleScreen() {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<string[]>(["--- Debug Console Initialized ---"]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const adminMutation = useMutation({
    mutationFn: async (cmd: string) => {
      return apiRequest("POST", "/api/debug/execute", { command: cmd, userId: user?.id });
    },
    onSuccess: (data: any) => {
      addLog(`Success: ${data.message || "Command executed"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: any) => {
      addLog(`Error: ${error.message || "Execution failed"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  });

  const handleExecute = () => {
    if (!command.trim()) return;
    
    addLog(`Executing: ${command}`);
    
    if (command.trim().toLowerCase() === "diag") {
      addLog(`User ID: ${user?.id}`);
      addLog(`Platform: ${process.env.NODE_ENV}`);
      addLog(`Language: ${language}`);
      setCommand("");
      return;
    }

    adminMutation.mutate(command);
    setCommand("");
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        <ThemedText type="h3">Debug Console</ThemedText>
      </View>

      <ScrollView 
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
      >
        {[...logs].reverse().map((log, i) => (
          <ThemedText key={i} style={styles.logText}>{log}</ThemedText>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TextInput
          value={command}
          onChangeText={setCommand}
          placeholder="Enter command..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button onPress={handleExecute} style={styles.button}>
          <Feather name="play" size={20} color="#fff" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
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
    fontFamily: "SpaceMono_400Regular",
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.8,
  },
  inputContainer: {
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  button: {
    width: 44,
    height: 44,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
  }
});
