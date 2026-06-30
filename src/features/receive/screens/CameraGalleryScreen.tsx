import React, {useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {ScreenContainer} from '@/shared/components/ScreenContainer';

import {CameraCard} from '../components/CameraCard';
import {CameraGrid} from '../components/CameraGrid';
import {createThumbnailCache} from '../utils/ThumbnailCache';

type CameraGalleryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CameraGallery'
>;

export function CameraGalleryScreen({
  navigation,
  route,
}: CameraGalleryScreenProps) {
  const {camera, photos} = route.params;
  const thumbnailCache = useRef(createThumbnailCache()).current;

  const cameraName =
    camera.productName ?? camera.manufacturerName ?? camera.deviceName;

  const storageIds = useMemo(
    () =>
      Array.from(
        new Set(
          photos
            .map(photo => photo.storageId)
            .filter((id): id is number => typeof id === 'number'),
        ),
      ),
    [photos],
  );

  return (
    <ScreenContainer>
      <CameraCard
        showBack
        onBackPress={() => navigation.goBack()}
        title="Camera Gallery"
        subtitle={cameraName}
      />

      <View style={styles.summary}>
        <SummaryStat label="Camera Name" value={cameraName} />
        <SummaryStat
          label="Storage"
          value={
            storageIds.length > 0
              ? storageIds.map(id => `#${id}`).join(', ')
              : 'Not reported'
          }
        />
        <SummaryStat label="Photo Count" value={photos.length.toLocaleString()} />
      </View>

      <CameraGrid
        camera={camera}
        photos={photos}
        thumbnailCache={thumbnailCache}
      />
    </ScreenContainer>
  );
}

// ── Private sub-component ─────────────────────────────────────────────────────

type SummaryStatProps = {
  label: string;
  value: string;
};

function SummaryStat({label, value}: SummaryStatProps) {
  return (
    <View style={styles.summaryStat}>
      <AppText variant="caption">{label}</AppText>
      <AppText color={colors.textTitle} weight="semibold" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  summaryStat: {
    gap: 2,
  },
  summaryValue: {
    flexShrink: 1,
  },
});
