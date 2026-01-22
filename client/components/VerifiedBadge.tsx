import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

export function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  const iconSize = Math.round(size * 0.7);
  
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <LinearGradient
        colors={["#00D2FF", "#3A7BD5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, opacity: 0.9 }]}
      />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }]} />
      <Feather name="check" size={iconSize} color="#FFFFFF" style={{ marginBottom: 0.5 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
