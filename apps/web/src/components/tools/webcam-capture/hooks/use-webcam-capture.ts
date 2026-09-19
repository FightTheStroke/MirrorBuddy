/**
 * @file use-webcam-capture.ts
 * @brief Custom hook for webcam capture logic (orchestration layer)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/lib/stores';
import { captureImageFromVideo, importCameraPhoto } from '../utils/capture-utils';
import { useCameraManager } from './use-camera-manager';
import { useCaptureTimer } from './use-capture-timer';

interface UseWebcamCaptureProps {
  showTimer: boolean;
  onCapture: (imageData: string) => void | boolean | Promise<void | boolean>;
  onClose: () => void;
}

export function useWebcamCapture({ showTimer, onCapture, onClose }: UseWebcamCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmedRef = useRef(false);
  const mountedRef = useRef(false);
  const importGenerationRef = useRef(0);
  const importPendingRef = useRef(false);
  const t = useTranslations('tools.webcam');
  useEffect(() => {
    mountedRef.current = true;
    importGenerationRef.current++;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const preferredCameraId = useSettingsStore((s) => s.preferredCameraId);

  const {
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
  } = useCameraManager({ preferredCameraId });

  const doCapture = useCallback(() => {
    try {
      const imageData = captureImageFromVideo(videoRef.current, canvasRef.current);
      if (!imageData) {
        stopCamera();
        setCaptureError(t('frameUnavailable'));
        return;
      }
      setCapturedImage(imageData);
      setCaptureError(null);
      confirmedRef.current = false;
      setIsConfirming(false);
      stopCamera();
    } catch (error) {
      stopCamera();
      logger.error('Camera capture failed', { component: 'WebcamCapture' }, error);
      setCaptureError(t('frameUnavailable'));
    }
  }, [videoRef, stopCamera, t]);

  const {
    selectedTimer,
    setSelectedTimer,
    countdown,
    showFlash,
    handleCapture,
    handleCancelCountdown,
  } = useCaptureTimer({
    showTimer,
    onCaptureComplete: doCapture,
  });

  const handleRetake = useCallback(async () => {
    importGenerationRef.current++;
    importPendingRef.current = false;
    setIsImporting(false);
    setCaptureError(null);
    confirmedRef.current = false;
    setIsConfirming(false);
    setCapturedImage(null);
    await startCamera(selectedCameraId || preferredCameraId || undefined);
  }, [startCamera, selectedCameraId, preferredCameraId]);

  const handleConfirm = useCallback(async () => {
    if (!capturedImage || confirmedRef.current) return;
    const generation = importGenerationRef.current;
    setCaptureError(null);
    confirmedRef.current = true;
    setIsConfirming(true);
    try {
      const accepted = await onCapture(capturedImage);
      if (accepted === false && mountedRef.current && generation === importGenerationRef.current) {
        confirmedRef.current = false;
        setIsConfirming(false);
      }
    } catch (error) {
      logger.error('Camera confirmation failed', { component: 'WebcamCapture' }, error);
      if (mountedRef.current && generation === importGenerationRef.current) {
        confirmedRef.current = false;
        setIsConfirming(false);
        setCaptureError(t('confirmFailed'));
      }
    }
  }, [capturedImage, onCapture, t]);

  const handleRetry = useCallback(() => {
    importGenerationRef.current++;
    importPendingRef.current = false;
    setCaptureError(null);
    setIsImporting(false);
    if (capturedImage) {
      void handleConfirm();
      return;
    }
    startCamera(selectedCameraId || preferredCameraId || undefined);
  }, [capturedImage, handleConfirm, startCamera, selectedCameraId, preferredCameraId]);

  const handleImport = useCallback(async () => {
    if (importPendingRef.current) return;
    importPendingRef.current = true;
    const generation = ++importGenerationRef.current;
    handleCancelCountdown();
    stopCamera();
    setIsImporting(true);
    try {
      const image = await importCameraPhoto();
      if (mountedRef.current && generation === importGenerationRef.current) {
        setCapturedImage(image);
        setCaptureError(null);
        confirmedRef.current = false;
        setIsConfirming(false);
      }
    } catch (error) {
      if (
        mountedRef.current &&
        generation === importGenerationRef.current &&
        !(error instanceof DOMException && error.name === 'AbortError')
      ) {
        logger.error('Camera image import failed', { component: 'WebcamCapture' }, error);
        setCaptureError(t('importFailed'));
      }
    } finally {
      if (mountedRef.current && generation === importGenerationRef.current) {
        importPendingRef.current = false;
        setIsImporting(false);
      }
    }
  }, [handleCancelCountdown, stopCamera, t]);

  const handleClose = useCallback(() => {
    importGenerationRef.current++;
    importPendingRef.current = false;
    handleCancelCountdown();
    stopCamera();
    onClose();
  }, [handleCancelCountdown, stopCamera, onClose]);

  return {
    videoRef,
    canvasRef,
    stream,
    capturedImage,
    isLoading,
    error: captureError || (capturedImage ? null : error),
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
    handleImport,
    handleClose,
    isImporting,
    isConfirming,
    switchCamera,
    toggleFrontBack,
  };
}
