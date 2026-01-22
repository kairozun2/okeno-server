import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface GlassHeaderProps {
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function GlassHeader({ style, children }: GlassHeaderProps) {
  return (
    <Animated.View entering={FadeIn} style={[styles.container, style]}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          {children}
        </View>
        <View style={styles.bottomMist} />
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.glassBorder,
  },
  bottomMist: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: Colors.background,
    opacity: 0.4,
    // This creates the misty/fading effect
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 1,
    shadowRadius: 20,
  }
});

import { View } from 'react-native';
