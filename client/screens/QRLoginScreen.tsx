import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH - Spacing["3xl"] * 2, 260);

type Props = NativeStackScreenProps<RootStackParamList, "QRLogin">;

type TabMode = "show" | "scan";

export default function QRLoginScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user, loginWithSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<TabMode>("show");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const generateToken = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/auth/qr/generate", { userId: user.id });
      const data = await res.json();
      setQrToken(`okeno:login:${data.token}`);
    } catch (e) {
      Alert.alert(t("Error", "Ошибка"), t("Failed to generate QR code", "Не удалось создать QR-код"));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (mode === "show") {
      generateToken();
      timerRef.current = setInterval(generateToken, 4 * 60 * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          t("Camera access needed", "Нужен доступ к камере"),
          t("To scan a QR code, allow camera access in settings.", "Для сканирования QR-кода разрешите доступ к камере в настройках.")
        );
        return;
      }
    }
    setMode("scan");
  };

  const loginMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/auth/qr/login", {
        token,
        deviceInfo: Platform.OS,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loginWithSession(data.user, data.sessionId);
      navigation.goBack();
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("Login failed", "Ошибка входа"),
        error.message === "Invalid or expired token"
          ? t("QR code expired or already used", "QR-код истёк или уже использован")
          : error.message
      );
      setIsProcessing(false);
      setScannedData(null);
    },
  });

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isProcessing || scannedData) return;

    setScannedData(data);
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (data.startsWith("okeno:login:")) {
      const token = data.replace("okeno:login:", "");
      loginMutation.mutate(token);
    } else {
      Alert.alert(
        t("Invalid QR code", "Неверный QR-код"),
        t("This is not a login QR code", "Это не QR-код для входа")
      );
      setIsProcessing(false);
      setScannedData(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? insets.top - 10 : Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: "hidden" }]}
            />
          ) : null}
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">{t("Login via QR", "Вход по QR")}</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabs, { borderColor: theme.border }]}>
        <Pressable
          onPress={() => setMode("show")}
          style={[
            styles.tab,
            mode === "show" ? { backgroundColor: theme.link + "20", borderColor: theme.link } : { borderColor: "transparent" },
          ]}
        >
          <Feather name="smartphone" size={16} color={mode === "show" ? theme.link : theme.textSecondary} />
          <ThemedText style={{ color: mode === "show" ? theme.link : theme.textSecondary, fontWeight: "600", marginLeft: 6 }}>
            {t("My QR", "Мой QR")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleOpenScanner}
          style={[
            styles.tab,
            mode === "scan" ? { backgroundColor: theme.link + "20", borderColor: theme.link } : { borderColor: "transparent" },
          ]}
        >
          <Feather name="camera" size={16} color={mode === "scan" ? theme.link : theme.textSecondary} />
          <ThemedText style={{ color: mode === "scan" ? theme.link : theme.textSecondary, fontWeight: "600", marginLeft: 6 }}>
            {t("Scan QR", "Сканировать")}
          </ThemedText>
        </Pressable>
      </View>

      {mode === "show" ? (
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.avatarSection}>
            <Avatar emoji={user?.emoji || "🐸"} size={72} />
            <ThemedText type="h3" style={styles.username}>
              {user?.username}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
              {t("Scan this QR code on another device to log in to your account", "Отсканируйте этот QR-код на другом устройстве, чтобы войти в ваш аккаунт")}
            </ThemedText>
          </Animated.View>

          {isGenerating && !qrToken ? (
            <View style={[styles.qrContainer, { backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }]}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : qrToken ? (
            <Animated.View entering={FadeIn.delay(200)} style={[styles.qrContainer, { backgroundColor: "#fff" }]}>
              <QRCodeDisplay value={qrToken} size={QR_SIZE} backgroundColor="#fff" color="#000" />
            </Animated.View>
          ) : null}

          <Pressable
            onPress={generateToken}
            style={[styles.refreshButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          >
            <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: "600" }}>
              {t("Refresh QR", "Обновить QR")}
            </ThemedText>
          </Pressable>

          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.lg, paddingHorizontal: Spacing.xl }}>
            {t("QR code expires in 5 minutes. Press refresh to get a new one.", "QR-код действует 5 минут. Нажмите обновить для нового.")}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          {permission?.granted ? (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarCodeScanned}
              />
              <View style={styles.scanOverlay}>
                <View style={[styles.scanFrame, { borderColor: theme.link }]} />
              </View>
              {isProcessing ? (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <ThemedText style={{ color: "#fff", marginTop: Spacing.md, fontWeight: "600" }}>
                    {t("Logging in...", "Входим...")}
                  </ThemedText>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.permissionContainer}>
              <Feather name="camera-off" size={48} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                {t("Camera permission required to scan QR codes", "Для сканирования QR-кодов нужен доступ к камере")}
              </ThemedText>
              <Pressable
                onPress={requestPermission}
                style={[styles.refreshButton, { backgroundColor: theme.link, borderColor: theme.link, marginTop: Spacing.lg }]}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {t("Grant Access", "Разрешить доступ")}
                </ThemedText>
              </Pressable>
            </View>
          )}

          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", padding: Spacing.lg }}>
            {t("Point camera at the QR code on another device", "Наведите камеру на QR-код на другом устройстве")}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  username: {
    marginTop: Spacing.sm,
  },
  qrContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  scannerContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderRadius: BorderRadius.xl,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
});
