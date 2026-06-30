import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

type LoadingIndicatorProps = {
  pulseAnim: Animated.Value;
  progressAnim: Animated.Value;
  statusMessage: string;
};

/**
 * Animated ring + progress bar shown during camera detection.
 * Receives pre-computed Animated.Value refs from useCamera so it
 * never owns any animation logic itself.
 */
export function LoadingIndicator({
  pulseAnim,
  progressAnim,
  statusMessage,
}: LoadingIndicatorProps) {
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <View style={styles.hero}>
      <Animated.View
        style={[
          styles.ring,
          {opacity: pulseOpacity, transform: [{scale: pulseScale}]},
        ]}
      />
      <AppText color={colors.textTitle} weight="bold" style={styles.status}>
        {statusMessage}
      </AppText>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {width: progressWidth}]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  ring: {
    width: 96,
    height: 96,
    borderWidth: 8,
    borderColor: colors.primary,
    borderRadius: 48,
    backgroundColor: colors.successTint,
  },
  status: {
    fontSize: 20,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
