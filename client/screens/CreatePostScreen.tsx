import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, TextInput, ScrollView, Keyboard, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
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
  const [caption, setCaption] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  }>({ name: null, latitude: null, longitude: null });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const loadCustomEmoji = async () => {
      try {
        const saved = await AsyncStorage.getItem("custom_emoji");
        if (saved) setCustomEmoji(saved);
      } catch (error) {
        console.error("Failed to load custom emoji", error);
      }
    };
    loadCustomEmoji();
  }, []);

  const saveCustomEmoji = async (emoji: string) => {
    try {
      await AsyncStorage.setItem("custom_emoji", emoji);
    } catch (error) {
      console.error("Failed to save custom emoji", error);
    }
  };

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (uri: string): Promise<string> => {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Determine mime type from URI
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Upload to server
    const response = await apiRequest("POST", "/api/upload", { image: dataUrl });
    const data = await response.json();
    return data.url;
  };

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error(t("No image selected", "Изображение не выбрано"));

      setIsUploading(true);
      
      // Upload image first and get server URL
      const imageUrl = await uploadImage(image);

      const response = await apiRequest("POST", "/api/posts", {
        userId: user?.id,
        imageUrl: imageUrl,
        caption: caption.trim() || null,
        feeling: feeling,
        location: location.name,
        latitude: location.latitude?.toString(),
        longitude: location.longitude?.toString(),
      });
      return response.json();
    },
    onSuccess: () => {
      setIsUploading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
      navigation.goBack();
    },
    onError: (error) => {
      setIsUploading(false);
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
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {image && (
            <Image
              source={{ uri: image }}
              style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
              contentFit="cover"
            />
          )}
          <ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
            {t("New Memory", "Новое воспоминание")}
          </ThemedText>
        </View>
      ),
      headerTitleStyle: {
        fontSize: 16,
        fontWeight: "600",
      },
      headerStyle: {
        backgroundColor: theme.backgroundRoot,
      },
      headerShadowVisible: false,
      headerRight: () => (
        <Pressable 
          onPress={handlePost} 
          disabled={!image || createPostMutation.isPending || isUploading}
          style={{ padding: Spacing.sm }}
        >
          <Feather 
            name="send" 
            size={22} 
            color={!image || createPostMutation.isPending || isUploading ? theme.textSecondary : theme.link} 
          />
        </Pressable>
      ),
    });
  }, [navigation, language, image, createPostMutation.isPending, isUploading, theme]);

  const FEELINGS = [
    { id: "peaceful", emoji: "🌿", en: "Peaceful", ru: "Спокойствие" },
    { id: "grateful", emoji: "✨", en: "Grateful", ru: "Благодарность" },
    { id: "nostalgic", emoji: "🌅", en: "Nostalgic", ru: "Ностальгия" },
    { id: "happy", emoji: "🌱", en: "Happy", ru: "Счастье" },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={styles.container}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={{ 
            paddingTop: Spacing.xs,
            paddingBottom: insets.bottom + Spacing.xl 
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn}>
            <View style={styles.sectionTitleRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {t("What's this feeling?", "Какое это чувство?")}
              </ThemedText>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feelingsScroll}>
              <View style={styles.feelingsContainer}>
                {FEELINGS.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      setFeeling(feeling === f.emoji ? null : f.emoji);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.feelingChip,
                      { 
                        backgroundColor: feeling === f.emoji ? theme.link + '20' : theme.backgroundSecondary,
                        borderColor: feeling === f.emoji ? theme.link : 'transparent'
                      }
                    ]}
                  >
                    <ThemedText style={{ fontSize: 16 }}>{f.emoji}</ThemedText>
                    <ThemedText type="small" style={{ marginLeft: 6, color: feeling === f.emoji ? theme.link : theme.text }}>
                      {t(f.en, f.ru)}
                    </ThemedText>
                  </Pressable>
                ))}
                
                {customEmoji ? (
                  <Pressable
                    onPress={() => {
                      setFeeling(feeling === customEmoji ? null : customEmoji);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.feelingChip,
                      { 
                        backgroundColor: feeling === customEmoji ? theme.link + '20' : theme.backgroundSecondary,
                        borderColor: feeling === customEmoji ? theme.link : 'transparent'
                      }
                    ]}
                  >
                    <ThemedText style={{ fontSize: 16 }}>{customEmoji}</ThemedText>
                    <ThemedText type="small" style={{ marginLeft: 6, color: feeling === customEmoji ? theme.link : theme.text }}>
                      {t("Custom", "Своё")}
                    </ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (Platform.OS === 'ios') {
                      Alert.prompt(
                        t("Add Custom Emoji", "Добавить свой эмодзи"),
                        t("Enter one emoji", "Введите один эмодзи"),
                        [
                          { text: t("Cancel", "Отмена"), style: "cancel" },
                          { 
                            text: t("Add", "Добавить"), 
                            onPress: (val: string | undefined) => {
                              if (val && val.trim()) {
                                const emoji = [...val.trim()][0] || val.trim().substring(0, 2);
                                setCustomEmoji(emoji);
                                setFeeling(emoji);
                                saveCustomEmoji(emoji);
                              }
                            } 
                          }
                        ],
                        'plain-text'
                      );
                    } else {
                      const commonEmojis = ["😊", "😢", "😎", "🔥", "💖", "🌟", "🎉", "😴"];
                      Alert.alert(
                        t("Add Custom Emoji", "Добавить свой эмодзи"),
                        t("Choose an emoji", "Выберите эмодзи"),
                        commonEmojis.map(em => ({
                          text: em,
                          onPress: () => {
                            setCustomEmoji(em);
                            setFeeling(em);
                          }
                        }))
                      );
                    }
                  }}
                  style={[
                    styles.feelingChip,
                    { backgroundColor: theme.backgroundSecondary, borderColor: 'transparent', width: 44, justifyContent: 'center' }
                  ]}
                >
                  <Feather name="plus" size={20} color={theme.text} />
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.mediaButtonsRow}>
              <Pressable onPress={pickImage} style={[styles.mediaActionBtn, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="image" size={18} color={theme.text} />
                <ThemedText type="small" style={styles.mediaActionText}>{t("Gallery", "Галерея")}</ThemedText>
              </Pressable>
              <Pressable onPress={takePhoto} style={[styles.mediaActionBtn, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="camera" size={18} color={theme.text} />
                <ThemedText type="small" style={styles.mediaActionText}>{t("Camera", "Камера")}</ThemedText>
              </Pressable>
              <Pressable onPress={getLocation} disabled={isLoadingLocation} style={[styles.mediaActionBtn, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="map-pin" size={18} color={location.name ? theme.link : theme.text} />
                <ThemedText type="small" style={[styles.mediaActionText, location.name && { color: theme.link }]}>
                  {isLoadingLocation ? t("Wait...", "Ждите...") : t("Place", "Место")}
                </ThemedText>
              </Pressable>
            </View>

            {/* Image preview removed from here as it is now in the header */}


            <View style={styles.inputWrapper}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder={t("what are you thinking about?", "о чём вы думаете?")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.captionInput, { color: theme.text }]}
                multiline
                maxLength={1000}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  sectionTitleRow: {
    paddingHorizontal: Spacing.lg,
    marginTop: 0,
    marginBottom: 0,
  },
  feelingsScroll: {
    marginBottom: Spacing.sm,
    marginTop: 0,
  },
  feelingsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  feelingChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaButtonsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  mediaActionText: {
    marginLeft: 6,
    fontWeight: "500",
  },
  imageContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    aspectRatio: 1,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  captionInput: {
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 0,
  },
});
