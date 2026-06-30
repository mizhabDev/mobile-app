import * as MediaLibrary from 'expo-media-library/legacy';
import type { GalleryPhoto } from '../types/gallery.types';

// Uses the classic getAssetsAsync / getAssetInfoAsync API which is
// supported in Expo Go (no ExpoMediaLibraryNext native module needed).

const POLL_INTERVAL_MS = 3000;

export class MediaStoreWatcher {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastCheckedAtMs: number = Date.now();
  private onNewPhotoCallback: ((photo: GalleryPhoto) => void) | null = null;

  start(onNewPhoto: (photo: GalleryPhoto) => void) {
    this.onNewPhotoCallback = onNewPhoto;
    this.lastCheckedAtMs = Date.now();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.onNewPhotoCallback = null;
  }

  private async poll() {
    try {
      const sinceMs = this.lastCheckedAtMs;
      this.lastCheckedAtMs = Date.now();

      // getAssetsAsync only accepts whole seconds for createdAfter
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
        createdAfter: sinceMs,
        first: 50,
      });

      for (const asset of result.assets) {
        const photo = assetToGalleryPhoto(asset);
        if (photo) this.onNewPhotoCallback?.(photo);
      }
    } catch (err) {
      console.warn('[MediaStoreWatcher] poll error', err);
    }
  }

  /**
   * Fetch a paginated list of photos from the MediaStore.
   */
  static async getPage(
    page: number,
    pageSize: number,
  ): Promise<{ photos: GalleryPhoto[]; total: number }> {
    // getAssetsAsync doesn't support offset directly — use cursor-based pagination.
    // For the first page, no cursor is needed. For subsequent pages we walk
    // through pages until we reach the requested one.
    let cursor: string | undefined = undefined;
    let total = 0;

    for (let i = 0; i <= page; i++) {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        first: pageSize,
        after: cursor,
      });

      total = result.totalCount;

      if (i === page) {
        const photos: GalleryPhoto[] = result.assets
          .map(assetToGalleryPhoto)
          .filter((p): p is GalleryPhoto => p !== null);
        return { photos, total };
      }

      if (!result.hasNextPage) break;
      cursor = result.endCursor;
    }

    return { photos: [], total };
  }

  /**
   * Fetch an asset by ID and return its local URI.
   */
  static async getAssetUri(id: string): Promise<string | null> {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(id);
      return info?.localUri ?? info?.uri ?? null;
    } catch {
      return null;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function assetToGalleryPhoto(asset: MediaLibrary.Asset): GalleryPhoto | null {
  try {
    return {
      id: asset.id,
      name: asset.filename,
      timestamp: asset.creationTime,
      width: asset.width,
      height: asset.height,
      size: 0,
      uri: asset.uri,
    };
  } catch {
    return null;
  }
}
