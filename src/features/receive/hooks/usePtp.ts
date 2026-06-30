import {useEffect, useState} from 'react';

import {UsbCameraDevice, UsbCameraPhoto} from '@/core/services/UsbCameraService';

import {PtpService} from '../services/PtpService';
import {makeCacheKey} from '../utils/ThumbnailCache';

type UsePtpOptions = {
  camera: UsbCameraDevice;
  photo: UsbCameraPhoto;
  thumbnailCache: Map<string, string | null>;
};

type UsePtpReturn = {
  thumbnailBase64: string | null;
};

/**
 * Lazily fetches a PTP thumbnail for a single photo.
 * Results are stored in the shared thumbnailCache (ref) to avoid
 * redundant network/USB calls when cells are recycled by FlatList.
 */
export function usePtp({camera, photo, thumbnailCache}: UsePtpOptions): UsePtpReturn {
  const objectHandle =
    typeof photo.objectHandle === 'number'
      ? photo.objectHandle
      : Number.parseInt(photo.id, 10);

  const cacheKey = makeCacheKey(camera.deviceName, photo.id);

  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(
    () => photo.thumbnailBase64 ?? thumbnailCache.get(cacheKey) ?? null,
  );

  useEffect(() => {
    let mounted = true;

    if (thumbnailBase64 || Number.isNaN(objectHandle)) {
      return () => {
        mounted = false;
      };
    }

    PtpService.readThumbnails(camera, [objectHandle])
      .then(([thumbnail]) => {
        if (!mounted) {
          return;
        }
        const nextThumbnail = thumbnail?.base64 ?? null;
        thumbnailCache.set(cacheKey, nextThumbnail);
        setThumbnailBase64(nextThumbnail);
      })
      .catch(() => {
        if (mounted) {
          thumbnailCache.set(cacheKey, null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [cacheKey, camera, objectHandle, thumbnailBase64, thumbnailCache]);

  return {thumbnailBase64};
}
