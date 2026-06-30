import React, {useCallback, useEffect} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {PrimaryButton} from '@/shared/components/PrimaryButton';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {CameraCard} from '../components/CameraCard';
import {LoadingIndicator} from '../components/LoadingIndicator';
import {useCamera} from '../hooks/useCamera';
import {DETECTION_STEPS, StepState} from '../utils/CameraHelpers';

type ReceiveScreenProps = NativeStackScreenProps<RootStackParamList, 'CameraDetection'>;

export function ReceiveScreen({navigation}: ReceiveScreenProps) {
  const {stepStates, statusMessage, isDetecting, progressAnim, pulseAnim, runDetection} =
    useCamera(
      useCallback(
        ({camera, photos}) => {
          navigation.replace('CameraGallery', {camera, photos});
        },
        [navigation],
      ),
    );

  // Start detection on mount
  useEffect(() => {
    runDetection();
  }, [runDetection]);

  // Pulse animation loop
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <ScreenContainer>
      <CameraCard
        showBack
        onBackPress={() => navigation.goBack()}
        title="Detecting Camera"
        subtitle="USB camera setup starts automatically."
      />

      <LoadingIndicator
        pulseAnim={pulseAnim}
        progressAnim={progressAnim}
        statusMessage={statusMessage}
      />

      <View style={styles.card}>
        {DETECTION_STEPS.map(step => (
          <StepRow
            key={step.id}
            label={step.label}
            state={stepStates[step.id]}
          />
        ))}
      </View>

      <AppText style={styles.status}>{statusMessage}</AppText>

      {!isDetecting ? (
        <PrimaryButton title="Try Again" onPress={runDetection} />
      ) : null}
    </ScreenContainer>
  );
}

// ── Private sub-component ─────────────────────────────────────────────────────

type StepRowProps = {
  label: string;
  state: StepState;
};

function StepRow({label, state}: StepRowProps) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, styles[`${state}Dot`]]} />
      <AppText color={state === 'failed' ? '#DC2626' : colors.textTitle}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  pendingDot: {
    backgroundColor: colors.border,
  },
  activeDot: {
    backgroundColor: '#F59E0B',
  },
  doneDot: {
    backgroundColor: '#16A34A',
  },
  failedDot: {
    backgroundColor: '#DC2626',
  },
  status: {
    marginVertical: spacing.lg,
    color: colors.textBody,
  },
});
