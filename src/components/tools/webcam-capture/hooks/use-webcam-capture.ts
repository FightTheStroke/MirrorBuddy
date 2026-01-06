/**
 * @file use-webcam-capture.ts
 * @brief Custom hook for webcam capture logic
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/lib/stores';
import { isMobile, enumerateCameras as enumerateCamerasUtil, type CameraDevice } from '../utils/camera-utils';
import { captureImageFromVideo } from '../utils/capture-utils';
import { TIMER_OPTIONS, type TimerOption, type ErrorType } from '../constants';

interface UseWebcamCaptureProps {
  showTimer: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function useWebcamCapture({
  showTimer,
  onCapture,
  onClose,
}: UseWebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);

  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(
    showTimer ? 3 : 0
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const [isMobileDevice] = useState(() => isMobile());
  const preferredCameraId = useSettingsStore((s) => s.preferredCameraId);

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

        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { ideal: deviceId } } : true,
        };

        logger.info('Requesting camera access', { deviceId, constraints });

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
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
            setSelectedCameraId(
              videoTrack.getSettings().deviceId || deviceId || null
            );
          }

          setStream(mediaStream);
          setIsLoading(false);
          await enumerateCameras();
        }
      } catch (err) {
        clearTimeout(timeoutId);
        const errorMsg = String(err);
        logger.error('Camera error', { error: errorMsg, deviceId });

        if (
          errorMsg.includes('Permission') ||
          errorMsg.includes('NotAllowedError')
        ) {
          setError(
            'Permesso fotocamera negato. Abilita l\'accesso alla fotocamera nelle impostazioni del browser.'
          );
          setErrorType('permission');
        } else if (
          errorMsg.includes('NotFoundError') ||
          errorMsg.includes('DevicesNotFoundError')
        ) {
          setError(
            'Nessuna fotocamera trovata. Collega una webcam o usa un dispositivo con fotocamera.'
          );
          setErrorType('unavailable');
        } else {
          if (deviceId) {
            logger.info('Retrying with any available camera');
            try {
              const fallbackStream =
                await navigator.mediaDevices.getUserMedia({ video: true });
              if (videoRef.current) {
                videoRef.current.srcObject = fallbackStream;
                await videoRef.current.play();
                const videoTrack = fallbackStream.getVideoTracks()[0];
                if (videoTrack) {
                  setActiveCameraLabel(videoTrack.label);
                  setSelectedCameraId(
                    videoTrack.getSettings().deviceId || null
                  );
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
    [stream, enumerateCameras]
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setIsSwitchingCamera(true);
      setShowCameraMenu(false);
      await startCamera(deviceId);
      setIsSwitchingCamera(false);
    },
    [startCamera]
  );

  const toggleFrontBack = useCallback(async () => {
    if (availableCameras.length < 2) return;

    const currentCamera = availableCameras.find(
      (c) => c.deviceId === selectedCameraId
    );
    const targetCamera = availableCameras.find(
      (c) => c.isFrontFacing !== currentCamera?.isFrontFacing
    );

    if (targetCamera) {
      await switchCamera(targetCamera.deviceId);
    } else {
      const currentIndex = availableCameras.findIndex(
        (c) => c.deviceId === selectedCameraId
      );
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      await switchCamera(availableCameras[nextIndex].deviceId);
    }
  }, [availableCameras, selectedCameraId, switchCamera]);

  const doCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const imageData = captureImageFromVideo(
      videoRef.current,
      canvasRef.current
    );
    if (imageData) {
      setCapturedImage(imageData);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  }, [stream]);

  const handleCapture = useCallback(() => {
    if (selectedTimer > 0) {
      setCountdown(selectedTimer);
    } else {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        doCapture();
      }, 150);
    }
  }, [selectedTimer, doCapture]);

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    await startCamera(selectedCameraId || preferredCameraId || undefined);
  }, [startCamera, selectedCameraId, preferredCameraId]);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const handleRetry = useCallback(() => {
    startCamera(selectedCameraId || preferredCameraId || undefined);
  }, [startCamera, selectedCameraId, preferredCameraId]);

  const currentCameraName = useMemo(() => {
    if (!activeCameraLabel) return 'Fotocamera';
    const lowerLabel = activeCameraLabel.toLowerCase();
    if (lowerLabel.includes('iphone') || lowerLabel.includes('ipad')) {
      const match = activeCameraLabel.match(
        /(iPhone|iPad)(\s+di\s+\w+|\s+\w+'s)?/i
      );
      return match ? match[0] : 'iPhone Camera';
    }
    if (activeCameraLabel.length > 25) {
      return activeCameraLabel.substring(0, 22) + '...';
    }
    return activeCameraLabel;
  }, [activeCameraLabel]);

  useEffect(() => {
    startCamera(preferredCameraId || undefined);

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        doCapture();
      }, 150);
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  return {
    videoRef,
    canvasRef,
    stream,
    capturedImage,
    isLoading,
    error,
    errorType,
    selectedTimer,
    setSelectedTimer,
    countdown,
    showFlash,
    availableCameras,
    selectedCameraId,
    showCameraMenu,
    setShowCameraMenu,
    activeCameraLabel,
    isSwitchingCamera,
    isMobileDevice,
    currentCameraName,
    handleCapture,
    handleCancelCountdown,
    handleRetake,
    handleConfirm,
    handleRetry,
    switchCamera,
    toggleFrontBack,
  };
}

