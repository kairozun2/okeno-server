import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "EditPost">;

export default function EditPostScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: post } = useQuery<{ id: string; userId: string; location: string | null }>({
    queryKey: ["/api/posts", postId],
  });

  const [location, setLocation] = useState(post?.location || "");

  const updateMutation = useMutation({
    mutationFn: async (data: { location: string }) => {
      await apiRequest("PATCH", `/api/posts/${postId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${post?.userId}/archived`, { postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", post?.userId, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", post?.userId, "archived"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: () => {
      Alert.alert("Error", "Failed to archive post");
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ location });
  };

  const handleArchive = () => {
    Alert.alert("Archive", "Move this post to archive?", [
      { text: "Cancel", style: "cancel" },
      { text: "To Archive", onPress: () => archiveMutation.mutate() }
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <ThemedText type="caption" style={styles.label}>GEOLOCATION</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: theme.cardBackground }]}>
            <Feather name="map-pin" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Where was this?"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Pressable 
            onPress={handleArchive}
            style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
          >
            <Feather name="archive" size={20} color={theme.text} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>Archive post</ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Pressable 
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: theme.link }]}
          >
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>Save changes</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    opacity: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  saveButton: {
    height: 50,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  }
});
