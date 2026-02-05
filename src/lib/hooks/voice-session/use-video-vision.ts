// ============================================================================
// VIDEO VISION INTEGRATION - ADR 0122
// Wires video capture hook with usage tracking API and data channel
// ============================================================================

"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { useVideoCapture } from "./video-capture";
import { useSendVideoFrame } from "./actions";

interface VideoVisionRefs {
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  videoUsageIdRef: React.MutableRefObject<string | null>;
  videoMaxSecondsRef: React.MutableRefObject<number>;
}

export interface VideoVisionState {
  videoEnabled: boolean;
  toggleVideo: () => Promise<void>;
  videoStream: MediaStream | null;
  videoFramesSent: number;
}

/**
 * Integrates video capture with usage tracking and WebRTC data channel.
 * Manages the full lifecycle: start → capture frames → end.
 */
export function useVideoVision(vrefs: VideoVisionRefs): VideoVisionState {
  const sendVideoFrame = useSendVideoFrame(vrefs.webrtcDataChannelRef);

  const endUsageSession = useCallback(
    async (seconds: number) => {
      const usageId = vrefs.videoUsageIdRef.current;
      if (!usageId) return;
      try {
        await csrfFetch("/api/video-vision/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            usageId,
            secondsUsed: seconds,
          }),
        });
      } catch (e) {
        logger.error("[VideoVision] Failed to end session", {
          error: String(e),
        });
      }
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      vrefs.videoUsageIdRef.current = null;
    },
    [vrefs],
  );

  const handleAutoStop = useCallback(async () => {
    await endUsageSession(vrefs.videoMaxSecondsRef.current);
  }, [endUsageSession, vrefs]);

  const capture = useVideoCapture({
    onFrame: sendVideoFrame,
    maxSeconds: vrefs.videoMaxSecondsRef.current,
    onAutoStop: handleAutoStop,
  });

  const toggleVideo = useCallback(async () => {
    if (capture.isCapturing) {
      capture.stopCapture();
      await endUsageSession(capture.elapsedSeconds);
      return;
    }

    try {
      const res = await csrfFetch("/api/video-vision/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          voiceSessionId: vrefs.sessionIdRef.current || "unknown",
        }),
      });
      if (!res.ok) {
        logger.warn("[VideoVision] Start denied", { status: res.status });
        return;
      }
      const data = await res.json();
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      vrefs.videoUsageIdRef.current = data.id;

      vrefs.videoMaxSecondsRef.current = data.maxSeconds;
      await capture.startCapture();
    } catch (e) {
      logger.error("[VideoVision] Failed to start", { error: String(e) });
    }
  }, [capture, endUsageSession, vrefs]);

  return {
    videoEnabled: capture.isCapturing,
    toggleVideo,
    videoStream: capture.videoStream,
    videoFramesSent: capture.framesSent,
  };
}
