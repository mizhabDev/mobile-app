import {CameraSourceOption} from '../types/cameraSelection.types';

export const cameraSources: CameraSourceOption[] = [
  {
    id: 'sony',
    title: 'Sony Camera',
    description: 'Connect a Sony camera and receive photos instantly',
  },
  {
    id: 'canon',
    title: 'Canon Camera',
    description: 'Connect a Canon camera and import captured photos live',
  },
  {
    id: 'otherPhone',
    title: 'Other Phone',
    description: 'Receive photos from another mobile device',
  },
  {
    id: 'thisPhone',
    title: 'This Phone',
    description: 'Use this phone camera or gallery',
  },
];

export function getCameraSourceTitle(sourceId: CameraSourceOption['id']) {
  return cameraSources.find(source => source.id === sourceId)?.title ?? sourceId;
}
