export type CameraSourceType = 'sony' | 'canon' | 'otherPhone' | 'thisPhone';

export type CameraBrand = 'Sony' | 'Canon';

export type CameraSourceOption = {
  id: CameraSourceType;
  title: string;
  description: string;
};

export type CameraModel = {
  id: string;
  name: string;
  type?: string;
};

export type CameraSelectionResult = {
  source: CameraSourceType;
  brand?: CameraBrand;
  model?: CameraModel;
};
