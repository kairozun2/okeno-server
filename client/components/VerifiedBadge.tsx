import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Modern, unique verified badge inspired by Instagram's seal but with a liquid glass feel.
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
          d="M12 2.1l1.1 1.4c.4.5 1.1.7 1.7.5l1.7-.5c1.1-.3 2.2.4 2.4 1.5l.3 1.8c.1.6.6 1.1 1.2 1.2l1.8.3c1.1.2 1.8 1.3 1.5 2.4l-.5 1.7c-.2.6 0 1.3.5 1.7l1.4 1.1c.9.7.9 2.1 0 2.8l-1.4 1.1c-.5.4-.7 1.1-.5 1.7l.5 1.7c.3 1.1-.4 2.2-1.5 2.4l-1.8.3c-.6.1-1.1.6-1.2 1.2l-.3 1.8c-.2 1.1-1.3 1.8-2.4 1.5l-1.7-.5c-.6-.2-1.3 0-1.7.5l-1.1 1.4c-.7.9-2.1.9-2.8 0l-1.1-1.4c-.4-.5-1.1-.7-1.7-.5l-1.7.5c-1.1.3-2.2-.4-2.4-1.5l-.3-1.8c-.1-.6-.6-1.1-1.2-1.2l-1.8-.3c-1.1-.2-1.8-1.3-1.5-2.4l.5-1.7c.2-.6 0-1.3-.5-1.7l-1.4-1.1c-.9-.7-.9-2.1 0-2.8l1.4-1.1c.5-.4.7-1.1.5-1.7l-.5-1.7c-.3-1.1.4-2.2 1.5-2.4l1.8-.3c.6-.1 1.1-.6 1.2-1.2l.3-1.8c.2-1.1 1.3-1.8 2.4-1.5l1.7.5c.6.2 1.3 0 1.7-.5L10.6 2.1c.7-.9 2.1-.9 2.8 0z"
          fill="url(#grad)"
        />
        <Path
          d="M8.5 12.5L10.5 14.5L15.5 9.5"
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
