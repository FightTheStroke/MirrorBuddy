/**
 * Camera preview component
 */

"use client";

import { useTranslations } from "next-intl";

import { Video, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraPreviewProps {
  preferredCameraId: string | null;
  availableCameras: MediaDeviceInfo[];
  camTestActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCamChange: (deviceId: string) => void;
  onRefresh: () => void;
  onStartTest: () => void;
  onStopTest: () => void;
}

export function CameraPreview({
  preferredCameraId,
  availableCameras,
  camTestActive,
  videoRef,
  onCamChange,
  onRefresh,
  onStartTest,
  onStopTest,
}: CameraPreviewProps) {
  const t = useTranslations("settings.ambientAudio");

  return (
    <div className="space-y-4">
      {/* Large video preview */}
      <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden bg-slate-900">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        {!camTestActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Video className="w-12 h-12 text-slate-600" />
            <span className="text-sm text-slate-500">
              Clicca &quot;Testa&quot; per vedere l&apos;anteprima
            </span>
          </div>
        )}
        {camTestActive && (
          <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-white">LIVE</span>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4">
        <select
          value={preferredCameraId || ""}
          onChange={(e) => onCamChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
        >
          <option value="">Predefinito di sistema</option>
          {availableCameras.map((cam) => (
            <option key={cam.deviceId} value={cam.deviceId}>
              {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
            </option>
          ))}
        </select>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          title="Aggiorna dispositivi"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        {!camTestActive ? (
          <Button onClick={onStartTest} variant="default" size="sm">
            <Video className="w-4 h-4 mr-1" />
            Testa
          </Button>
        ) : (
          <Button onClick={onStopTest} variant="destructive" size="sm">
            <XCircle className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        {t("futureVideoFeatures")}
      </p>
    </div>
  );
}
