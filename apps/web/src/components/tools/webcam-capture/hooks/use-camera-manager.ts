import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { addBreadcrumb } from '@/lib/sentry';
import { getCameraAccessError } from '@/lib/native/camera-access-error';
import { requestVideoStream, type VideoConstraints } from '@/lib/native/media-bridge';
import {
  isMobile,
  enumerateCameras as enumerateCamerasUtil,
  type CameraDevice,
} from '../utils/camera-utils';
import type { ErrorType } from '../constants';
import { waitForVideoFrame } from '../utils/capture-utils';

interface UseCameraManagerProps {
  preferredCameraId?: string | null;
}

export function useCameraManager({ preferredCameraId }: UseCameraManagerProps) {
  const t = useTranslations('tools.webcam');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(false);
  const cancelAttemptRef = useRef<(() => void) | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isMobileDevice] = useState(() => isMobile());
  const stopCamera = useCallback(() => {
    cancelAttemptRef.current?.();
    cancelAttemptRef.current = null;
    setStream(null);
    setIsLoading(false);
    setIsSwitchingCamera(false);
  }, []);
  const showCameraError = useCallback(
    (error: unknown) => {
      const condition = getCameraAccessError(error);
      if (condition) {
        addBreadcrumb('camera', 'Camera access unavailable', { condition: condition.key });
      } else {
        logger.error('Camera error', undefined, error);
      }
      setError(t(`errors.${condition?.key ?? 'generic'}.message`));
      setErrorType(condition?.type ?? 'unavailable');
      setIsLoading(false);
    },
    [t],
  );

  const startCamera = useCallback(
    async (deviceId?: string, switching = false) => {
      if (!mountedRef.current) return;
      cancelAttemptRef.current?.();
      let active = true;
      let acquiredStream: MediaStream | null = null;
      let video: HTMLVideoElement | null = null;
      let acquisitionFailed = true;
      const controller = new AbortController();
      const releaseStream = () => {
        acquiredStream?.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') track.stop();
        });
        if (video && video.srcObject === acquiredStream) video.srcObject = null;
        acquiredStream = null;
      };
      const cancel = () => {
        active = false;
        controller.abort();
        clearTimeout(timeoutId);
        releaseStream();
      };
      setIsLoading(true);
      setIsSwitchingCamera(switching);
      setStream(null);
      setError(null);
      setErrorType(null);
      const timeoutId = setTimeout(() => {
        cancel();
        setStream(null);
        setError(t('errors.timeout.message'));
        setErrorType('timeout');
        setIsLoading(false);
        setIsSwitchingCamera(false);
      }, 10000);
      cancelAttemptRef.current = cancel;
      const attachStream = async (mediaStream: MediaStream, requestedDeviceId?: string) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        acquiredStream = mediaStream;
        acquisitionFailed = false;
        video = videoRef.current;
        if (!video) throw new Error('Camera preview unavailable');
        video.srcObject = mediaStream;
        await video.play();
        if (!active) return;
        const ready = await waitForVideoFrame(video, controller.signal);
        if (!active || !ready) return;
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          setActiveCameraLabel(videoTrack.label);
          setSelectedCameraId(videoTrack.getSettings().deviceId || requestedDeviceId || null);
        }
        clearTimeout(timeoutId);
        setStream(mediaStream);
        setIsLoading(false);
        setIsSwitchingCamera(false);
        const cameras = await enumerateCamerasUtil();
        if (active) setAvailableCameras(cameras);
      };

      try {
        const videoConstraints: VideoConstraints = deviceId
          ? { deviceId: { ideal: deviceId } }
          : { facingMode: isMobileDevice ? 'environment' : 'user' };
        logger.info('Requesting camera access', {
          deviceId,
          videoConstraints,
          isMobileDevice,
        });
        await attachStream(await requestVideoStream(videoConstraints, 'caller'), deviceId);
      } catch (err) {
        if (!active) return;
        releaseStream();
        setStream(null);
        if (deviceId && acquisitionFailed && !getCameraAccessError(err)) {
          logger.error('Camera error', undefined, err);
          logger.info('Retrying with any available camera');
          try {
            await attachStream(await requestVideoStream(undefined, 'caller'));
            return;
          } catch (fallbackErr) {
            if (!active) return;
            releaseStream();
            setStream(null);
            showCameraError(fallbackErr);
            cancel();
            setIsSwitchingCamera(false);
            return;
          }
        }
        showCameraError(err);
        cancel();
        setIsSwitchingCamera(false);
      }
    },
    [isMobileDevice, showCameraError, t],
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setShowCameraMenu(false);
      await startCamera(deviceId, true);
    },
    [startCamera],
  );

  const toggleFrontBack = useCallback(async () => {
    if (availableCameras.length < 2) return;
    const currentCamera = availableCameras.find((c) => c.deviceId === selectedCameraId);
    const targetCamera = availableCameras.find(
      (c) => c.isFrontFacing !== currentCamera?.isFrontFacing,
    );
    if (targetCamera) {
      await switchCamera(targetCamera.deviceId);
    } else {
      const currentIndex = availableCameras.findIndex((c) => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      await switchCamera(availableCameras[nextIndex].deviceId);
    }
  }, [availableCameras, selectedCameraId, switchCamera]);

  const currentCameraName = useMemo(() => {
    if (!activeCameraLabel) return 'Fotocamera';
    const lowerLabel = activeCameraLabel.toLowerCase();
    if (lowerLabel.includes('iphone') || lowerLabel.includes('ipad')) {
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded input from device label
      const match = activeCameraLabel.match(/(iPhone|iPad)(\s+di\s+\w+)?/i);
      return match ? match[0] : 'iPhone Camera';
    }
    if (activeCameraLabel.length > 25) {
      return activeCameraLabel.substring(0, 22) + '...';
    }
    return activeCameraLabel;
  }, [activeCameraLabel]);

  useEffect(() => {
    mountedRef.current = true;
    startCamera(preferredCameraId || undefined);
    return () => {
      mountedRef.current = false;
      cancelAttemptRef.current?.();
      cancelAttemptRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Preference changes apply on the next opening.
  }, []);

  return {
    videoRef,
    stream,
    isLoading,
    error,
    errorType,
    availableCameras,
    selectedCameraId,
    showCameraMenu,
    setShowCameraMenu,
    activeCameraLabel,
    isSwitchingCamera,
    isMobileDevice,
    currentCameraName,
    startCamera,
    stopCamera,
    switchCamera,
    toggleFrontBack,
  };
}
