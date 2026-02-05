// ============================================================================
// VIDEO CAPTURE HOOK - ADR 0122
// Camera stream, periodic JPEG capture, motion detection, auto-stop timer
// ============================================================================

"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { logger } from "@/lib/logger";

const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 360;
const JPEG_QUALITY = 0.7;
const MOTION_THRESHOLD = 5;
const DEFAULT_INTERVAL_MS = 5000;
const INITIAL_CAPTURE_DELAY_MS = 500;

export interface UseVideoCaptureOptions {
  /** Called with base64 JPEG data when a frame is captured */
  onFrame: (base64: string) => void;
  /** Maximum capture duration in seconds */
  maxSeconds: number;
  /** Capture interval in ms (default: 5000) */
  captureIntervalMs?: number;
  /** Called when capture auto-stops (timer expired) */
  onAutoStop?: () => void;
}

export interface UseVideoCaptureReturn {
  videoStream: MediaStream | null;
  isCapturing: boolean;
  framesSent: number;
  elapsedSeconds: number;
  startCapture: () => Promise<boolean>;
  stopCapture: () => void;
}

export function useVideoCapture(
  options: UseVideoCaptureOptions,
): UseVideoCaptureReturn {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const startTimeRef = useRef(0);
  const onFrameRef = useRef(options.onFrame);
  const onAutoStopRef = useRef(options.onAutoStop);
  const maxSecondsRef = useRef(options.maxSeconds);

  useEffect(() => {
    onFrameRef.current = options.onFrame;
  }, [options.onFrame]);
  useEffect(() => {
    onAutoStopRef.current = options.onAutoStop;
  }, [options.onAutoStop]);
  useEffect(() => {
    maxSecondsRef.current = options.maxSeconds;
  }, [options.maxSeconds]);

  const captureFrame = useCallback(() => {
    const video = videoElRef.current;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!video || !ctx || !canvas || video.readyState < 2) return;

    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const current = ctx.getImageData(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    if (prevFrameRef.current) {
      const diff = computeAvgDiff(prevFrameRef.current, current);
      if (diff < MOTION_THRESHOLD) {
        logger.debug("[VideoCapture] Frame skipped (no motion)", { diff });
        return;
      }
    }
    prevFrameRef.current = current;

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1];
    if (base64) {
      onFrameRef.current(base64);
      setFramesSent((p) => p + 1);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    captureTimerRef.current = null;
    clockTimerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setVideoStream(null);
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
      videoElRef.current.remove();
      videoElRef.current = null;
    }
    prevFrameRef.current = null;
    setIsCapturing(false);
    logger.info("[VideoCapture] Capture stopped");
  }, []);

  const startCapture = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAPTURE_WIDTH },
          height: { ideal: CAPTURE_HEIGHT },
          facingMode: "user",
        },
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoElRef.current = video;

      const canvas = document.createElement("canvas");
      canvas.width = CAPTURE_WIDTH;
      canvas.height = CAPTURE_HEIGHT;
      canvasRef.current = canvas;
      ctxRef.current = canvas.getContext("2d");

      setVideoStream(stream);
      setIsCapturing(true);
      setFramesSent(0);
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();

      const interval = options.captureIntervalMs || DEFAULT_INTERVAL_MS;
      captureTimerRef.current = setInterval(captureFrame, interval);
      setTimeout(captureFrame, INITIAL_CAPTURE_DELAY_MS);

      clockTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);
        if (elapsed >= maxSecondsRef.current) {
          logger.info("[VideoCapture] Max time reached", { elapsed });
          stopCapture();
          onAutoStopRef.current?.();
        }
      }, 1000);

      logger.info("[VideoCapture] Capture started", { interval });
      return true;
    } catch (error) {
      logger.error("[VideoCapture] Failed to start", {
        error: String(error),
      });
      return false;
    }
  }, [captureFrame, stopCapture, options.captureIntervalMs]);

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoStream,
    isCapturing,
    framesSent,
    elapsedSeconds,
    startCapture,
    stopCapture,
  };
}

/** Sample every Nth pixel's R channel to detect movement */
function computeAvgDiff(prev: ImageData, curr: ImageData): number {
  const d1 = prev.data;
  const d2 = curr.data;
  const step = 160; // sample ~1440 pixels from 640x360
  let total = 0;
  let count = 0;
  for (let i = 0; i < d1.length; i += step) {
    total += Math.abs(d1[i] - d2[i]);
    count++;
  }
  return count > 0 ? total / count : 0;
}
