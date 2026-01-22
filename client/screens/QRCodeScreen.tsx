import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Platform,
  Alert,
  Modal,
  Dimensions 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
const QR_SIZE = Math.min(SCREEN_WIDTH - Spacing["3xl"] * 2, 280);

type Props = NativeStackScreenProps<RootStackParamList, "QRCode">;

export default function QRCodeScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      console.log('Creating chat with:', { user1Id: user?.id, user2Id: otherUserId });
      const response = await apiRequest("POST", "/api/chats", {
        user1Id: user?.id,
        user2Id: otherUserId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScannerOpen(false);
      navigation.navigate("Chat", { 
        chatId: data.id,
        otherUserId: data.user1Id === user?.id ? data.user2Id : data.user1Id,
      });
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Ошибка", "Не удалось начать чат. Попробуйте ещё раз.");
      setIsProcessing(false);
      setScannedData(null);
    },
  });

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Нужен доступ к камере",
          "Для сканирования QR-кода необходимо разрешить доступ к камере в настройках."
        );
        return;
      }
    }
    setIsScannerOpen(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isProcessing || scannedData) return;
    
    setScannedData(data);
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Allow both "moments:user:ID" and just "ID"
    const userId = data.startsWith("moments:user:") 
      ? data.replace("moments:user:", "") 
      : data;

    if (userId.length > 5) { // Basic length check for a UUID-like ID
      if (userId === user?.id) {
        Alert.alert("Это вы!", "Вы отсканировали свой собственный QR-код.");
        setIsProcessing(false);
        setScannedData(null);
        return;
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScannerOpen(false);
      setIsProcessing(false);
      setScannedData(null);
      
      // Navigate to profile instead of creating a chat
      navigation.navigate("UserProfile", { userId });
    } else {
      Alert.alert("Неверный QR-код", "Этот QR-код не принадлежит пользователю Moments.");
      setIsProcessing(false);
      setScannedData(null);
    }
  };

  const qrValue = `moments:user:${user?.id}`;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          {Platform.OS === "ios" && (
            <BlurView
              intensity={50}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: "hidden" }]}
            />
          )}
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Мой QR-код</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.avatarSection}>
          <Avatar emoji={user?.emoji || "🐸"} size={80} />
          <ThemedText type="h3" style={styles.username}>
            {user?.username}
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeIn.delay(200)}
          style={[styles.qrContainer, { backgroundColor: "#fff" }]}
        >
          <QRCodeDisplay
            value={qrValue}
            size={QR_SIZE}
            backgroundColor="#fff"
            color="#000"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.scanSection}>
          <Pressable
            onPress={handleOpenScanner}
            style={[styles.scanButton, { backgroundColor: theme.link }]}
          >
            <Feather name="camera" size={20} color="#fff" />
            <ThemedText type="body" style={styles.scanButtonText}>
              Сканировать QR-код
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Отсканируйте QR-код другого пользователя, чтобы начать с ним чат
          </ThemedText>
        </Animated.View>
      </View>

      <Modal
        visible={isScannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <View style={[styles.scannerContainer, { backgroundColor: "#000" }]}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable
              onPress={() => {
                setIsScannerOpen(false);
                setScannedData(null);
                setIsProcessing(false);
              }}
              style={styles.scannerCloseButton}
            >
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            <ThemedText type="h4" style={{ color: "#fff" }}>
              Сканирование
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />

          <View style={styles.scannerOverlay}>
            <View style={[styles.scanFrame, { borderColor: theme.link }]} />
          </View>

          <View style={[styles.scannerFooter, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <ThemedText type="body" style={{ color: "#fff", textAlign: "center" }}>
              {isProcessing ? "Обработка..." : "Наведите камеру на QR-код"}
            </ThemedText>
          </View>
        </View>
      </Modal>
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
    paddingTop: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  username: {
    marginTop: Spacing.md,
    fontWeight: "700",
  },
  qrContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["3xl"],
  },
  scanSection: {
    alignItems: "center",
    gap: Spacing.md,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: BorderRadius.lg,
  },
  scannerFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
});
