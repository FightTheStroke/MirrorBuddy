/**
 * @file use-webcam-capture.ts
 * @brief Custom hook for webcam capture logic (orchestration layer)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/lib/stores";
import { captureImageFromVideo } from "../utils/capture-utils";
import { useCameraManager } from "./use-camera-manager";
import { useCaptureTimer } from "./use-capture-timer";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
    switchCamera,
    toggleFrontBack,
  } = useCameraManager({ preferredCameraId });

  const doCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const imageData = captureImageFromVideo(
      videoRef.current,
      canvasRef.current,
    );
    if (imageData) {
      setCapturedImage(imageData);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  }, [videoRef, stream]);

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

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

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
