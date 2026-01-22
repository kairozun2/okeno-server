import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { PinInput } from "@/components/PinInput";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, getRandomEmoji } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [step, setStep] = useState<"username" | "pin" | "confirm">("username");
  const [previewEmoji] = useState("✨");

  const handleNext = () => {
    if (step === "username") {
      if (!username.trim()) {
        Alert.alert("Error", "Please enter a username");
        return;
      }
      setStep("pin");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (step === "pin") {
      if (pin.length !== 4) {
        setError(true);
        return;
      }
      setStep("confirm");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleRegister = async () => {
    if (pin !== confirmPin) {
      setError(true);
      Alert.alert("Error", "PINs do not match");
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      await register(username.trim(), pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "pin") {
      setStep("username");
    } else if (step === "confirm") {
      setStep("pin");
      setConfirmPin("");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["4xl"] }]}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <View style={styles.header}>
          <Avatar emoji={previewEmoji} size={80} />
          <ThemedText type="h1" style={styles.title}>
            {step === "username"
              ? "Create Account"
              : step === "pin"
              ? "Set Your PIN"
              : "Confirm PIN"}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {step === "username"
              ? "Choose a username for your profile"
              : step === "pin"
              ? "Create a 4-digit PIN to secure your account"
              : "Enter your PIN again to confirm"}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.form}
      >
        {step === "username" ? (
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        ) : (
          <View style={styles.pinSection}>
            <PinInput
              value={step === "pin" ? pin : confirmPin}
              onChange={(value) => {
                if (step === "pin") {
                  setPin(value);
                } else {
                  setConfirmPin(value);
                }
                setError(false);
              }}
              error={error}
            />
          </View>
        )}

        <View style={styles.buttons}>
          {step !== "username" ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ThemedText type="link">Back</ThemedText>
            </Pressable>
          ) : null}

          {step === "confirm" ? (
            <Button
              onPress={handleRegister}
              disabled={isLoading || confirmPin.length !== 4}
              style={styles.button}
            >
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          ) : (
            <Button
              onPress={handleNext}
              disabled={
                (step === "username" && !username.trim()) ||
                (step === "pin" && pin.length !== 4)
              }
              style={styles.button}
            >
              Continue
            </Button>
          )}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(300).springify()}
        style={styles.footer}
      >
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Already have an account?{" "}
        </ThemedText>
        <Pressable onPress={() => navigation.navigate("Login")}>
          <ThemedText type="link">Sign In</ThemedText>
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
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  pinSection: {
    marginBottom: Spacing.xl,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },
});
