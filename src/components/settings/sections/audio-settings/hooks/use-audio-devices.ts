/**
 * Hook for managing audio/video devices
 */

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function useAudioDevices() {
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<MediaDeviceInfo[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {
          // Try audio only if video fails
          return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => s.getTracks().forEach(t => t.stop()));
        });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      const cams = devices.filter(d => d.kind === 'videoinput');

      setAvailableMics(mics);
      setAvailableOutputs(outputs);
      setAvailableCameras(cams);
    } catch (error) {
      logger.error('Error fetching devices', { error });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshDevices();
    }, 0);

    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      clearTimeout(timer);
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  return {
    availableMics,
    availableOutputs,
    availableCameras,
    refreshDevices,
  };
}
