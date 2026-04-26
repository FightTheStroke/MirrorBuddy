// ============================================================================
// PERMISSIONS HOOK
// Handles microphone and camera permissions with caching and better UX
// Uses media-bridge for native platform support
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  checkCameraPermission as checkCameraNative,
  checkMicrophonePermission as checkMicrophoneNative,
  requestCameraPermission as requestCameraNative,
  isNativePlatform,
  requestMicrophoneStream,
  requestVideoStream,
  stopMediaStream,
} from '@/lib/native/media-bridge';

type PermissionName = 'microphone' | 'camera';
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

interface PermissionsState {
  microphone: PermissionState;
  camera: PermissionState;
}

interface UsePermissionsReturn {
  permissions: PermissionsState;
  requestMicrophone: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;
  isLoading: boolean;
}

// Cache key for localStorage
const PERMISSIONS_CACHE_KEY = 'mirrorbuddy-permissions-cache';

// Get cached permissions from localStorage
function getCachedPermissions(): Partial<PermissionsState> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

// Save permissions to localStorage
function setCachedPermissions(permissions: Partial<PermissionsState>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getCachedPermissions();
    localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({ ...current, ...permissions }));
  } catch {
    // Ignore storage errors
  }
}

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<PermissionsState>({
    microphone: 'unknown',
    camera: 'unknown',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check permission state using Permissions API or media bridge
  const checkPermissionState = useCallback(
    async (name: PermissionName): Promise<PermissionState> => {
      // Use media bridge on native platforms
      if (isNativePlatform()) {
        if (name === 'camera') {
          return checkCameraNative();
        } else {
          return checkMicrophoneNative();
        }
      }

      // Web: use Permissions API
      if (!navigator.permissions) {
        // Fallback to cached value or 'prompt'
        const cached = getCachedPermissions();
        return cached[name] || 'prompt';
      }

      try {
        // Map our names to browser permission names
        const browserName = name === 'microphone' ? 'microphone' : 'camera';
        const status = await navigator.permissions.query({
          name: browserName as PermissionName,
        });
        return status.state as PermissionState;
      } catch {
        // Permissions API might not support this permission
        const cached = getCachedPermissions();
        return cached[name] || 'prompt';
      }
    },
    [],
  );

  // Check all permissions
  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [micState, camState] = await Promise.all([
        checkPermissionState('microphone'),
        checkPermissionState('camera'),
      ]);

      const newPermissions = {
        microphone: micState,
        camera: camState,
      };

      setPermissions(newPermissions);
      setCachedPermissions(newPermissions);
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissionState]);

  // Request microphone permission
  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await requestMicrophoneStream();
      // Stop all tracks immediately - we just needed to request permission
      stopMediaStream(stream);

      setPermissions((prev) => ({ ...prev, microphone: 'granted' }));
      setCachedPermissions({ microphone: 'granted' });
      return true;
    } catch (error) {
      const state =
        error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'prompt';

      setPermissions((prev) => ({ ...prev, microphone: state }));
      setCachedPermissions({ microphone: state });
      return false;
    }
  }, []);

  // Request camera permission
  const requestCamera = useCallback(async (): Promise<boolean> => {
    try {
      // Use media bridge on native platforms
      if (isNativePlatform()) {
        const state = await requestCameraNative();
        const granted = state === 'granted';
        setPermissions((prev) => ({ ...prev, camera: state }));
        setCachedPermissions({ camera: state });
        return granted;
      }

      // Web: use getUserMedia
      const stream = await requestVideoStream();
      // Stop all tracks immediately - we just needed to request permission
      stopMediaStream(stream);

      setPermissions((prev) => ({ ...prev, camera: 'granted' }));
      setCachedPermissions({ camera: 'granted' });
      return true;
    } catch (error) {
      const state =
        error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'prompt';

      setPermissions((prev) => ({ ...prev, camera: state }));
      setCachedPermissions({ camera: state });
      return false;
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Listen for permission changes (when supported)
  useEffect(() => {
    if (!navigator.permissions) return;

    const setupListener = async (name: PermissionName) => {
      try {
        const browserName = name === 'microphone' ? 'microphone' : 'camera';
        const status = await navigator.permissions.query({
          name: browserName as PermissionName,
        });

        const handleChange = () => {
          setPermissions((prev) => ({ ...prev, [name]: status.state }));
          setCachedPermissions({ [name]: status.state });
        };

        status.addEventListener('change', handleChange);
        return () => status.removeEventListener('change', handleChange);
      } catch {
        return undefined;
      }
    };

    const cleanups: Array<(() => void) | undefined> = [];

    Promise.all([setupListener('microphone'), setupListener('camera')]).then((results) => {
      cleanups.push(...results);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, []);

  return {
    permissions,
    requestMicrophone,
    requestCamera,
    checkPermissions,
    isLoading,
  };
}
