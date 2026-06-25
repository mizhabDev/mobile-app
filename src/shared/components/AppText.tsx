import React, {PropsWithChildren} from 'react';
import {StyleProp, StyleSheet, Text, TextProps, TextStyle} from 'react-native';

import {colors} from '@/core/theme/colors';
import {typography} from '@/core/theme/typography';

type AppTextVariant = 'heading' | 'title' | 'body' | 'caption';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: AppTextVariant;
    color?: string;
    weight?: keyof typeof typography.weights;
    style?: StyleProp<TextStyle>;
  }
>;

export function AppText({
  children,
  variant = 'body',
  color = colors.textBody,
  weight = 'regular',
  style,
  ...textProps
}: AppTextProps) {
  return (
    <Text
      {...textProps}
      style={[
        styles.base,
        styles[variant],
        {color, fontWeight: typography.weights[weight]},
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
  heading: {
    fontSize: typography.sizes.heading,
    lineHeight: typography.lineHeights.heading,
  },
  title: {
    fontSize: typography.sizes.title,
    lineHeight: typography.lineHeights.title,
  },
  body: {
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
  },
  caption: {
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
  },
});
