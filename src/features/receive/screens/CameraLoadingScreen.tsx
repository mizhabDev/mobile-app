import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Animated} from 'react-native';

import {colors} from '@/core/theme/colors';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {LoadingIndicator} from '../components/LoadingIndicator';

type CameraLoadingScreenProps = {
  pulseAnim: Animated.Value;
  progressAnim: Animated.Value;
  statusMessage: string;
};

/**
 * Full-screen loading state shown between detection steps.
 * Receives animation values from the parent/hook — zero logic of its own.
 */
export function CameraLoadingScreen({
  pulseAnim,
  progressAnim,
  statusMessage,
}: CameraLoadingScreenProps) {
  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.center}>
        <LoadingIndicator
          pulseAnim={pulseAnim}
          progressAnim={progressAnim}
          statusMessage={statusMessage}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
});
