import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {spacing} from '@/core/theme/spacing';
import {PrimaryButton} from '@/shared/components/PrimaryButton';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {SelectionHeader} from '../components/SelectionHeader';
import {SourceOptionCard} from '../components/SourceOptionCard';
import {cameraSources} from '../data/cameraSources';
import {
  CameraBrand,
  CameraSourceType,
} from '../types/cameraSelection.types';

type SourceSelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SourceSelection'
>;

const hardwareSourceToBrand: Partial<Record<CameraSourceType, CameraBrand>> = {
  sony: 'Sony',
  canon: 'Canon',
};

export function SourceSelectionScreen({navigation}: SourceSelectionScreenProps) {
  const [selectedSource, setSelectedSource] = useState<CameraSourceType>();

  const handleContinue = () => {
    if (!selectedSource) {
      return;
    }

    const selectedBrand = hardwareSourceToBrand[selectedSource];

    if (selectedBrand && (selectedSource === 'sony' || selectedSource === 'canon')) {
      navigation.navigate('CameraModelSelection', {
        source: selectedSource,
        brand: selectedBrand,
      });
      return;
    }

    if (selectedSource === 'otherPhone') {
      navigation.navigate('OtherPhoneQR', {
        source: selectedSource,
      });
      return;
    }

    navigation.navigate('LiveTransferPlaceholder', {
      source: selectedSource,
    });
  };

  return (
    <ScreenContainer>
      <SelectionHeader
        title="Select Photo Source"
        subtitle="Choose where photos will come from"
      />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {cameraSources.map(source => (
          <SourceOptionCard
            key={source.id}
            title={source.title}
            description={source.description}
            selected={selectedSource === source.id}
            onPress={() => setSelectedSource(source.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          disabled={!selectedSource}
          onPress={handleContinue}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
