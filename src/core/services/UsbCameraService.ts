import {NativeModules, Platform} from 'react-native';

export type UsbCameraDevice = {
  deviceId: number;
  deviceName: string;
  manufacturerName?: string | null;
  productName?: string | null;
  vendorId: number;
  productId: number;
};

export type UsbCameraPhoto = {
  id: string;
  name: string;
  size?: number;
  captureDate?: string | null;
  thumbnailBase64?: string | null;
  storageId?: number;
  objectHandle?: number;
  uri?: string | null;
};

type UsbCameraNativeModule = {
  isUsbHostSupported(): Promise<boolean>;
  detectCamera(): Promise<UsbCameraDevice | null>;
  requestPermission(deviceName: string): Promise<boolean>;
  supportsPtp(deviceName: string): Promise<boolean>;
  openPtpSession(deviceName: string): Promise<boolean>;
  closePtpSession?(deviceName: string): Promise<boolean>;
  readStorage(deviceName: string): Promise<boolean>;
  readStorageIds?(deviceName: string): Promise<number[]>;
  enumerateObjects?(deviceName: string, storageIds?: number[]): Promise<UsbCameraPhoto[]>;
  readMetadata?(deviceName: string, objectHandle: number): Promise<UsbCameraPhoto | null>;
  readThumbnail?(deviceName: string, objectHandle: number): Promise<string | null>;
  readImage?(deviceName: string, objectHandle: number): Promise<string | null>;
  loadPhotoList(deviceName: string): Promise<UsbCameraPhoto[]>;
};

const nativeModule = NativeModules.UsbCamera as UsbCameraNativeModule | undefined;

export class UsbCameraService {
  static async checkUsbOtgConnected() {
    if (Platform.OS !== 'android' || !nativeModule) {
      return false;
    }

    return nativeModule.isUsbHostSupported();
  }

  static async detectUsbCamera() {
    if (!nativeModule) {
      return null;
    }

    return nativeModule.detectCamera();
  }

  static async requestUsbPermission(deviceName: string) {
    if (!nativeModule) {
      return false;
    }

    return nativeModule.requestPermission(deviceName);
  }

  static async supportsPtp(deviceName: string) {
    if (!nativeModule) {
      return false;
    }

    return nativeModule.supportsPtp(deviceName);
  }

  static async openPtpSession(deviceName: string) {
    if (!nativeModule) {
      return false;
    }

    return nativeModule.openPtpSession(deviceName);
  }

  static async readStorage(deviceName: string) {
    if (!nativeModule) {
      return false;
    }

    return nativeModule.readStorage(deviceName);
  }

  static async readStorageIds(deviceName: string) {
    if (!nativeModule?.readStorageIds) {
      return [];
    }

    return nativeModule.readStorageIds(deviceName);
  }

  static async enumerateObjects(deviceName: string, storageIds?: number[]) {
    if (nativeModule?.enumerateObjects) {
      return nativeModule.enumerateObjects(deviceName, storageIds);
    }

    return this.loadPhotoList(deviceName);
  }

  static async readMetadata(deviceName: string, objectHandle: number) {
    if (!nativeModule?.readMetadata) {
      return null;
    }

    return nativeModule.readMetadata(deviceName, objectHandle);
  }

  static async readThumbnail(deviceName: string, objectHandle: number) {
    if (!nativeModule?.readThumbnail) {
      return null;
    }

    return nativeModule.readThumbnail(deviceName, objectHandle);
  }

  static async readImage(deviceName: string, objectHandle: number) {
    if (!nativeModule?.readImage) {
      return null;
    }

    return nativeModule.readImage(deviceName, objectHandle);
  }

  static async closePtpSession(deviceName: string) {
    if (!nativeModule?.closePtpSession) {
      return true;
    }

    return nativeModule.closePtpSession(deviceName);
  }

  static async loadPhotoList(deviceName: string) {
    if (!nativeModule) {
      return [];
    }

    return nativeModule.loadPhotoList(deviceName);
  }
}
