import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { PinInput } from "@/components/PinInput";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim() || pin.length !== 4) {
      setError(true);
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      await login(userId.trim(), pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Invalid ID or PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["4xl"] }]}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <ThemedText type="h1" style={styles.title}>
          Welcome Back
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Enter your ID and PIN to continue
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.form}
      >
        <Input
          label="User ID"
          placeholder="Enter your ID"
          value={userId}
          onChangeText={(text) => {
            setUserId(text);
            setError(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.pinSection}>
          <ThemedText type="small" style={styles.pinLabel}>
            4-Digit PIN
          </ThemedText>
          <PinInput
            value={pin}
            onChange={(value) => {
              setPin(value);
              setError(false);
            }}
            error={error}
          />
        </View>

        <Button
          onPress={handleLogin}
          disabled={isLoading || !userId.trim() || pin.length !== 4}
          style={styles.button}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(300).springify()}
        style={styles.footer}
      >
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Don't have an account?{" "}
        </ThemedText>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <ThemedText type="link">Create one</ThemedText>
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
  },
  form: {
    flex: 1,
  },
  pinSection: {
    marginBottom: Spacing.xl,
  },
  pinLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  button: {
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },
});
