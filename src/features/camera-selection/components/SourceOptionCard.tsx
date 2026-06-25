import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

type SourceOptionCardProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

export function SourceOptionCard({
  title,
  description,
  selected,
  onPress,
}: SourceOptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        selected && styles.selectedCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.copy}>
        <AppText color={colors.textTitle} variant="body" weight="semibold">
          {title}
        </AppText>
        <AppText style={styles.description}>{description}</AppText>
      </View>
      <View style={[styles.check, selected && styles.selectedCheck]}>
        {selected ? (
          <AppText color={colors.textInverse} variant="caption" weight="bold">
            ✓
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  selectedCard: {
    borderColor: colors.borderSelected,
    backgroundColor: colors.cardSelected,
  },
  pressed: {
    opacity: 0.86,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    maxWidth: 260,
  },
  check: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  selectedCheck: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});
