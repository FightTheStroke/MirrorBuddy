"use client";

import { AnimatePresence } from "framer-motion";
import { WebcamCapture } from "@/components/tools/webcam-capture";
import { VideoPreviewPip } from "../video-preview-pip";
import { SessionGradeDisplay } from "../session-grade";
import type { Maestro } from "@/types";
import type { WebcamRequest } from "./types";

interface SessionOverlaysProps {
  videoEnabled: boolean;
  videoStream: MediaStream | null;
  videoElapsedSeconds: number;
  videoFramesSent: number;
  videoMaxSeconds: number;
  onVideoStop: () => void;
  showWebcam: boolean;
  webcamRequest: WebcamRequest | null;
  onWebcamCapture: (req: WebcamRequest, data: string) => void;
  onWebcamClose: (req: WebcamRequest) => void;
  showGrade: boolean;
  maestro: Maestro;
  sessionDuration: number;
  questionsAsked: number;
  xpEarned: number;
  onGradeClose: () => void;
}

export function SessionOverlays({
  videoEnabled,
  videoStream,
  videoElapsedSeconds,
  videoFramesSent,
  videoMaxSeconds,
  onVideoStop,
  showWebcam,
  webcamRequest,
  onWebcamCapture,
  onWebcamClose,
  showGrade,
  maestro,
  sessionDuration,
  questionsAsked,
  xpEarned,
  onGradeClose,
}: SessionOverlaysProps) {
  return (
    <AnimatePresence>
      {videoEnabled && videoStream && (
        <VideoPreviewPip
          videoStream={videoStream}
          elapsedSeconds={videoElapsedSeconds}
          framesSent={videoFramesSent}
          maxSeconds={videoMaxSeconds}
          onStop={onVideoStop}
        />
      )}
      {showWebcam && webcamRequest && (
        <WebcamCapture
          purpose={webcamRequest.purpose}
          instructions={webcamRequest.instructions}
          onCapture={(data) => onWebcamCapture(webcamRequest, data)}
          onClose={() => onWebcamClose(webcamRequest)}
        />
      )}
      {showGrade && (
        <SessionGradeDisplay
          maestro={maestro}
          sessionDuration={sessionDuration}
          questionsAsked={questionsAsked}
          xpEarned={xpEarned}
          onClose={onGradeClose}
        />
      )}
    </AnimatePresence>
  );
}
