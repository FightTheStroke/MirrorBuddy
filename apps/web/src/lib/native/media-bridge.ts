/**
 * Media Bridge - Capacitor Camera/Microphone Abstraction
 *
 * Provides unified interface for camera and microphone access:
 * - Native: Uses Capacitor Camera plugin (@capacitor/camera)
 * - Web: Falls back to browser APIs (file input, getUserMedia)
 *
 * Note: Capacitor doesn't have a separate microphone plugin.
 * Microphone access uses standard getUserMedia API on all platforms.
 */

'use client';

import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { clientLogger as logger } from '@/lib/logger/client';
export { capturePhoto, type CapturePhotoOptions, type PhotoResult } from './media-bridge-photo';

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Check if running on native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get current platform name
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

// ============================================================================
// Microphone Stream Access
// ============================================================================

export interface MicrophoneConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  deviceId?: string | { exact?: string; ideal?: string };
}

/**
 * Request microphone access and return MediaStream
 * Uses standard getUserMedia API on all platforms
 * (Capacitor doesn't have a separate microphone plugin)
 */
export async function requestMicrophoneStream(
  constraints?: MicrophoneConstraints,
): Promise<MediaStream> {
  const getErrorName = (error: unknown): string =>
    error instanceof Error ? error.name : 'UnknownError';
  const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);
  const isCompatibilityError = (error: unknown): boolean =>
    ['NotSupportedError', 'OverconstrainedError'].includes(getErrorName(error));
  const isExpectedAccessError = (error: unknown): boolean =>
    ['NotSupportedError', 'NotAllowedError', 'NotFoundError', 'OverconstrainedError'].includes(
      getErrorName(error),
    );

  const audioConstraints = constraints && Object.keys(constraints).length > 0 ? constraints : true;
  const requestAudio = (audio: MicrophoneConstraints | boolean) =>
    navigator.mediaDevices.getUserMedia({ audio, video: false });

  try {
    const stream = await requestAudio(audioConstraints);

    logger.debug('[MediaBridge] Microphone stream acquired', {
      tracks: stream.getAudioTracks().length,
      platform: getPlatform(),
    });

    return stream;
  } catch (error) {
    if (audioConstraints !== true && isCompatibilityError(error)) {
      logger.warn('[MediaBridge] Retrying microphone stream with default constraints', {
        component: 'media-bridge',
        errorName: getErrorName(error),
      });
      try {
        const fallbackStream = await requestAudio(true);
        logger.info('[MediaBridge] Microphone stream acquired with fallback constraints', {
          tracks: fallbackStream.getAudioTracks().length,
          platform: getPlatform(),
        });
        return fallbackStream;
      } catch (fallbackError) {
        if (isExpectedAccessError(fallbackError)) {
          // Expected user action (denied/dismissed permission). Log at info so it
          // doesn't surface as Sentry noise (MIRRORBUDDY-1S).
          logger.info('[MediaBridge] Microphone access unavailable after fallback', {
            component: 'media-bridge',
            errorName: getErrorName(fallbackError),
            errorMessage: getErrorMessage(fallbackError),
          });
        } else {
          logger.error(
            '[MediaBridge] Microphone access error after fallback',
            undefined,
            fallbackError,
          );
        }
        throw fallbackError;
      }
    }

    if (isExpectedAccessError(error)) {
      // Expected user action (denied/dismissed permission). Log at info so it
      // doesn't surface as Sentry noise (MIRRORBUDDY-1S).
      logger.info('[MediaBridge] Microphone access unavailable', {
        component: 'media-bridge',
        errorName: getErrorName(error),
        errorMessage: getErrorMessage(error),
      });
    } else {
      logger.error('[MediaBridge] Microphone access error', undefined, error);
    }
    throw error;
  }
}

/**
 * Stop microphone stream and release resources
 */
export function stopMicrophoneStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
  logger.debug('[MediaBridge] Microphone stream stopped');
}

// ============================================================================
// Permission Checks
// ============================================================================

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<PermissionStatus> {
  if (isNativePlatform()) {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      logger.error('[MediaBridge] Camera permission check error', undefined, error);
      return 'denied';
    }
  } else {
    // Web: check if mediaDevices API is available
    if (navigator.mediaDevices) {
      return 'prompt'; // Web doesn't expose permission state before requesting
    }
    return 'denied';
  }
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionStatus> {
  try {
    // Try Permissions API (not supported on all platforms)
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return result.state as PermissionStatus;
    }
  } catch {
    // Permissions API not available or query failed
  }

  // Fallback: assume prompt state if API available
  return navigator.mediaDevices ? 'prompt' : 'denied';
}

/**
 * Request camera permissions (native only)
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
  if (isNativePlatform()) {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      logger.error('[MediaBridge] Camera permission request error', undefined, error);
      return 'denied';
    }
  }

  // Web: permissions requested on getUserMedia call
  return checkCameraPermission();
}

// Re-exports from media-bridge-stream.ts (video, device enumeration)
export {
  requestVideoStream,
  requestMediaStream,
  stopMediaStream,
  enumerateMediaDevices,
  isMediaDevicesAvailable,
  isEnumerateDevicesAvailable,
  onDeviceChange,
} from './media-bridge-stream';
export type { VideoConstraints } from './media-bridge-stream';
