import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {typography} from '@/core/theme/typography';
import {PrimaryButton} from '@/shared/components/PrimaryButton';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {CameraModelRow} from '../components/CameraModelRow';
import {SelectionHeader} from '../components/SelectionHeader';
import {canonModels} from '../data/canonModels';
import {sonyModels} from '../data/sonyModels';
import {CameraModel} from '../types/cameraSelection.types';
import {filterCameraModels} from '../utils/filterCameraModels';

type CameraModelSelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CameraModelSelection'
>;

export function CameraModelSelectionScreen({
  navigation,
  route,
}: CameraModelSelectionScreenProps) {
  const {brand, source} = route.params;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<CameraModel>();

  const cameraModels = brand === 'Sony' ? sonyModels : canonModels;

  const filteredModels = useMemo(
    () => filterCameraModels(cameraModels, searchTerm),
    [cameraModels, searchTerm],
  );

  const otherModel = useMemo<CameraModel>(
    () => ({
      id: `${brand.toLowerCase()}-other-model`,
      name: 'Other Model',
      type: 'My camera model is not listed',
    }),
    [brand],
  );

  const handleContinue = () => {
    if (!selectedModel) {
      return;
    }

    navigation.navigate('LiveTransferPlaceholder', {
      source,
      brand,
      model: selectedModel,
    });
  };

  return (
    <ScreenContainer>
      <SelectionHeader
        showBack
        onBackPress={() => navigation.goBack()}
        title="Select Camera Model"
        subtitle={`Choose your ${brand} camera`}
      />

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={setSearchTerm}
        placeholder="Search camera model"
        placeholderTextColor={colors.textBody}
        style={styles.searchInput}
        value={searchTerm}
      />

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {filteredModels.map(model => (
          <CameraModelRow
            key={model.id}
            name={model.name}
            type={model.type}
            selected={selectedModel?.id === model.id}
            onPress={() => setSelectedModel(model)}
          />
        ))}

        <CameraModelRow
          name={otherModel.name}
          type={otherModel.type}
          selected={selectedModel?.id === otherModel.id}
          onPress={() => setSelectedModel(otherModel)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          disabled={!selectedModel}
          onPress={handleContinue}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    minHeight: 52,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
    color: colors.textTitle,
    fontSize: typography.sizes.body,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
