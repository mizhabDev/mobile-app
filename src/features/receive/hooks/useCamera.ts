import {useCallback, useRef, useState} from 'react';
import {Animated, Easing} from 'react-native';

import {UsbCameraDevice, UsbCameraPhoto} from '@/core/services/UsbCameraService';

import {CameraDetectionService, CameraDetectionProgress} from '../services/CameraDetectionService';
import {PtpService} from '../services/PtpService';
import {
  DetectionStep,
  StepState,
  DETECTION_STEPS,
  createInitialStepStates,
  getReadableError,
  isCameraConnected,
  yieldToUi,
} from '../utils/CameraHelpers';

export type CameraDetectionResult = {
  camera: UsbCameraDevice;
  photos: UsbCameraPhoto[];
};

export type UseCameraReturn = {
  stepStates: Record<DetectionStep, StepState>;
  statusMessage: string;
  isDetecting: boolean;
  progressAnim: Animated.Value;
  pulseAnim: Animated.Value;
  runDetection: () => Promise<void>;
};

/**
 * Encapsulates the full USB camera detection state machine.
 * Returns all state needed to render a detection progress UI.
 * On success, calls onSuccess with the detected camera and photo list.
 */
export function useCamera(
  onSuccess: (result: CameraDetectionResult) => void,
): UseCameraReturn {
  const [stepStates, setStepStates] = useState<Record<DetectionStep, StepState>>(
    () => createInitialStepStates(),
  );
  const [statusMessage, setStatusMessage] = useState('Searching Camera...');
  const [isDetecting, setIsDetecting] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const setStepState = useCallback((step: DetectionStep, state: StepState) => {
    setStepStates(current => ({...current, [step]: state}));
  }, []);

  const setActiveStep = useCallback(
    (step: DetectionStep) => {
      const stepIndex = DETECTION_STEPS.findIndex(item => item.id === step);
      setStatusMessage(DETECTION_STEPS[stepIndex]?.label ?? 'Working...');
      setStepState(step, 'active');
      Animated.timing(progressAnim, {
        toValue: stepIndex / DETECTION_STEPS.length,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [progressAnim, setStepState],
  );

  const completeStep = useCallback(
    (step: DetectionStep) => {
      const stepIndex = DETECTION_STEPS.findIndex(item => item.id === step);
      setStepState(step, 'done');
      Animated.timing(progressAnim, {
        toValue: (stepIndex + 1) / DETECTION_STEPS.length,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [progressAnim, setStepState],
  );

  const handleDetectionProgress = useCallback(
    (progress: CameraDetectionProgress) => {
      if (progress.step === 'camera') {
        if (progress.state === 'active') {
          setActiveStep('camera');
        } else if (progress.state === 'done') {
          setStatusMessage('Camera Found');
          completeStep('camera');
        } else {
          setStepState('camera', 'failed');
        }
      }

      if (progress.step === 'permission') {
        if (progress.state === 'active') {
          setActiveStep('permission');
        } else if (progress.state === 'done') {
          completeStep('permission');
        } else {
          setStepState('permission', 'failed');
        }
      }

      if (progress.message) {
        setStatusMessage(progress.message);
      }
    },
    [completeStep, setActiveStep, setStepState],
  );

  const failStep = useCallback(
    (step: DetectionStep, message: string) => {
      setStepState(step, 'failed');
      setStatusMessage(message);
      setIsDetecting(false);
    },
    [setStepState],
  );

  const runDetection = useCallback(async () => {
    setStepStates(createInitialStepStates());
    setStatusMessage('Searching Camera...');
    setIsDetecting(true);
    progressAnim.setValue(0);

    try {
      setActiveStep('camera');
      await yieldToUi();
      const {camera} = await CameraDetectionService.detectCamera(handleDetectionProgress);

      await yieldToUi();
      if (!(await isCameraConnected(camera.deviceName))) {
        failStep('session', 'Camera disconnected.');
        return;
      }

      const supportsPtp = await PtpService.openCamera(camera);
      if (!supportsPtp) {
        failStep('session', 'Connected device does not support PTP.');
        return;
      }

      setActiveStep('session');
      await yieldToUi();
      if (!(await isCameraConnected(camera.deviceName))) {
        failStep('session', 'Camera disconnected.');
        return;
      }

      const sessionOpened = await PtpService.startSession(camera);
      if (!sessionOpened) {
        failStep('session', 'Camera disconnected.');
        return;
      }
      completeStep('session');

      setActiveStep('photos');
      await yieldToUi();
      if (!(await isCameraConnected(camera.deviceName))) {
        failStep('photos', 'Camera disconnected.');
        return;
      }

      const storageIds = await PtpService.readStorageIds(camera);
      if (storageIds.length === 0) {
        failStep('photos', 'No photos found.');
        return;
      }

      await yieldToUi();
      if (!(await isCameraConnected(camera.deviceName))) {
        failStep('photos', 'Camera disconnected.');
        return;
      }

      const objects = await PtpService.enumerateObjects(camera, storageIds);
      const photos = PtpService.toGalleryPhotos(objects);
      if (photos.length === 0) {
        failStep('photos', 'No photos found.');
        return;
      }
      completeStep('photos');

      setActiveStep('prepare');
      await yieldToUi();
      await PtpService.closeSession(camera);
      completeStep('prepare');

      setActiveStep('gallery');
      await yieldToUi();
      completeStep('gallery');

      onSuccess({camera, photos});
    } catch (error) {
      setStatusMessage(getReadableError(error));
      setIsDetecting(false);
    }
  }, [
    completeStep,
    failStep,
    handleDetectionProgress,
    onSuccess,
    progressAnim,
    setActiveStep,
    setStepState,
  ]);

  return {
    stepStates,
    statusMessage,
    isDetecting,
    progressAnim,
    pulseAnim,
    runDetection,
  };
}
