import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Platform, 
  Keyboard,
  InputAccessoryView,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const INPUT_ACCESSORY_ID = "debug-console-input";

export default function DebugConsoleScreen() {
  const { theme, language } = useTheme();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [command, setCommand] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "=== Debug Console ===",
    "Commands: diag, system_info, help, clear",
    "",
  ]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${msg}`]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const adminMutation = useMutation({
    mutationFn: async (cmd: string) => {
      return apiRequest("POST", "/api/debug/execute", { command: cmd, userId: user?.id });
    },
    onSuccess: async (data: any) => {
      addLog(`[OK] ${data.message || "Done"}`);
      
      if (data.data) {
        Object.entries(data.data).forEach(([key, value]) => {
          if (typeof value === 'object') {
            addLog(`  ${key}:`);
            Object.entries(value as object).forEach(([k, v]) => {
              addLog(`    ${k}: ${v}`);
            });
          } else {
            addLog(`  ${key}: ${value}`);
          }
        });
      }
      
      // If admin elevated, force refresh user
      if (data.message && data.message.includes("Admin rights granted")) {
        addLog("");
        addLog("Refreshing your profile...");
        try {
          await refreshUser();
          addLog("[OK] Profile updated!");
          addLog("");
          addLog(">>> CLOSE THIS SCREEN <<<");
          addLog(">>> GO TO PROFILE TAB <<<");
          addLog(">>> PULL DOWN TO REFRESH <<<");
          addLog("");
        } catch (e) {
          addLog("[WARN] Manual refresh needed");
        }
      }
    },
    onError: (error: any) => {
      addLog(`[ERROR] ${error.message || "Failed"}`);
    }
  });

  const handleExecute = async () => {
    const cmd = command.trim();
    if (!cmd) return;
    
    addLog(`> ${cmd}`);
    setCommand("");
    
    if (cmd.toLowerCase() === "help") {
      addLog("=== COMMANDS ===");
      addLog("diag        - Device info");
      addLog("system_info - Server status");
      addLog("clear       - Clear console");
      addLog("================");
      return;
    }

    if (cmd.toLowerCase() === "diag") {
      addLog("=== DEVICE INFO ===");
      addLog(`User: ${user?.username || 'N/A'} (${user?.emoji || '?'})`);
      addLog(`ID: ${user?.id || 'N/A'}`);
      addLog(`Admin: ${user?.isAdmin ? 'YES' : 'NO'}`);
      addLog(`Verified: ${user?.isVerified ? 'YES' : 'NO'}`);
      addLog(`Banned: ${user?.isBanned ? 'YES' : 'NO'}`);
      addLog(`OS: ${Platform.OS} ${Platform.Version}`);
      addLog(`Lang: ${language}`);
      addLog(`Env: ${process.env.NODE_ENV || 'dev'}`);
      addLog("===================");
      return;
    }

    if (cmd.toLowerCase() === "clear") {
      setLogs(["Console cleared.", ""]);
      return;
    }

    adminMutation.mutate(cmd);
  };

  const inputBottomOffset = keyboardHeight > 0 ? keyboardHeight + 5 : insets.bottom + 25;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <ThemedText type="h3">Debug Console</ThemedText>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.logArea}
        contentContainerStyle={{ paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {logs.map((log, i) => (
          <ThemedText 
            key={i} 
            style={[
              styles.logLine,
              log.startsWith('[OK]') && { color: '#4ade80' },
              log.startsWith('[ERROR]') && { color: '#f87171' },
              log.startsWith('[WARN]') && { color: '#fbbf24' },
              log.startsWith('>>>') && { color: '#60a5fa', fontWeight: '700' },
            ]}
          >
            {log}
          </ThemedText>
        ))}
      </ScrollView>

      <View 
        style={[
          styles.inputWrapper,
          { 
            bottom: inputBottomOffset,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          }
        ]}
      >
        <TextInput
          value={command}
          onChangeText={setCommand}
          placeholder="Enter command..."
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input, 
            { 
              backgroundColor: theme.backgroundSecondary, 
              color: theme.text, 
              borderColor: theme.border 
            }
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleExecute}
          inputAccessoryViewID={INPUT_ACCESSORY_ID}
        />
        <Pressable 
          onPress={handleExecute} 
          style={[styles.sendBtn, { backgroundColor: theme.accent }]}
        >
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </View>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={[styles.accessoryBar, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={() => Keyboard.dismiss()} style={styles.accessoryBtn}>
              <ThemedText style={{ color: theme.accent }}>Done</ThemedText>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logArea: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  inputWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  accessoryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
});
