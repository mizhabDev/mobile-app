import React from 'react';
import {
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({title, onPress, disabled = false}: PrimaryButtonProps) {
  const getButtonStyle = ({
    pressed,
  }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.button,
    disabled && styles.disabled,
    pressed && !disabled && styles.pressed,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={getButtonStyle}>
      <AppText color={colors.textInverse} weight="semibold">
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    backgroundColor: colors.primaryDisabled,
  },
});
