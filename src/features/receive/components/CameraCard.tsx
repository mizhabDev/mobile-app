import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

type CameraCardProps = {
  title: string;
  subtitle: string;
  showBack?: boolean;
  onBackPress?: () => void;
};

/**
 * Page header for receive-feature screens.
 * Optionally renders a back button above the title.
 */
export function CameraCard({
  title,
  subtitle,
  showBack = false,
  onBackPress,
}: CameraCardProps) {
  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onBackPress}
          style={styles.backButton}>
          <AppText color={colors.textTitle} weight="semibold">
            Back
          </AppText>
        </Pressable>
      ) : null}

      <AppText variant="heading" weight="bold" color={colors.textTitle}>
        {title}
      </AppText>
      <AppText style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 320,
  },
});
