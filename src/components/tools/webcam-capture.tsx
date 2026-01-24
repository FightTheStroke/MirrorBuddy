"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Smartphone, Monitor } from "lucide-react";
import { useWebcamCapture } from "./webcam-capture/hooks/use-webcam-capture";
import { WebcamHeader } from "./webcam-capture/components/webcam-header";
import { WebcamPreview } from "./webcam-capture/components/webcam-preview";
import { WebcamControls } from "./webcam-capture/components/webcam-controls";
import {
  isContinuityCamera as _isContinuityCamera,
  type CameraDevice,
} from "./webcam-capture/utils/camera-utils";

interface WebcamCaptureProps {
  purpose: string;
  instructions?: string;
  onCapture: (imageData: string) => void;
  onClose: () => void;
  showTimer?: boolean;
}

export function WebcamCapture({
  purpose,
  instructions,
  onCapture,
  onClose,
  showTimer = false,
}: WebcamCaptureProps) {
  const {
    videoRef,
    canvasRef,
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
  } = useWebcamCapture({ showTimer, onCapture, onClose });

  const getCameraIcon = (camera: CameraDevice) => {
    if (camera.isContinuity) {
      return <Smartphone className="w-4 h-4 text-blue-400" />;
    }
    return <Monitor className="w-4 h-4 text-slate-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-2 sm:p-4"
    >
      <Card className="w-full max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white overflow-hidden">
        <WebcamHeader
          purpose={purpose}
          instructions={instructions}
          availableCameras={availableCameras}
          selectedCameraId={selectedCameraId}
          activeCameraLabel={activeCameraLabel}
          currentCameraName={currentCameraName}
          showCameraMenu={showCameraMenu}
          isSwitchingCamera={isSwitchingCamera}
          capturedImage={capturedImage}
          error={error}
          onToggleMenu={() => setShowCameraMenu(!showCameraMenu)}
          onSwitchCamera={switchCamera}
          onClose={onClose}
          getCameraIcon={getCameraIcon}
        />

        <WebcamPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          isLoading={isLoading}
          error={error}
          errorType={errorType}
          capturedImage={capturedImage}
          showFlash={showFlash}
          isSwitchingCamera={isSwitchingCamera}
          countdown={countdown}
          isMobileDevice={isMobileDevice}
          availableCameras={availableCameras}
          selectedCameraId={selectedCameraId}
          onRetry={handleRetry}
          onClose={onClose}
          onCancelCountdown={handleCancelCountdown}
          onToggleFrontBack={toggleFrontBack}
        />

        <WebcamControls
          showTimer={showTimer}
          selectedTimer={selectedTimer}
          onTimerChange={setSelectedTimer}
          countdown={countdown}
          capturedImage={capturedImage}
          isLoading={isLoading}
          error={error}
          onCapture={handleCapture}
          onRetake={handleRetake}
          onConfirm={handleConfirm}
        />
      </Card>
    </motion.div>
  );
}
