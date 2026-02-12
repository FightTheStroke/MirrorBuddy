// ============================================================================
// UNIFIED CAMERA HOOK - ADR 0126
// Combines video vision (continuous) and photo (snapshot) modes
// ============================================================================

'use client';

import { useCallback, useState, useRef } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';
import { useVideoCapture } from './video-capture';
import { useSendVideoFrame } from './actions';
import type { CameraMode } from '@/types/voice';

const MODE_CYCLE: CameraMode[] = ['off', 'video', 'photo'];
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 360;
const JPEG_QUALITY = 0.7;

interface UnifiedCameraRefs {
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  videoUsageIdRef: React.MutableRefObject<string | null>;
  videoMaxSecondsRef: React.MutableRefObject<number>;
}

export interface UnifiedCameraState {
  cameraMode: CameraMode;
  cameraFacing: 'user' | 'environment';
  videoStream: MediaStream | null;
  videoFramesSent: number;
  videoElapsedSeconds: number;
  videoMaxSeconds: number;
  videoLimitReached: boolean;
  cycleCameraMode: () => Promise<void>;
  takeSnapshot: () => Promise<void>;
  toggleCameraFacing: () => void;
  // Legacy compatibility (ADR 0122)
  videoEnabled: boolean;
  toggleVideo: () => Promise<void>;
}

/**
 * Unified camera hook for voice sessions.
 * Supports three modes:
 * - 'off': Camera disabled
 * - 'video': Continuous frames as passive context (no AI response)
 * - 'photo': Single snapshot that triggers AI response
 */
