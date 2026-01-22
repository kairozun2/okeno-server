import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Modern, unique verified badge inspired by Instagram's seal.
 * Balanced shape with perfect circular flow and organic edges.
 */
export function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#3797EF" />
            <Stop offset="100%" stopColor="#2459D6" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M12 2c.5 0 1 .2 1.4.5l1.1.8c.4.3.9.4 1.4.4h1.4c.9 0 1.7.7 1.7 1.7v1.4c0 .5.1 1 .4 1.4l.8 1.1c.3.4.5.9.5 1.4s-.2 1-.5 1.4l-.8 1.1c-.3.4-.4.9-.4 1.4v1.4c0 .9-.7 1.7-1.7 1.7h-1.4c-.5 0-1 .1-1.4.4l-1.1.8c-.4.3-.9.5-1.4.5s-1-.2-1.4-.5l-1.1-.8c-.4-.3-.9-.4-1.4-.4H4.7c-.9 0-1.7-.7-1.7-1.7v-1.4c0-.5-.1-1-.4-1.4l-.8-1.1c-.3-.4-.5-.9-.5-1.4s.2-1 .5-1.4l.8-1.1c.3-.4.4-.9.4-1.4V4.7c0-.9.7-1.7 1.7-1.7h1.4c.5 0 1-.1 1.4-.4l1.1-.8c.4-.3.9-.5 1.4-.5z"
          fill="url(#grad)"
        />
        <Path
          d="M8.5 12.5l2.5 2.5 5.5-5.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
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
