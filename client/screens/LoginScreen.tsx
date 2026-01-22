import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
import { Spacing } from "@/constants/theme";
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
      Alert.alert("Ошибка", "Неверный ID или PIN. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.delay(100).duration(800).springify()}>
          <ThemedText type="h2" style={styles.title}>
            Welcome back
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary, opacity: 0.8 }]}
          >
            Enter your ID and PIN to login
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(800).springify()}
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
            <ThemedText type="small" style={[styles.pinLabel, { color: theme.textSecondary }]}>
              4-digit PIN
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
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={styles.footer}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            No account?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <ThemedText type="link">Create</ThemedText>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  pinSection: {
    marginBottom: Spacing.md,
  },
  pinLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
    fontSize: 13,
  },
  button: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
});
