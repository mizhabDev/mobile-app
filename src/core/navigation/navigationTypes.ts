import {
  CameraBrand,
  CameraModel,
  CameraSourceType,
} from '@/features/camera-selection/types/cameraSelection.types';

export type CameraHardwareSource = Extract<CameraSourceType, 'sony' | 'canon'>;

export type RootStackParamList = {
  SourceSelection: undefined;
  CameraModelSelection: {
    source: CameraHardwareSource;
    brand: CameraBrand;
  };
  OtherPhoneQR: {
    source: CameraSourceType;
  };
  LiveTransferPlaceholder: {
    source: CameraSourceType;
    brand?: CameraBrand;
    model?: CameraModel;
  };
  FlashLinkRoleSelection: undefined;
  QRScanner: undefined;
};
