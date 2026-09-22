'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor } from 'lucide-react';
import { useWebcamCapture } from './webcam-capture/hooks/use-webcam-capture';
import { WebcamHeader } from './webcam-capture/components/webcam-header';
import { WebcamPreview } from './webcam-capture/components/webcam-preview';
import { WebcamControls } from './webcam-capture/components/webcam-controls';
import {
  isContinuityCamera as _isContinuityCamera,
  type CameraDevice,
} from './webcam-capture/utils/camera-utils';

interface WebcamCaptureProps {
  purpose: string;
  instructions?: string;
  onCapture: (imageData: string) => void | boolean | Promise<void | boolean>;
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
    handleImport,
    handleClose,
    isImporting,
    isConfirming,
    switchCamera,
    toggleFrontBack,
  } = useWebcamCapture({ showTimer, onCapture, onClose });

  const getCameraIcon = (camera: CameraDevice) => {
    if (camera.isContinuity) {
      return <Smartphone className="w-4 h-4 text-blue-400" />;
    }
    return <Monitor className="w-4 h-4 text-slate-400" />;
  };

  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (
      e.key === 'Enter' &&
      e.target === e.currentTarget &&
      !capturedImage &&
      !isLoading &&
      !error
    ) {
      e.preventDefault();
      handleCapture();
    }
    if (e.key !== 'Tab') return;
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    );
    const target = document.activeElement;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && (target === first || target === e.currentTarget)) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && target === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  // Focus trap: focus dialog on mount
  useEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialogRef.current;
    if (element && 'focus' in element && typeof element.focus === 'function') {
      element.focus();
    }
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      aria-label={`${purpose}${instructions ? `: ${instructions}` : ''}`}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-black h-screen outline-none overflow-hidden"
    >
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
        onClose={handleClose}
        getCameraIcon={getCameraIcon}
      />

      <div className="flex-1 relative min-h-0 overflow-hidden">
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
          onClose={handleClose}
          onImport={handleImport}
          isImporting={isImporting}
          onCancelCountdown={handleCancelCountdown}
          onToggleFrontBack={toggleFrontBack}
        />
      </div>

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
        isConfirming={isConfirming || isImporting}
      />
    </motion.div>
  );
}
