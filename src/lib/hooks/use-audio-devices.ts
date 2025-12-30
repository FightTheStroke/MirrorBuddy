// ============================================================================
// USE AUDIO DEVICES HOOK
// Enumerates and manages audio/video input/output devices
// Used by settings page and voice session for device selection
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

interface UseAudioDevicesReturn {
  // Device lists
  microphones: AudioDevice[];
  speakers: AudioDevice[];
  cameras: AudioDevice[];
  // State
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  // Actions
  refresh: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for enumerating audio/video devices.
 *
 * IMPORTANT: Device labels are only available AFTER getUserMedia permission is granted.
 * Before permission, labels are empty strings.
 *
 * Usage:
 * ```tsx
 * const { microphones, speakers, cameras, requestPermission, hasPermission } = useAudioDevices();
 *
 * // Request permission to get device labels
 * if (!hasPermission) {
 *   await requestPermission();
 * }
 * ```
 */
export function useAudioDevices(): UseAudioDevicesReturn {
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [cameras, setCameras] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter and map devices by kind
      const mics = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microfono ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as 'audioinput',
        }));

      const spks = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Altoparlante ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as 'audiooutput',
        }));

      const cams = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Webcam ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as 'videoinput',
        }));

      setMicrophones(mics);
      setSpeakers(spks);
      setCameras(cams);

      // Check if we have permission (labels are populated)
      const hasLabels = devices.some((d) => d.label && d.label.length > 0);
      setHasPermission(hasLabels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enumerate devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      // Request both audio and video to get all device labels
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      // Re-enumerate to get labels
      await enumerateDevices();
      return true;
    } catch (_err) {
      // Try audio only if video fails
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
        setHasPermission(true);
        await enumerateDevices();
        return true;
      } catch (_audioErr) {
        setError('Permesso negato. Abilita microfono/camera nelle impostazioni del browser.');
        return false;
      }
    }
  }, [enumerateDevices]);

  // Initial enumeration on mount
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Listen for device changes (plugging/unplugging)
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  return {
    microphones,
    speakers,
    cameras,
    isLoading,
    error,
    hasPermission,
    refresh: enumerateDevices,
    requestPermission,
  };
}
