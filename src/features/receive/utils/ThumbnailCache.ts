/**
 * Factory and helpers for the thumbnail cache used in CameraGalleryScreen.
 * The cache maps a string key → base64 string or null (null = fetch failed).
 */

/** Creates a new, empty thumbnail cache. */
export function createThumbnailCache(): Map<string, string | null> {
  return new Map<string, string | null>();
}

/** Builds a stable per-photo cache key scoped to a specific camera. */
export function makeCacheKey(deviceName: string, photoId: string): string {
  return `${deviceName}:${photoId}`;
}
