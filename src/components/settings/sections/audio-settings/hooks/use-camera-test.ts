/**
 * Hook for camera testing
 */

import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useCameraTest(preferredCameraId: string | null) {
  const [camTestActive, setCamTestActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  const startCamTest = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: preferredCameraId
          ? { deviceId: { ideal: preferredCameraId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCamTestActive(true);
    } catch (error) {
      logger.error('Camera test error', undefined, error);
    }
  }, [preferredCameraId]);

  const stopCamTest = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamTestActive(false);
  }, []);

  return {
    camTestActive,
    videoRef,
    startCamTest,
    stopCamTest,
  };
}
