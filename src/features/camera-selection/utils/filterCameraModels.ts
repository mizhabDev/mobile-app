import {CameraModel} from '../types/cameraSelection.types';

export function filterCameraModels(models: CameraModel[], searchTerm: string) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  if (!normalizedTerm) {
    return models;
  }

  return models.filter(model => {
    const searchableText = `${model.name} ${model.type ?? ''}`.toLowerCase();
    return searchableText.includes(normalizedTerm);
  });
}
