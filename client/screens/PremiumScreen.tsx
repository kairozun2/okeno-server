import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Premium">;

interface Feature {
  id: string;
  titleEn: string;
  titleRu: string;
  descEn: string;
  descRu: string;
  icon: string;
}

export default function PremiumScreen({ navigation }: Props) {
  const { theme, language, hapticsEnabled } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const { data: featuresData } = useQuery<{ features: Feature[] }>({
    queryKey: ["/api/premium/features"],
  });

  const { data: subData } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/stripe/subscription", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stripe/subscription/${user?.id}`, null);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const isPremium = subData?.isPremium || (user as any)?.isPremium;
  const features = featuresData?.features || [];

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/checkout", {
        userId: user?.id,
        priceId: "premium_monthly",
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        if (Platform.OS === "web") {
          window.open(data.url, "_blank");
        } else {
          await WebBrowser.openBrowserAsync(data.url);
        }
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal", {
        userId: user?.id,
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        if (Platform.OS === "web") {
          window.open(data.url, "_blank");
        } else {
          await WebBrowser.openBrowserAsync(data.url);
        }
      }
    },
  });

  const handleSubscribe = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkoutMutation.mutate();
  };

  const handleManage = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    portalMutation.mutate();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl * 2,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
          <View style={[styles.premiumIcon, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="star" size={32} color={theme.accent} />
          </View>
          <ThemedText type="h2" style={styles.heroTitle}>
            Okeno Premium
          </ThemedText>
          <ThemedText type="body" style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            {isPremium
              ? t("You have an active premium subscription", "У вас активная премиум-подписка")
              : t("Unlock exclusive features and stand out", "Разблокируйте эксклюзивные функции")}
          </ThemedText>
        </Animated.View>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.id}
              entering={FadeInDown.delay(100 + index * 60).duration(300)}
              style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: theme.accent + "15" }]}>
                <Feather name={feature.icon as any} size={20} color={theme.accent} />
              </View>
              <ThemedText type="body" style={styles.featureTitle}>
                {language === "ru" ? feature.titleRu : feature.titleEn}
              </ThemedText>
              <ThemedText type="caption" style={[styles.featureDesc, { color: theme.textSecondary }]}>
                {language === "ru" ? feature.descRu : feature.descEn}
              </ThemedText>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(300)} style={styles.ctaSection}>
          {isPremium ? (
            <Button onPress={handleManage} style={{ backgroundColor: theme.backgroundSecondary }}>
              <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
                {portalMutation.isPending
                  ? t("Loading...", "Загрузка...")
                  : t("Manage Subscription", "Управление подпиской")}
              </ThemedText>
            </Button>
          ) : (
            <>
              <Button onPress={handleSubscribe} style={{ backgroundColor: theme.accent }}>
                <ThemedText style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  {checkoutMutation.isPending
                    ? t("Loading...", "Загрузка...")
                    : t("Subscribe to Premium", "Подписаться на Premium")}
                </ThemedText>
              </Button>
              <ThemedText type="caption" style={[styles.priceNote, { color: theme.textSecondary }]}>
                {t("Cancel anytime. Secure payment via Stripe.", "Отмена в любое время. Безопасная оплата через Stripe.")}
              </ThemedText>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  premiumIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  featuresGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontWeight: "600",
    flex: 1,
  },
  featureDesc: {
    flex: 2,
    fontSize: 12,
  },
  ctaSection: {
    gap: Spacing.sm,
    alignItems: "center",
  },
  priceNote: {
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
