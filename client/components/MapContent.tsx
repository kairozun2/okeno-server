import React from "react";
import { View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import NativeMapView from "./NativeMapView";

interface MapContentProps {
  lat: number;
  lng: number;
  name: string;
  isDark: boolean;
}

export function MapContent({ lat, lng, name, isDark }: MapContentProps) {
  const { theme } = useTheme();

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl }}>
        <Feather name="map-pin" size={48} color={theme.link} />
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </ThemedText>
      </View>
    );
  }

  return <NativeMapView lat={lat} lng={lng} name={name} isDark={isDark} />;
}
