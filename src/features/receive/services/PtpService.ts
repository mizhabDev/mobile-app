import {
  UsbCameraDevice,
  UsbCameraPhoto,
  UsbCameraService,
} from '@/core/services/UsbCameraService';

export type PtpStorageId = number;
export type PtpObjectHandle = number;

export type PtpObjectMetadata = {
  id: string;
  name: string;
  size?: number;
  captureDate?: string | null;
  thumbnailBase64?: string | null;
  storageId?: PtpStorageId;
  objectHandle?: PtpObjectHandle;
  uri?: string | null;
};

export type PtpImageData = {
  objectHandle: PtpObjectHandle;
  base64: string | null;
  mimeType?: string;
};

export class PtpService {
  static async openCamera(camera: UsbCameraDevice): Promise<boolean> {
    return UsbCameraService.supportsPtp(camera.deviceName);
  }

  static async startSession(camera: UsbCameraDevice): Promise<boolean> {
    return UsbCameraService.openPtpSession(camera.deviceName);
  }

  static async readStorageIds(camera: UsbCameraDevice): Promise<PtpStorageId[]> {
    return UsbCameraService.readStorageIds(camera.deviceName);
  }

  static async enumerateObjects(
    camera: UsbCameraDevice,
    storageIds?: PtpStorageId[],
  ): Promise<PtpObjectMetadata[]> {
    const objects = await UsbCameraService.enumerateObjects(
      camera.deviceName,
      storageIds,
    );

    return objects.map(normalizeObjectMetadata);
  }

  static async readThumbnails(
    camera: UsbCameraDevice,
    objectHandles: PtpObjectHandle[],
  ): Promise<PtpImageData[]> {
    return Promise.all(
      objectHandles.map(async objectHandle => ({
        objectHandle,
        base64: await UsbCameraService.readThumbnail(
          camera.deviceName,
          objectHandle,
        ),
        mimeType: 'image/jpeg',
      })),
    );
  }

  static async readMetadata(
    camera: UsbCameraDevice,
    objectHandle: PtpObjectHandle,
  ): Promise<PtpObjectMetadata | null> {
    const metadata = await UsbCameraService.readMetadata(
      camera.deviceName,
      objectHandle,
    );

    return metadata ? normalizeObjectMetadata(metadata) : null;
  }

  static async readImage(
    camera: UsbCameraDevice,
    objectHandle: PtpObjectHandle,
  ): Promise<PtpImageData> {
    return {
      objectHandle,
      base64: await UsbCameraService.readImage(camera.deviceName, objectHandle),
      mimeType: 'image/jpeg',
    };
  }

  static async closeSession(camera: UsbCameraDevice): Promise<boolean> {
    return UsbCameraService.closePtpSession(camera.deviceName);
  }

  static toGalleryPhotos(objects: PtpObjectMetadata[]): UsbCameraPhoto[] {
    return objects.map(object => ({
      id: object.id,
      name: object.name,
      size: object.size,
      captureDate: object.captureDate,
      thumbnailBase64: object.thumbnailBase64,
      storageId: object.storageId,
      objectHandle: object.objectHandle,
      uri: object.uri,
    }));
  }
}

function normalizeObjectMetadata(object: UsbCameraPhoto): PtpObjectMetadata {
  const objectHandle =
    typeof object.objectHandle === 'number'
      ? object.objectHandle
      : Number.parseInt(object.id, 10);

  return {
    id: object.id,
    name: object.name,
    size: object.size,
    captureDate: object.captureDate,
    thumbnailBase64: object.thumbnailBase64,
    storageId: object.storageId,
    objectHandle: Number.isNaN(objectHandle) ? undefined : objectHandle,
    uri: object.uri,
  };
}
