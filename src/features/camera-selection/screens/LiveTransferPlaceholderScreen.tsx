import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {SelectionHeader} from '../components/SelectionHeader';
import {getCameraSourceTitle} from '../data/cameraSources';

type LiveTransferPlaceholderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'LiveTransferPlaceholder'
>;

export function LiveTransferPlaceholderScreen({
  navigation,
  route,
}: LiveTransferPlaceholderScreenProps) {
  const {source, brand, model} = route.params;

  return (
    <ScreenContainer contentStyle={styles.container}>
      <SelectionHeader
        showBack
        onBackPress={() => navigation.goBack()}
        title="Ready for Live Transfer"
        subtitle="This is the next step where live photo import will begin."
      />

      <View style={styles.summaryCard}>
        <SummaryRow label="Source" value={getCameraSourceTitle(source)} />
        {brand ? <SummaryRow label="Brand" value={brand} /> : null}
        {model ? <SummaryRow label="Model" value={model.name} /> : null}
      </View>
    </ScreenContainer>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({label, value}: SummaryRowProps) {
  return (
    <View style={styles.summaryRow}>
      <AppText>{label}</AppText>
      <AppText color={colors.textTitle} weight="semibold" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  summaryCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  summaryRow: {
    gap: spacing.xs,
  },
  summaryValue: {
    flexShrink: 1,
  },
});
