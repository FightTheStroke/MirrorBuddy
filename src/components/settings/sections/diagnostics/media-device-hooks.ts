import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  requestMicrophoneStream,
  requestVideoStream,
  enumerateMediaDevices,
  stopMediaStream,
} from '@/lib/native/media-bridge';

export function useMediaDevices() {
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>('');

  const refreshMicrophones = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await requestMicrophoneStream().then((s) => stopMediaStream(s));
      const devices = await enumerateMediaDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setAvailableMics(mics);
      // Only set default if no selection exists
      setSelectedMicId((prev) => prev || (mics.length > 0 ? mics[0].deviceId : ''));
    } catch (error) {
      logger.error('Error fetching microphones', undefined, error);
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await requestVideoStream().then((s) => stopMediaStream(s));
      const devices = await enumerateMediaDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(cams);
      // Only set default if no selection exists
      setSelectedCamId((prev) => prev || (cams.length > 0 ? cams[0].deviceId : ''));
    } catch (error) {
      logger.error('Error fetching cameras', undefined, error);
    }
  }, []);

  // Initialize devices on mount
  useEffect(() => {
    refreshMicrophones();
    refreshCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    availableMics,
    selectedMicId,
    setSelectedMicId,
    refreshMicrophones,
    availableCameras,
    selectedCamId,
    setSelectedCamId,
    refreshCameras,
  };
}
