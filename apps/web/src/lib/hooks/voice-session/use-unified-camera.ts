'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { requestVideoStream } from '@/lib/native/media-bridge';
import { useCameraErrorMessage } from '@/lib/hooks/use-camera-error-message';
import toast from '@/components/ui/toast';
import { useVideoCapture } from './video-capture';
import { useSendVideoFrame } from './actions';
import {
  CAPTURE_WIDTH,
  CAPTURE_HEIGHT,
  sendCameraSnapshot,
} from '@/lib/hooks/voice-session/camera-snapshot';
import { useCameraUsage, type CameraUsageRefs } from '@/lib/hooks/voice-session/use-camera-usage';
import type { CameraMode } from '@/types/voice';

const MODE_CYCLE: CameraMode[] = ['off', 'video', 'photo'];

interface UnifiedCameraRefs extends CameraUsageRefs {
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
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

export function useUnifiedCamera(refs: UnifiedCameraRefs): UnifiedCameraState {
  const cameraErrorMessage = useCameraErrorMessage('UnifiedCamera');
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const { startVideoUsage, endUsageSession, limitReached } = useCameraUsage(refs);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(false);
  const transitionPendingRef = useRef(false);
  const runTransition = useCallback(async (change: () => Promise<void>) => {
    if (!isMountedRef.current || transitionPendingRef.current) return;
    transitionPendingRef.current = true;
    try {
      await change();
    } catch (error) {
      logger.error('[UnifiedCamera] Camera transition failed', { error: String(error) });
      throw error;
    } finally {
      transitionPendingRef.current = false;
    }
  }, []);
  const photoGenerationRef = useRef(0);
  const stopPhotoStream = useCallback(() => {
    photoGenerationRef.current++;
    photoStreamRef.current?.getTracks().forEach((track) => track.stop());
    photoStreamRef.current = null;
  }, []);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPhotoStream();
    };
  }, [stopPhotoStream]);

  const sendVideoFrame = useSendVideoFrame(refs.webrtcDataChannelRef);

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

  const usageCleanupRef = useRef({ endUsageSession, seconds: capture.elapsedSeconds });
  useEffect(() => {
    usageCleanupRef.current = { endUsageSession, seconds: capture.elapsedSeconds };
  }, [endUsageSession, capture.elapsedSeconds]);
  useEffect(
    () => () => {
      const { endUsageSession: end, seconds } = usageCleanupRef.current;
      void end(seconds);
    },
    [],
  );

  // Cycle through camera modes: off → video → photo → off
  const changeCameraMode = useCallback(async () => {
    const currentIndex = MODE_CYCLE.indexOf(cameraMode);
    const nextMode = MODE_CYCLE[(currentIndex + 1) % MODE_CYCLE.length];

    // Stop current mode first
    if (cameraMode === 'video' && capture.isCapturing) {
      capture.stopCapture();
      await endUsageSession(capture.elapsedSeconds);
    } else if (cameraMode === 'photo') {
      stopPhotoStream();
    }

    // Start new mode
    if (nextMode === 'video') {
      const allowed = await startVideoUsage();
      if (!allowed) {
        setCameraMode('off');
        return;
      }
      if (!isMountedRef.current) {
        await endUsageSession(0);
        return;
      }
      const started = await capture.startCapture();
      if (!isMountedRef.current) {
        if (started) capture.stopCapture();
        return;
      }
      if (!started) {
        await endUsageSession(0);
        setCameraMode('off');
        return;
      }
    } else if (nextMode === 'photo') {
      const generation = ++photoGenerationRef.current;
      try {
        const stream = await requestVideoStream({
          width: { ideal: CAPTURE_WIDTH },
          height: { ideal: CAPTURE_HEIGHT },
          facingMode: cameraFacing,
        });
        if (!isMountedRef.current || generation !== photoGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        photoStreamRef.current = stream;
      } catch (e) {
        toast.error(cameraErrorMessage(e));
        setCameraMode('off');
        return;
      }
    }

    setCameraMode(nextMode);
    logger.info('[UnifiedCamera] Mode changed', {
      from: cameraMode,
      to: nextMode,
    });
  }, [
    cameraMode,
    capture,
    cameraFacing,
    startVideoUsage,
    endUsageSession,
    stopPhotoStream,
    cameraErrorMessage,
  ]);

  // Take a single snapshot and send with response.create
  const takeSnapshot = useCallback(async () => {
    const stream = cameraMode === 'video' ? capture.videoStream : photoStreamRef.current;
    await sendCameraSnapshot(stream, refs.webrtcDataChannelRef, () => isMountedRef.current);
  }, [cameraMode, capture.videoStream, refs]);

  // Toggle camera facing (front/back)
  const toggleCameraFacing = useCallback(() => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);

    // Restart stream with new facing if in photo mode
    if (cameraMode === 'photo') {
      stopPhotoStream();
      const generation = photoGenerationRef.current;
      requestVideoStream({
        width: { ideal: CAPTURE_WIDTH },
        height: { ideal: CAPTURE_HEIGHT },
        facingMode: next,
      })
        .then((stream) => {
          if (!isMountedRef.current || generation !== photoGenerationRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          photoStreamRef.current = stream;
        })
        .catch((e) => {
          if (!isMountedRef.current || generation !== photoGenerationRef.current) return;
          setCameraMode('off');
          toast.error(cameraErrorMessage(e));
        });
    }

    logger.info('[UnifiedCamera] Camera facing changed', { facing: next });
  }, [cameraFacing, cameraMode, stopPhotoStream, cameraErrorMessage]);

  // Legacy toggleVideo for backward compatibility
  const changeVideo = useCallback(async () => {
    if (cameraMode === 'video') {
      capture.stopCapture();
      await endUsageSession(capture.elapsedSeconds);
      setCameraMode('off');
    } else if (cameraMode === 'off') {
      const allowed = await startVideoUsage();
      if (!allowed) return;
      if (!isMountedRef.current) {
        await endUsageSession(0);
        return;
      }
      const started = await capture.startCapture();
      if (!isMountedRef.current) {
        if (started) capture.stopCapture();
        return;
      }
      if (started) setCameraMode('video');
      else await endUsageSession(0);
    }
  }, [cameraMode, capture, startVideoUsage, endUsageSession]);

  const cycleCameraMode = useCallback(
    () => runTransition(changeCameraMode),
    [runTransition, changeCameraMode],
  );
  const toggleVideo = useCallback(() => runTransition(changeVideo), [runTransition, changeVideo]);

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
