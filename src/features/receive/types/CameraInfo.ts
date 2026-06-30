/**
 * Camera device and photo types for the receive feature.
 * These are thin re-exports of the USB/PTP native layer types so that
 * nothing inside features/receive/ imports directly from core/services.
 */
export type {
  UsbCameraDevice as CameraInfo,
  UsbCameraPhoto,
} from '@/core/services/UsbCameraService';
