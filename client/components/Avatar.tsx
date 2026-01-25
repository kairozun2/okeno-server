import React from "react";
import { View, Text, StyleSheet, ViewStyle, Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface AvatarProps {
  emoji: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ emoji, size = 40, style }: AvatarProps) {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: theme.backgroundSecondary,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border
        }, 
        style
      ]}
    >
      <Text 
        style={[
          styles.emoji, 
          { 
            fontSize: size * 0.6,
            includeFontPadding: false,
            textAlignVertical: 'center',
            color: '#fff',
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
