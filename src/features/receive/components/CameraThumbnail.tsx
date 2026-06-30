import React, {memo} from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {UsbCameraDevice, UsbCameraPhoto} from '@/core/services/UsbCameraService';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

import {usePtp} from '../hooks/usePtp';
import {formatCaptureDate} from '../utils/CameraHelpers';

type CameraThumbnailProps = {
  camera: UsbCameraDevice;
  photo: UsbCameraPhoto;
  thumbnailCache: Map<string, string | null>;
  cellWidth: number;
  cellHeight: number;
};

/**
 * Single photo cell rendered inside CameraGrid.
 * Delegates thumbnail fetching to usePtp and date formatting to CameraHelpers.
 * This component owns zero business logic.
 */
export const CameraThumbnail = memo(function CameraThumbnail({
  camera,
  photo,
  thumbnailCache,
  cellWidth,
  cellHeight,
}: CameraThumbnailProps) {
  const {thumbnailBase64} = usePtp({camera, photo, thumbnailCache});

  return (
    <View style={[styles.cell, {width: cellWidth, height: cellHeight}]}>
      <View style={styles.thumbnailFrame}>
        {thumbnailBase64 ? (
          <Image
            source={{uri: `data:image/jpeg;base64,${thumbnailBase64}`}}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <AppText variant="caption" style={styles.placeholderText}>
              Loading
            </AppText>
          </View>
        )}
      </View>

      <AppText color={colors.textTitle} weight="semibold" style={styles.filename}>
        {photo.name}
      </AppText>
      <AppText variant="caption" style={styles.captureDate}>
        {formatCaptureDate(photo.captureDate)}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  thumbnailFrame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textBody,
  },
  filename: {
    minHeight: 34,
    fontSize: 12,
  },
  captureDate: {
    color: colors.textBody,
  },
});
