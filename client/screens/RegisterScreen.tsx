import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { PinInput } from "@/components/PinInput";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, getRandomEmoji } from "@/constants/theme";
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
  const [step, setStep] = useState<"username" | "age" | "pin" | "confirm">("username");
  const [previewEmoji] = useState(getRandomEmoji());
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);

  const handleNext = () => {
    if (step === "username") {
      if (!username.trim()) {
        Alert.alert("Error", "Please enter a username");
        return;
      }
      setStep("age");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (step === "age") {
      if (!isAgeConfirmed) {
        Alert.alert("Confirmation required", "You must confirm that you are at least 18 years old to continue.");
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
    if (step === "age") {
      setStep("username");
    } else if (step === "pin") {
      setStep("age");
    } else if (step === "confirm") {
      setStep("pin");
      setConfirmPin("");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <Animated.View entering={FadeInUp.delay(100).duration(800).springify()} style={styles.header}>
          <Avatar emoji={previewEmoji} size={80} />
          <ThemedText type="h2" style={styles.title}>
            {step === "username"
              ? "Create Account"
              : step === "age"
              ? "Age Restriction"
              : step === "pin"
              ? "Create PIN"
              : "Confirm PIN"}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary, opacity: 0.8 }]}
          >
            {step === "username"
              ? "Choose a username for your profile"
              : step === "age"
              ? "The Okeno app has an 18+ age rating. Please confirm your age."
              : step === "pin"
              ? "Create a 4-digit PIN for protection"
              : "Enter your PIN again to confirm"}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(800).springify()}
          style={styles.form}
        >
          {step === "username" ? (
            <Input
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          ) : step === "age" ? (
            <View style={styles.ageSection}>
              <Pressable 
                onPress={() => setIsAgeConfirmed(!isAgeConfirmed)}
                style={[
                  styles.ageConfirmBox, 
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: isAgeConfirmed ? theme.accent : theme.border
                  }
                ]}
              >
                <View style={[
                  styles.checkbox, 
                  { 
                    backgroundColor: isAgeConfirmed ? theme.accent : 'transparent',
                    borderColor: isAgeConfirmed ? theme.accent : theme.textSecondary
                  }
                ]}>
                  {isAgeConfirmed && <Feather name="check" size={14} color="white" />}
                </View>
                <ThemedText style={{ flex: 1, marginLeft: Spacing.sm }}>
                  I am at least 18 years old and I accept the terms of use.
                </ThemedText>
              </Pressable>
            </View>
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
                  (step === "age" && !isAgeConfirmed) ||
                  (step === "pin" && pin.length !== 4)
                }
                style={styles.button}
              >
                Next
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
            <ThemedText type="link">Login</ThemedText>
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
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  pinSection: {
    marginBottom: Spacing.md,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: {
    flex: 1,
  },
  ageSection: {
    marginBottom: Spacing.xl,
  },
  ageConfirmBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
});
