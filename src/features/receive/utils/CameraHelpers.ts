import {CameraDetectionService} from '../services/CameraDetectionService';

// ── Step types ───────────────────────────────────────────────────────────────

export type DetectionStep =
  | 'camera'
  | 'permission'
  | 'session'
  | 'photos'
  | 'prepare'
  | 'gallery';

export type StepState = 'pending' | 'active' | 'done' | 'failed';

export const DETECTION_STEPS: {id: DetectionStep; label: string}[] = [
  {id: 'camera', label: 'Searching Camera...'},
  {id: 'permission', label: 'Requesting Permission'},
  {id: 'session', label: 'Opening Camera'},
  {id: 'photos', label: 'Reading Photos'},
  {id: 'prepare', label: 'Preparing Gallery'},
  {id: 'gallery', label: 'Opening Gallery'},
];

export function createInitialStepStates(): Record<DetectionStep, StepState> {
  return DETECTION_STEPS.reduce(
    (states, step) => ({...states, [step.id]: 'pending'}),
    {} as Record<DetectionStep, StepState>,
  );
}

// ── Error helpers ────────────────────────────────────────────────────────────

export const KNOWN_FAILURE_MESSAGES = new Set([
  'No camera detected.',
  'USB permission denied.',
  'Connected device does not support PTP.',
  'No photos found.',
  'Camera disconnected.',
]);

export function getReadableError(error: unknown): string {
  if (error instanceof Error) {
    if (KNOWN_FAILURE_MESSAGES.has(error.message)) {
      return error.message;
    }
    return 'Camera disconnected.';
  }
  return 'Camera disconnected.';
}

// ── Async / UI helpers ───────────────────────────────────────────────────────

/** Yields execution to the JS/UI thread before the next async step. */
export function yieldToUi(): Promise<void> {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

/** Returns true if the camera with the given deviceName is still attached. */
export async function isCameraConnected(deviceName: string): Promise<boolean> {
  const camera = await CameraDetectionService.checkCameraAttached();
  return camera?.deviceName === deviceName;
}

// ── Date formatting ──────────────────────────────────────────────────────────

/** Formats a PTP capture-date string into a human-readable date. */
export function formatCaptureDate(captureDate?: string | null): string {
  if (!captureDate) {
    return 'Date unavailable';
  }

  const ptpDateMatch = captureDate.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
  );
  if (ptpDateMatch) {
    const [, year, month, day, hour, minute, second] = ptpDateMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).toLocaleDateString();
  }

  return captureDate;
}
