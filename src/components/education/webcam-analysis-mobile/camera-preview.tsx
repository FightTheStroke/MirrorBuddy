"use client";

/**
 * Camera preview component with controls
 */

import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  isSwitchingCamera: boolean;
  capturedImage: string | null;
  isPhone: boolean;
  onCapture: () => void;
  onToggleCamera: () => void;
  onToggleFlash: () => void;
  isFlashEnabled: boolean;
  availableCamerasCount: number;
  isLoadingOrDisabled: boolean;
}

export function CameraPreview({
  videoRef,
  canvasRef,
  isLoading,
  isSwitchingCamera,
  isPhone,
  onCapture,
  onToggleCamera,
  onToggleFlash,
  isFlashEnabled,
  availableCamerasCount,
  isLoadingOrDisabled,
}: CameraPreviewProps) {
  const t = useTranslations("education");
  return (
    <div className="flex flex-col gap-3 bg-black rounded-lg overflow-hidden flex-1 min-h-0">
      {/* Preview Container */}
      <div className="relative w-full flex-1 bg-black flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-white animate-spin" />
              <p className="text-sm text-white">{t("initializingCamera")}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          aria-label={t("cameraPreview")}
        />

        {isSwitchingCamera && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <Loader className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div
        className={cn(
          "flex items-center justify-center gap-3 pb-3 px-3",
          "flex-wrap",
        )}
      >
        {/* Camera Switch Button */}
        {availableCamerasCount > 1 && (
          <button
            onClick={onToggleCamera}
            disabled={isSwitchingCamera || isLoading}
            className={cn(
              "min-h-[44px] min-w-[44px] px-3 py-2",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "rounded-full font-medium transition-colors",
              "flex items-center justify-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isPhone ? "text-sm" : "text-base",
            )}
            aria-label={t("switchCamera")}
          >
            <span>🔄</span>
            {!isPhone && <span>{t("switchLabel")}</span>}
          </button>
        )}

        {/* Capture Button - Large and Centered */}
        <button
          onClick={onCapture}
          disabled={isLoadingOrDisabled}
          className={cn(
            "min-h-16 min-w-16 px-4 py-2",
            "bg-red-600 hover:bg-red-700 text-white",
            "rounded-full font-bold transition-all transform",
            "flex items-center justify-center gap-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:scale-105 active:scale-95",
            "shadow-lg hover:shadow-xl",
          )}
          aria-label={t("capturePhoto")}
        >
          <span className="text-xl">📸</span>
        </button>

        {/* Flash Toggle */}
        <button
          onClick={onToggleFlash}
          className={cn(
            "min-h-[44px] min-w-[44px] px-3 py-2",
            isFlashEnabled
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-gray-600 hover:bg-gray-700",
            "text-white rounded-full font-medium transition-colors",
            "flex items-center justify-center",
            isPhone ? "text-sm" : "text-base",
          )}
          aria-label={`${isFlashEnabled ? "Disable" : "Enable"} flash`}
        >
          <span>⚡</span>
        </button>
      </div>
    </div>
  );
}