export function useUnifiedCamera(refs: UnifiedCameraRefs): UnifiedCameraState {
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [limitReached, setLimitReached] = useState(false);
  const photoStreamRef = useRef<MediaStream | null>(null);

  const sendVideoFrame = useSendVideoFrame(refs.webrtcDataChannelRef);

  // End usage session API call
  const endUsageSession = useCallback(
    async (seconds: number) => {
      const usageId = refs.videoUsageIdRef.current;
      if (!usageId) return;
      try {
        await csrfFetch('/api/video-vision/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            usageId,
            secondsUsed: seconds,
          }),
        });
      } catch (e) {
        logger.error('[UnifiedCamera] Failed to end session', {
          error: String(e),
        });
      }
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      refs.videoUsageIdRef.current = null;
    },
    [refs],
  );

  const handleAutoStop = useCallback(async () => {
    setCameraMode('off');
    await endUsageSession(refs.videoMaxSecondsRef.current);
  }, [endUsageSession, refs]);

  // Video capture hook for continuous mode
  const capture = useVideoCapture({
    onFrame: sendVideoFrame,
    maxSeconds: refs.videoMaxSecondsRef.current,
    onAutoStop: handleAutoStop,
  });

  // Start video usage session
  const startVideoUsage = useCallback(async (): Promise<boolean> => {
    try {
      const res = await csrfFetch('/api/video-vision/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          voiceSessionId: refs.sessionIdRef.current || 'unknown',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' }));
        const reason = err.error as string;
        if (reason === 'monthly_limit_reached' || reason === 'video_vision_disabled') {
          setLimitReached(true);
        }
        return false;
      }
      const data = await res.json();
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      refs.videoUsageIdRef.current = data.id;

      refs.videoMaxSecondsRef.current = data.maxSeconds;
      return true;
    } catch (e) {
      logger.error('[UnifiedCamera] Failed to start usage', {
        error: String(e),
      });
      return false;
    }
  }, [refs]);

  // Cycle through camera modes: off → video → photo → off
  const cycleCameraMode = useCallback(async () => {
    const currentIndex = MODE_CYCLE.indexOf(cameraMode);
    const nextMode = MODE_CYCLE[(currentIndex + 1) % MODE_CYCLE.length];

    // Stop current mode first
    if (cameraMode === 'video' && capture.isCapturing) {
      capture.stopCapture();
      await endUsageSession(capture.elapsedSeconds);
    } else if (cameraMode === 'photo' && photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((t) => t.stop());
      photoStreamRef.current = null;
    }

    // Start new mode
    if (nextMode === 'video') {
      const allowed = await startVideoUsage();
      if (!allowed) {
        setCameraMode('off');
        return;
      }
      const started = await capture.startCapture();
      if (!started) {
        setCameraMode('off');
        return;
      }
    } else if (nextMode === 'photo') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: CAPTURE_WIDTH },
            height: { ideal: CAPTURE_HEIGHT },
            facingMode: cameraFacing,
          },
        });
        photoStreamRef.current = stream;
      } catch (e) {
        logger.error('[UnifiedCamera] Failed to start photo mode', {
          error: String(e),
        });
        setCameraMode('off');
        return;
      }
    }

    setCameraMode(nextMode);
    logger.info('[UnifiedCamera] Mode changed', {
      from: cameraMode,
      to: nextMode,
    });
  }, [cameraMode, capture, cameraFacing, startVideoUsage, endUsageSession]);

  // Take a single snapshot and send with response.create
  const takeSnapshot = useCallback(async () => {
    const stream = cameraMode === 'video' ? capture.videoStream : photoStreamRef.current;
    if (!stream) {
      logger.warn('[UnifiedCamera] No stream for snapshot');
      return;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = CAPTURE_WIDTH;
      canvas.height = CAPTURE_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1];

      video.pause();
      video.srcObject = null;

      if (!base64 || !refs.webrtcDataChannelRef.current) return;

      // Send image as conversation item
      refs.webrtcDataChannelRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_image',
                image_url: `data:image/jpeg;base64,${base64}`,
              },
            ],
          },
        }),
      );

      // Trigger AI response (unlike video which is passive)
      refs.webrtcDataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));

      logger.info('[UnifiedCamera] Snapshot sent with response.create');
    } catch (e) {
      logger.error('[UnifiedCamera] Snapshot failed', { error: String(e) });
    }
  }, [cameraMode, capture.videoStream, refs]);

  // Toggle camera facing (front/back)
  const toggleCameraFacing = useCallback(() => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);

    // Restart stream with new facing if in photo mode
    if (cameraMode === 'photo' && photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((t) => t.stop());
      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: { ideal: CAPTURE_WIDTH },
            height: { ideal: CAPTURE_HEIGHT },
            facingMode: next,
          },
        })
        .then((stream) => {
          photoStreamRef.current = stream;
        })
        .catch((e) => {
          logger.error('[UnifiedCamera] Camera switch failed', {
            error: String(e),
          });
        });
    }

    logger.info('[UnifiedCamera] Camera facing changed', { facing: next });
  }, [cameraFacing, cameraMode]);

  // Legacy toggleVideo for backward compatibility
  const toggleVideo = useCallback(async () => {
    if (cameraMode === 'video') {
      capture.stopCapture();
      await endUsageSession(capture.elapsedSeconds);
      setCameraMode('off');
    } else if (cameraMode === 'off') {
      const allowed = await startVideoUsage();
      if (!allowed) return;
      const started = await capture.startCapture();
      if (started) setCameraMode('video');
    }
  }, [cameraMode, capture, startVideoUsage, endUsageSession]);

  return {
    cameraMode,
    cameraFacing,
    videoStream: cameraMode === 'video' ? capture.videoStream : photoStreamRef.current,
    videoFramesSent: capture.framesSent,
    videoElapsedSeconds: capture.elapsedSeconds,
    videoMaxSeconds: refs.videoMaxSecondsRef.current,
    videoLimitReached: limitReached,
    cycleCameraMode,
    takeSnapshot,
    toggleCameraFacing,
    // Legacy compatibility
    videoEnabled: cameraMode === 'video',
    toggleVideo,
  };
}
