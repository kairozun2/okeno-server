import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

export default function CreatePostScreen({ navigation }: Props) {
  const { theme, language } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  }>({ name: null, latitude: null, longitude: null });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error(t("No image selected", "Изображение не выбрано"));

      const response = await apiRequest("POST", "/api/posts", {
        userId: user?.id,
        imageUrl: image,
        location: location.name,
        latitude: location.latitude?.toString(),
        longitude: location.longitude?.toString(),
      });
      return response.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert(t("Error", "Ошибка"), t("Failed to create post", "Не удалось создать пост"));
    },
  });

  const pickImage = async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) {
        Alert.alert(t("Permission needed", "Требуется разрешение"), t("Please allow access to your photos", "Пожалуйста, разрешите доступ к вашим фотографиям"));
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(t("Permission needed", "Требуется разрешение"), t("Please allow camera access", "Пожалуйста, разрешите доступ к камере"));
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const getLocation = async () => {
    if (!locationPermission?.granted) {
      const result = await requestLocationPermission();
      if (!result.granted) {
        Alert.alert(t("Permission needed", "Требуется разрешение"), t("Please allow location access", "Пожалуйста, разрешите доступ к местоположению"));
        return;
      }
    }

    setIsLoadingLocation(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const locationName = address
        ? [address.city, address.region, address.country].filter(Boolean).join(", ")
        : t("Unknown location", "Неизвестное местоположение");

      setLocation({
        name: locationName,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert(t("Error", "Ошибка"), t("Failed to get location", "Не удалось получить местоположение"));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handlePost = () => {
    if (!image) {
      Alert.alert(t("Select an image", "Выберите изображение"), t("Please select or take a photo first", "Пожалуйста, сначала выберите или сделайте фото"));
      return;
    }
    createPostMutation.mutate();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("New Post", "Новый пост"),
    });
  }, [navigation, language]);

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}>
      <Animated.View entering={FadeIn} style={styles.content}>
        {image ? (
          <Animated.View entering={FadeInDown} style={styles.imageContainer}>
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              contentFit="cover"
            />
            <Pressable
              onPress={() => setImage(null)}
              style={[styles.removeButton, { backgroundColor: theme.backgroundRoot }]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.imagePickers}>
            <Pressable
              onPress={takePhoto}
              style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="camera" size={32} color={theme.text} />
              <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                {t("Take Photo", "Сделать фото")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={pickImage}
              style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="image" size={32} color={theme.text} />
              <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                {t("Gallery", "Галерея")}
              </ThemedText>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={getLocation}
          disabled={isLoadingLocation}
          style={[styles.locationButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather
            name="map-pin"
            size={20}
            color={location.name ? theme.link : theme.textSecondary}
          />
          <ThemedText
            type="body"
            style={{
              flex: 1,
              marginLeft: Spacing.md,
              color: location.name ? theme.text : theme.textSecondary,
            }}
          >
            {isLoadingLocation
              ? t("Getting location...", "Получение местоположения...")
              : location.name || t("Add location", "Добавить местоположение")}
          </ThemedText>
          {location.name ? (
            <Pressable
              onPress={() => setLocation({ name: null, latitude: null, longitude: null })}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          onPress={handlePost}
          disabled={!image || createPostMutation.isPending}
        >
          {createPostMutation.isPending ? t("Posting...", "Публикация...") : t("Share", "Поделиться")}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  imagePickers: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  pickerButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
  },
  removeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
