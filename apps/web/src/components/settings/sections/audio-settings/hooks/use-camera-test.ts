/**
 * Hook for camera testing
 */

import { useState, useRef, useCallback } from 'react';
import toast from '@/components/ui/toast';
import { useCameraErrorMessage } from '@/lib/hooks/use-camera-error-message';
import { requestVideoStream } from '@/lib/native/media-bridge';

export function useCameraTest(preferredCameraId: string | null) {
  const cameraErrorMessage = useCameraErrorMessage('CameraTest');
  const [camTestActive, setCamTestActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  const startCamTest = useCallback(async () => {
    try {
      const stream = await requestVideoStream(
        preferredCameraId ? { deviceId: { ideal: preferredCameraId } } : undefined,
      );
      camStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCamTestActive(true);
    } catch (error) {
      camStreamRef.current?.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
      setCamTestActive(false);
      toast.error(cameraErrorMessage(error));
    }
  }, [preferredCameraId, cameraErrorMessage]);

  const stopCamTest = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
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
