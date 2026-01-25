import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useIsOnline } from '@/hooks/useNetworkStatus';
import { Spacing } from '@/constants/theme';

interface OfflineIndicatorProps {
  compact?: boolean;
}

export function OfflineIndicator({ compact = false }: OfflineIndicatorProps) {
  const isOnline = useIsOnline();
  const { theme, language } = useTheme();
  const opacity = useSharedValue(1);

  const t = (en: string, ru: string) => (language === 'ru' ? ru : en);

  useEffect(() => {
    if (!isOnline) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(1);
    }
  }, [isOnline, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (isOnline) {
    return null;
  }

  if (compact) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.compactContainer, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }, pulseStyle]}
      >
        <Feather name="wifi-off" size={12} color="#FF9500" />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }, pulseStyle]}
    >
      <Feather name="wifi-off" size={14} color="#FF9500" />
      <ThemedText type="caption" style={[styles.text, { color: '#FF9500' }]}>
        {t('Connecting...', 'Подключение...')}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  compactContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
