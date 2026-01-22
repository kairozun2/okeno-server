import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
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
  const [step, setStep] = useState<"username" | "pin" | "confirm">("username");
  const [previewEmoji] = useState(getRandomEmoji());

  const handleNext = () => {
    if (step === "username") {
      if (!username.trim()) {
        Alert.alert("Ошибка", "Введите имя пользователя");
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
      Alert.alert("Ошибка", "PIN-коды не совпадают");
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
      Alert.alert("Ошибка", err.message || "Не удалось зарегистрироваться");
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
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
          <Avatar emoji={previewEmoji} size={64} />
          <ThemedText type="h2" style={styles.title}>
            {step === "username"
              ? "Создать аккаунт"
              : step === "pin"
              ? "Создайте PIN"
              : "Подтвердите PIN"}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {step === "username"
              ? "Выберите имя для вашего профиля"
              : step === "pin"
              ? "Создайте 4-значный PIN для защиты"
              : "Введите PIN ещё раз для подтверждения"}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.form}
        >
          {step === "username" ? (
            <Input
              placeholder="Имя пользователя"
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
                <ThemedText type="link">Назад</ThemedText>
              </Pressable>
            ) : null}

            {step === "confirm" ? (
              <Button
                onPress={handleRegister}
                disabled={isLoading || confirmPin.length !== 4}
                style={styles.button}
              >
                {isLoading ? "Создание..." : "Создать аккаунт"}
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
                Далее
              </Button>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={styles.footer}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Уже есть аккаунт?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <ThemedText type="link">Войти</ThemedText>
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
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
});
