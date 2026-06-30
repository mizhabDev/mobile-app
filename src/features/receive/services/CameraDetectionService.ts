import {
  UsbCameraDevice,
  UsbCameraService,
} from '@/core/services/UsbCameraService';

export type CameraDetectionStep =
  | 'usb'
  | 'camera'
  | 'permission';

export type CameraDetectionProgress = {
  step: CameraDetectionStep;
  state: 'active' | 'done' | 'failed';
  message?: string;
};

export type CameraDetectionResult = {
  camera: UsbCameraDevice;
};

type DetectionProgressCallback = (progress: CameraDetectionProgress) => void;

export class CameraDetectionService {
  static async detectCamera(
    onProgress?: DetectionProgressCallback,
  ): Promise<CameraDetectionResult> {
    onProgress?.({step: 'usb', state: 'active'});
    const hasUsbHost = await this.checkUsbHost();
    if (!hasUsbHost) {
      const message = 'No camera detected.';
      onProgress?.({step: 'usb', state: 'failed', message});
      throw new CameraDetectionError('usb', message);
    }
    onProgress?.({step: 'usb', state: 'done'});

    onProgress?.({step: 'camera', state: 'active'});
    const camera = await this.checkCameraAttached();
    if (!camera) {
      const message = 'No camera detected.';
      onProgress?.({step: 'camera', state: 'failed', message});
      throw new CameraDetectionError('camera', message);
    }
    onProgress?.({step: 'camera', state: 'done'});

    onProgress?.({step: 'permission', state: 'active'});
    const hasPermission = await this.requestPermission(camera);
    if (!hasPermission) {
      const message = 'USB permission denied.';
      onProgress?.({step: 'permission', state: 'failed', message});
      throw new CameraDetectionError('permission', message);
    }
    onProgress?.({step: 'permission', state: 'done'});

    return {camera};
  }

  static async checkUsbHost(): Promise<boolean> {
    return UsbCameraService.checkUsbOtgConnected();
  }

  static async detectUsbDevices(): Promise<UsbCameraDevice[]> {
    const camera = await UsbCameraService.detectUsbCamera();
    return camera ? [camera] : [];
  }

  static async checkCameraAttached(): Promise<UsbCameraDevice | null> {
    const devices = await this.detectUsbDevices();
    return devices[0] ?? null;
  }

  static async requestPermission(camera: UsbCameraDevice): Promise<boolean> {
    return UsbCameraService.requestUsbPermission(camera.deviceName);
  }
}

export class CameraDetectionError extends Error {
  constructor(
    readonly step: CameraDetectionStep,
    message: string,
  ) {
    super(message);
    this.name = 'CameraDetectionError';
  }
}
