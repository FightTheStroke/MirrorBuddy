/**
 * @file webcam-preview.tsx
 * @brief Webcam preview component
 */

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WebcamError } from "./webcam-error";
import type { ErrorType } from "../constants";

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
  errorType: ErrorType;
  capturedImage: string | null;
  showFlash: boolean;
  isSwitchingCamera: boolean;
  countdown: number | null;
  isMobileDevice: boolean;
  availableCameras: Array<{ deviceId: string; isFrontFacing: boolean }>;
  selectedCameraId: string | null;
  onRetry: () => void;
  onClose: () => void;
  onCancelCountdown: () => void;
  onToggleFrontBack: () => void;
}

export function WebcamPreview({
  videoRef,
  canvasRef,
  isLoading,
  error,
  errorType,
  capturedImage,
  showFlash,
  isSwitchingCamera,
  countdown,
  isMobileDevice,
  availableCameras,
  selectedCameraId,
  onRetry,
  onClose,
  onCancelCountdown,
  onToggleFrontBack,
}: WebcamPreviewProps) {
  const t = useTranslations("tools.webcam");
  const _selectedCameraId = selectedCameraId; // Mark as unused

  // Determine status message for screen readers
  const getStatusMessage = () => {
    if (error) return `Error: ${error}`;
    if (isLoading) return "Starting camera...";
    if (isSwitchingCamera) return "Switching camera...";
    if (capturedImage) return "Photo captured successfully";
    if (countdown !== null && countdown > 0)
      return `Taking photo in ${countdown}`;
    return "Camera ready";
  };

  return (
    <div className="relative aspect-video bg-black">
      {/* Screen reader status announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {getStatusMessage()}
      </div>

      {error ? (
        <WebcamError
          error={error}
          errorType={errorType}
          onRetry={onRetry}
          onClose={onClose}
        />
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 z-10 bg-black">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-slate-300 text-sm">{t("startingCamera")}</p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={
              capturedImage || isLoading
                ? "invisible"
                : "w-full h-full object-cover"
            }
          />

          <AnimatePresence>
            {capturedImage && (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={capturedImage}
                alt="Foto catturata"
                className="w-full h-full object-contain"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-white z-20"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSwitchingCamera && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"
              >
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm">
                    {t("switchingCamera")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {countdown !== null && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
              >
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                  className="text-center"
                >
                  <div className="text-8xl font-bold text-white drop-shadow-lg">
                    {countdown}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelCountdown}
                    className="mt-6 border-white/50 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                  >
                    {t("cancel")}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {isMobileDevice &&
            availableCameras.length > 1 &&
            !capturedImage &&
            countdown === null && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleFrontBack}
                className="absolute top-4 right-4 bg-black/50 border-white/30 text-white hover:bg-black/70 z-10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                aria-label={t("switchCamera")}
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
            )}

          <canvas ref={canvasRef} className="hidden" />

          {!capturedImage && !isLoading && !error && countdown === null && (
            <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-lg pointer-events-none">
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
                <p className="text-sm text-white/80">{t("positionContent")}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
