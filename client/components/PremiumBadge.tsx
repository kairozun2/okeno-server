import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface PremiumBadgeProps {
  size?: number;
  style?: ViewStyle;
}

export function PremiumBadge({ size = 16, style }: PremiumBadgeProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <SvgLinearGradient id="premGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFA500" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.6l-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"
          fill="url(#premGrad)"
        />
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
