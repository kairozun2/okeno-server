import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Svg, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Modern, unique verified badge inspired by Instagram's seal but with a liquid glass feel.
 * Updated with smoother, rounded paths for a more organic feel.
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
          d="M12 2c-.8 0-1.5.5-1.8 1.2l-.5 1c-.2.4-.6.7-1 .8l-1.1.2c-.8.1-1.4.8-1.4 1.6l0 1.1c0 .5-.2.9-.5 1.2l-.8.8c-.6.6-.6 1.5 0 2.1l.8.8c.3.3.5.7.5 1.2l0 1.1c0 .8.6 1.5 1.4 1.6l1.1.2c.4.1.8.4 1 .8l.5 1c.3.7 1 1.2 1.8 1.2s1.5-.5 1.8-1.2l.5-1c.2-.4.6-.7 1-.8l1.1-.2c.8-.1 1.4-.8 1.4-1.6l0-1.1c0-.5.2-.9.5-1.2l.8-.8c.6-.6.6-1.5 0-2.1l-.8-.8c-.3-.3-.5-.7-.5-1.2l0-1.1c0-.8-.6-1.5-1.4-1.6l-1.1-.2c-.4-.1-.8-.4-1-.8l-.5-1c-.3-.7-1-1.2-1.8-1.2z"
          fill="url(#grad)"
        />
        <Path
          d="M9 12.5l2 2 4.5-4.5"
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
