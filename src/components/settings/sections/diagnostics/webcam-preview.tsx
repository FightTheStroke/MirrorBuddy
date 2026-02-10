"use client";

import { useState, useRef } from "react";
import { Video, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { useTranslations } from "next-intl";

interface WebcamPreviewProps {
  availableCameras: MediaDeviceInfo[];
  selectedCamId: string;
  onCameraChange: (camId: string) => void;
  onRefresh: () => void;
}

export function WebcamPreview({
  availableCameras,
  selectedCamId,
  onCameraChange,
  onRefresh,
}: WebcamPreviewProps) {
  const t = useTranslations("settings");
  const [webcamActive, setWebcamActive] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      const videoConstraints: boolean | MediaTrackConstraints = selectedCamId
        ? { deviceId: { ideal: selectedCamId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
      });
      webcamStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      setWebcamActive(true);
    } catch (error) {
      logger.error("Webcam error", undefined, error);
      setWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />
          {t("testWebcamLive")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          {t("avviaIlTestPerVedereLAposAnteprimaDellaWebcamSelez")}


        </p>

        <div className="flex items-center gap-3">
          <label
            htmlFor="webcam-select"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
          >
            {t("webcam")}
          </label>
          <select
            id="webcam-select"
            value={selectedCamId}
            onChange={(e) => onCameraChange(e.target.value)}
            disabled={webcamActive}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableCameras.length === 0 ? (
              <option value="">{t("nessunaWebcamTrovata")}</option>
            ) : (
              availableCameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
                </option>
              ))
            )}
          </select>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={webcamActive}
            title={t("aggiornaListaWebcam")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video">
          <video
            ref={videoPreviewRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          {!webcamActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-12 h-12 text-slate-600" />
            </div>
          )}
          {webcamActive && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                LIVE
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!webcamActive ? (
            <Button onClick={startWebcam} className="flex-1" variant="default">
              <Video className="w-4 h-4 mr-2" />
              {t("avviaWebcam")}
            </Button>
          ) : (
            <Button
              onClick={stopWebcam}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t("stopWebcam")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
