import React from 'react';
import {Dimensions, FlatList, StyleSheet, View} from 'react-native';

import {UsbCameraDevice, UsbCameraPhoto} from '@/core/services/UsbCameraService';
import {colors} from '@/core/theme/colors';
import {radius} from '@/core/theme/radius';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';

import {CameraThumbnail} from './CameraThumbnail';

const GRID_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = spacing.sm;
const CELL_WIDTH = Math.floor(
  (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);
const CELL_HEIGHT = CELL_WIDTH + 72;
const GRID_ROW_HEIGHT = CELL_HEIGHT + spacing.md;

type CameraGridProps = {
  camera: UsbCameraDevice;
  photos: UsbCameraPhoto[];
  thumbnailCache: Map<string, string | null>;
};

/**
 * FlatList grid of photo thumbnails for a connected camera.
 * Delegates individual cell rendering to CameraThumbnail.
 */
export function CameraGrid({camera, photos, thumbnailCache}: CameraGridProps) {
  return (
    <FlatList
      data={photos}
      numColumns={GRID_COLUMNS}
      keyExtractor={photo => photo.id}
      renderItem={({item}) => (
        <CameraThumbnail
          camera={camera}
          photo={item}
          thumbnailCache={thumbnailCache}
          cellWidth={CELL_WIDTH}
          cellHeight={CELL_HEIGHT}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <AppText color={colors.textTitle} weight="semibold">
            No photos found
          </AppText>
          <AppText style={styles.emptyText}>
            The camera connection is open, but no photos were returned.
          </AppText>
        </View>
      }
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.gridRow}
      initialNumToRender={24}
      maxToRenderPerBatch={30}
      updateCellsBatchingPeriod={40}
      windowSize={9}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: GRID_ROW_HEIGHT,
        offset: Math.floor(index / GRID_COLUMNS) * GRID_ROW_HEIGHT,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: spacing.md,
  },
  emptyCard: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  emptyText: {
    color: colors.textBody,
  },
});
