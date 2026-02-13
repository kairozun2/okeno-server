import React, { useState, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Platform,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH - Spacing["3xl"] * 2, 240);
const DISMISS_THRESHOLD = 120;

type Props = NativeStackScreenProps<RootStackParamList, "QRCode">;

export default function QRCodeScreen({ navigation }: Props) {
  const { theme, isDark, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const translateY = useSharedValue(0);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 600) {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        }, () => {
          runOnJS(goBack)();
        });
      } else {
        translateY.value = withSpring(0, {
          damping: 25,
          stiffness: 250,
          mass: 0.8,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => {
    const drag = translateY.value;
    const maxDrag = SCREEN_HEIGHT * 0.4;
    const progress = interpolate(drag, [0, maxDrag], [0, 1], Extrapolation.CLAMP);

    const scaleX = interpolate(progress, [0, 1], [1, 0.9]);
    const radius = interpolate(progress, [0, 0.2], [BorderRadius.xl, 28], Extrapolation.CLAMP);
    const marginH = interpolate(progress, [0, 1], [0, 16]);
    const marginBottom = interpolate(progress, [0, 1], [0, 16]);

    return {
      transform: [
        { translateY: drag },
        { scaleX },
      ],
      borderBottomLeftRadius: radius,
      borderBottomRightRadius: radius,
      marginHorizontal: marginH,
      marginBottom,
    };
  });

  const handleBarStyle = useAnimatedStyle(() => {
    const drag = translateY.value;
    const progress = interpolate(drag, [0, 100], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(progress, [0, 1], [0.35, 0.7]),
      width: interpolate(progress, [0, 1], [36, 48]),
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const drag = translateY.value;
    const maxDrag = SCREEN_HEIGHT * 0.4;
    return {
      opacity: interpolate(drag, [0, maxDrag], [1, 0], Extrapolation.CLAMP),
    };
  });

  const createChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
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
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to start chat.");
      setIsProcessing(false);
      setScannedData(null);
    },
  });

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          t("Camera access needed", "\u041D\u0443\u0436\u0435\u043D \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043A\u0430\u043C\u0435\u0440\u0435"),
          t("Allow camera access in settings to scan QR codes.", "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043A\u0430\u043C\u0435\u0440\u0435 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445.")
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
    
    const userId = data.startsWith("okeno:user:") 
      ? data.replace("okeno:user:", "") 
      : data;

    if (userId.length > 5) {
      if (userId === user?.id) {
        Alert.alert(t("It's you!", "\u042D\u0442\u043E \u0432\u044B!"), t("You scanned your own QR code.", "\u0412\u044B \u043E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043B\u0438 \u0441\u0432\u043E\u0439 QR-\u043A\u043E\u0434."));
        setIsProcessing(false);
        setScannedData(null);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsScannerOpen(false);
      setIsProcessing(false);
      setScannedData(null);
      navigation.navigate("UserProfile", { userId });
    } else {
      Alert.alert(t("Invalid QR code", "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 QR-\u043A\u043E\u0434"), t("Not an Okeno user.", "\u041D\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C Okeno."));
      setIsProcessing(false);
      setScannedData(null);
    }
  };

  const qrValue = `okeno:user:${user?.id}`;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
      </Animated.View>

      <View style={styles.sheetWrapper}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.handleArea}>
              <Animated.View style={[styles.handleBar, handleBarStyle, { backgroundColor: theme.textSecondary }]} />
            </View>

            <View style={styles.header}>
              <Pressable onPress={goBack} style={styles.closeButton} hitSlop={12}>
                {Platform.OS === "ios" ? (
                  <BlurView
                    intensity={50}
                    tint={isDark ? "dark" : "light"}
                    style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: "hidden" }]}
                  />
                ) : null}
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
              <ThemedText type="h4">{t("My QR-code", "\u041C\u043E\u0439 QR-\u043A\u043E\u0434")}</ThemedText>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.content}>
              <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.avatarSection}>
                <Avatar emoji={user?.emoji || "\u{1F438}"} size={68} />
                <ThemedText type="h3" style={styles.username}>
                  {user?.username}
                </ThemedText>
              </Animated.View>

              <Animated.View 
                entering={FadeIn.delay(200).duration(350)}
                style={[styles.qrContainer, { backgroundColor: "#fff" }]}
              >
                <QRCodeDisplay
                  value={qrValue}
                  size={QR_SIZE}
                  backgroundColor="#fff"
                  color="#000"
                />
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300).duration(350)} style={styles.scanSection}>
                <Pressable
                  onPress={handleOpenScanner}
                  style={[styles.scanButton, { backgroundColor: theme.link }]}
                >
                  <Feather name="camera" size={20} color="#fff" />
                  <ThemedText type="body" style={styles.scanButtonText}>
                    {t("Scan QR-code", "\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C QR-\u043A\u043E\u0434")}
                  </ThemedText>
                </Pressable>
                <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  {t("Scan to view their profile", "\u041E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F")}
                </ThemedText>
              </Animated.View>
            </View>

            <View style={{ height: insets.bottom + Spacing.md }} />
          </Animated.View>
        </GestureDetector>
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
              {t("Scanning", "\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435")}
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />

          <View style={styles.scannerOverlay}>
            <View style={[styles.scanFrame, { borderColor: theme.link }]} />
          </View>

          <View style={[styles.scannerFooter, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <ThemedText type="body" style={{ color: "#fff", textAlign: "center" }}>
              {isProcessing
                ? t("Processing...", "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430...")
                : t("Point camera at QR-code", "\u041D\u0430\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u0430\u043C\u0435\u0440\u0443 \u043D\u0430 QR-\u043A\u043E\u0434")}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: "hidden",
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  handleBar: {
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
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
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  username: {
    marginTop: Spacing.sm,
    fontWeight: "700",
  },
  qrContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  scanSection: {
    alignItems: "center",
    gap: Spacing.sm,
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
