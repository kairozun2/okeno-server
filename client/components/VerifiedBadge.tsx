import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 16 }: VerifiedBadgeProps) {
  const iconSize = Math.round(size * 0.6);
  
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={["#00C6FB", "#005BEA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <Feather name="check" size={iconSize} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
