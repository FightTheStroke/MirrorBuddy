"use client";

import { useCallback } from "react";
import { Video, VideoOff, Camera, SwitchCamera } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/types/voice";

interface CameraModeSelectorProps {
  cameraMode: CameraMode;
  cameraFacing: "user" | "environment";
  limitReached: boolean;
  onCycleMode: () => void;
  onToggleFacing: () => void;
  onTakeSnapshot?: () => void;
  className?: string;
}

/**
 * Unified camera mode selector (ADR 0126).
 * Cycles through: off → video → photo → off
 * Shows camera flip button when camera is active.
 */
export function CameraModeSelector({
  cameraMode,
  cameraFacing,
  limitReached,
  onCycleMode,
  onToggleFacing,
  onTakeSnapshot,
  className,
}: CameraModeSelectorProps) {
  const t = useTranslations("chat.camera");

  const handleModeClick = useCallback(() => {
    if (limitReached && cameraMode === "off") return;
    onCycleMode();
  }, [limitReached, cameraMode, onCycleMode]);

  const getModeIcon = () => {
    switch (cameraMode) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "photo":
        return <Camera className="h-5 w-5" />;
      default:
        return <VideoOff className="h-5 w-5" />;
    }
  };

  const getModeTooltip = () => {
    if (limitReached && cameraMode === "off") {
      return t("limitReached");
    }
    switch (cameraMode) {
      case "video":
        return t("videoMode");
      case "photo":
        return t("photoMode");
      default:
        return t("cameraOff");
    }
  };

  const getModeAriaLabel = () => {
    switch (cameraMode) {
      case "video":
        return t("videoModeAriaLabel");
      case "photo":
        return t("photoModeAriaLabel");
      default:
        return t("cameraOffAriaLabel");
    }
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label={t("cameraOff")}
    >
      {/* Screen reader announcement for mode changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {getModeAriaLabel()}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={handleModeClick}
        disabled={limitReached && cameraMode === "off"}
        title={getModeTooltip()}
        aria-label={getModeAriaLabel()}
        className={cn(
          "rounded-full transition-colors",
          limitReached && cameraMode === "off"
            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
            : cameraMode === "video"
              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              : cameraMode === "photo"
                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                : "bg-slate-700 text-white hover:bg-slate-600",
        )}
      >
        {getModeIcon()}
      </Button>

      {cameraMode !== "off" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFacing}
          title={t("flipCamera")}
          aria-label={
            cameraFacing === "user"
              ? t("switchToBackCamera")
              : t("switchToFrontCamera")
          }
          className="rounded-full bg-slate-700/50 text-white hover:bg-slate-600/50 h-8 w-8"
        >
          <SwitchCamera className="h-4 w-4" />
        </Button>
      )}

      {cameraMode === "photo" && onTakeSnapshot && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onTakeSnapshot}
          title={t("takeSnapshot")}
          aria-label={t("takeSnapshotAriaLabel")}
          className="rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 h-8 w-8"
        >
          <Camera className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
