import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * High-fidelity Telegram-style verification badge.
 * Uses exact SVG path logic for the 8-pointed star shape with rounded tips.
 */
export function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#37aee2" />
            <Stop offset="100%" stopColor="#1e96c8" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M12 2c-.4 0-.8.2-1.1.5L9.1 4.3c-.3.3-.7.4-1.1.4l-2.5.2c-.8.1-1.4.7-1.5 1.5l-.2 2.5c0 .4-.1.8-.4 1.1l-1.8 1.8c-.6.6-.6 1.6 0 2.2l1.8 1.8c.3.3.4.7.4 1.1l.2 2.5c.1.8.7 1.4 1.5 1.5l2.5.2c.4 0 .8.1 1.1.4l1.8 1.8c.6.6 1.6.6 2.2 0l1.8-1.8c.3-.3.7-.4 1.1-.4l2.5-.2c.8-.1 1.4-.7 1.5-1.5l.2-2.5c0-.4.1-.8.4-1.1l1.8-1.8c.6-.6.6-1.6 0-2.2l-1.8-1.8c-.3-.3-.4-.7-.4-1.1l-.2-2.5c-.1-.8-.7-1.4-1.5-1.5l-2.5-.2c-.4 0-.8-.1-1.1-.4L13.1 2.5c-.3-.3-.7-.5-1.1-.5z"
          fill="url(#grad)"
        />
        <Path
          d="M8.5 12.5l2.5 2.5 5.5-5.5"
          stroke="white"
          strokeWidth="2.2"
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
