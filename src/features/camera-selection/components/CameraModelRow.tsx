import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

type CameraModelRowProps = {
  name: string;
  type?: string;
  selected: boolean;
  onPress: () => void;
};

export function CameraModelRow({name, type, selected, onPress}: CameraModelRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        selected && styles.selectedRow,
        pressed && styles.pressed,
      ]}>
      <View style={styles.copy}>
        <AppText color={colors.textTitle} weight="semibold">
          {name}
        </AppText>
        {type ? <AppText variant="caption">{type}</AppText> : null}
      </View>
      <View style={[styles.radio, selected && styles.selectedRadio]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  selectedRow: {
    borderColor: colors.borderSelected,
    backgroundColor: colors.successTint,
  },
  pressed: {
    opacity: 0.86,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  selectedRadio: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
