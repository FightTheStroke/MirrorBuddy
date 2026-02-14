/**
 * @file use-camera-manager.ts
 * @brief Hook for camera enumeration, switching, and stream management
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import {
  requestVideoStream,
  isMediaDevicesAvailable,
  type VideoConstraints,
} from '@/lib/native/media-bridge';
import {
  isMobile,
  enumerateCameras as enumerateCamerasUtil,
  type CameraDevice,
} from '../utils/camera-utils';
import type { ErrorType } from '../constants';

interface UseCameraManagerProps {
  preferredCameraId?: string | null;
}

export function useCameraManager({ preferredCameraId }: UseCameraManagerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const enumerateCameras = useCallback(async () => {
    const cameras = await enumerateCamerasUtil();
    setAvailableCameras(cameras);
    return cameras;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setIsLoading(true);
      setError(null);
      setErrorType(null);

      const timeoutId = setTimeout(() => {
        setError('Timeout fotocamera. La fotocamera non risponde.');
        setErrorType('timeout');
        setIsLoading(false);
      }, 10000);

      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        // Build video constraints based on device type and device selection
        let videoConstraints: VideoConstraints;

        if (deviceId) {
          // Specific device requested - use device ID
          videoConstraints = { deviceId: { ideal: deviceId } };
        } else {
          // No specific device - set facingMode based on device type
          // Mobile: rear camera (environment) by default for scanning/photos
          // Desktop: front camera (user) by default for video calls/selfies
          const defaultFacingMode = isMobileDevice ? 'environment' : 'user';
          videoConstraints = { facingMode: defaultFacingMode };
        }

        logger.info('Requesting camera access', {
          deviceId,
          videoConstraints,
          isMobileDevice,
        });

        const mediaStream = await requestVideoStream(videoConstraints);
        clearTimeout(timeoutId);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            logger.warn('Video autoplay blocked', { error: String(playErr) });
          }

          const videoTrack = mediaStream.getVideoTracks()[0];
          if (videoTrack) {
            setActiveCameraLabel(videoTrack.label);
            setSelectedCameraId(videoTrack.getSettings().deviceId || deviceId || null);
          }

          setStream(mediaStream);
          setIsLoading(false);
          await enumerateCameras();
        }
      } catch (err) {
        clearTimeout(timeoutId);

        // Extract error information safely
        let errorName = 'UnknownError';
        let errorMessage = 'Unknown error';
        let errorType = 'Unknown';

        try {
          const errorObj = err as Error | DOMException;
          errorName = errorObj?.name || (err as { name?: string })?.name || 'UnknownError';
          errorMessage =
            errorObj?.message ||
            (err as { message?: string })?.message ||
            String(err) ||
            'Unknown error';
          errorType = errorObj?.constructor?.name || 'Unknown';
        } catch {
          // Fallback if error extraction fails
          errorMessage = String(err) || 'Unknown error';
        }

        const errorMsg = errorMessage || errorName;

        // Log error with safe serialization
        try {
          logger.error('Camera error', {
            errorDetails: errorMessage,
            errorName,
            errorType,
            deviceId: deviceId || null,
            hasMediaDevices: isMediaDevicesAvailable(),
            hasGetUserMedia: isMediaDevicesAvailable(),
          });
        } catch (_logErr) {
          // If logging fails, silently continue
        }

        if (
          errorName === 'NotAllowedError' ||
          errorName === 'PermissionDeniedError' ||
          errorMsg.includes('Permission') ||
          errorMsg.includes('NotAllowedError') ||
          errorMsg.includes('permission denied')
        ) {
          setError(
            "Permesso fotocamera negato. Abilita l'accesso alla fotocamera nelle impostazioni del browser.",
          );
          setErrorType('permission');
        } else if (
          errorName === 'NotFoundError' ||
          errorName === 'DevicesNotFoundError' ||
          errorMsg.includes('NotFoundError') ||
          errorMsg.includes('DevicesNotFoundError') ||
          errorMsg.includes('no camera')
        ) {
          setError(
            'Nessuna fotocamera trovata. Collega una webcam o usa un dispositivo con fotocamera.',
          );
          setErrorType('unavailable');
        } else if (
          errorName === 'NotReadableError' ||
          errorName === 'TrackStartError' ||
          errorMsg.includes('NotReadableError') ||
          errorMsg.includes('in use') ||
          errorMsg.includes('busy')
        ) {
          setError(
            "La fotocamera è già in uso da un'altra applicazione. Chiudi le altre app e riprova.",
          );
          setErrorType('unavailable');
        } else {
          if (deviceId) {
            logger.info('Retrying with any available camera');
            try {
              const fallbackStream = await requestVideoStream();
              if (videoRef.current) {
                videoRef.current.srcObject = fallbackStream;
                await videoRef.current.play();
                const videoTrack = fallbackStream.getVideoTracks()[0];
                if (videoTrack) {
                  setActiveCameraLabel(videoTrack.label);
                  setSelectedCameraId(videoTrack.getSettings().deviceId || null);
                }
                setStream(fallbackStream);
                setIsLoading(false);
                await enumerateCameras();
                return;
              }
            } catch (fallbackErr) {
              logger.error('Camera fallback failed', {
                error: String(fallbackErr),
              });
            }
          }
          setError('Impossibile accedere alla fotocamera. Riprova.');
          setErrorType('unavailable');
        }
        setIsLoading(false);
      }
    },
    [stream, enumerateCameras, isMobileDevice],
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setIsSwitchingCamera(true);
      setShowCameraMenu(false);
      await startCamera(deviceId);
      setIsSwitchingCamera(false);
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

  // Initialize camera on mount
  useEffect(() => {
    startCamera(preferredCameraId || undefined);

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

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
    switchCamera,
    toggleFrontBack,
  };
}
