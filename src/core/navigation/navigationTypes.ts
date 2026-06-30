import type {
  UsbCameraDevice,
  UsbCameraPhoto,
} from '@/core/services/UsbCameraService';

export type RootStackParamList = {
  CameraDetection: undefined;
  CameraGallery: {
    camera: UsbCameraDevice;
    photos: UsbCameraPhoto[];
  };
  FlashLinkRoleSelection: undefined;
  QRScanner: undefined;
  // ── Remote Gallery ──────────────────────────────────────────────────────────
  /** Phone B: live remote gallery viewer */
  RemoteGallery: undefined;
  /** Phone B: full-screen image viewer */
  FullImageViewer: {
    photoId: string;
    /** Base64 JPEG string for the thumbnail (shown instantly while full-res loads) */
    thumbBase64: string | null;
    /** Base64 JPEG string for full resolution (null = needs to be fetched) */
    fullBase64: string | null;
  };
  /** Phone A: gallery host dashboard */
  GalleryHost: undefined;
};
