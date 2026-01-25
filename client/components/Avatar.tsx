import React from "react";
import { View, Text, StyleSheet, ViewStyle, Platform } from "react-native";

interface AvatarProps {
  emoji: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ emoji, size = 40, style }: AvatarProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text 
        style={[
          styles.emoji, 
          { 
            fontSize: size * 0.7,
            includeFontPadding: false,
            textAlignVertical: 'center',
            // Fix for Android emoji rendering issues
            fontFamily: Platform.OS === 'ios' ? undefined : 'System',
          }
        ]}
      >
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    textAlign: "center",
  },
});
