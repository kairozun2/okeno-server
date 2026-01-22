import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * VerifiedBadge component inspired by Telegram's star-like verification mark.
 */
export function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L14.5 4.5L18 4L18.5 7.5L22 9L21 12.5L23 16L19.5 17L18 20.5L14.5 20L12 22.5L9.5 20L6 20.5L4.5 17L1 16L3 12.5L2 9L5.5 7.5L6 4L9.5 4.5L12 2Z"
          fill="url(#grad)"
        />
        <Path
          d="M8 12L11 15L17 9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            id="grad"
            colors={["#00D2FF", "#3A7BD5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
