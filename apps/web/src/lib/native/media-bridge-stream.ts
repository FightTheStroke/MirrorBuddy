/**
 * Media Bridge - Video Stream & Device Enumeration
 *
 * Split from media-bridge.ts to maintain <250 lines per file.
 * Provides video stream, combined media stream, and device enumeration.
 */

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { getPlatform } from './media-bridge';
import type { MicrophoneConstraints } from './media-bridge';
import { addBreadcrumb } from '@/lib/sentry';
import { getCameraAccessError } from './camera-access-error';

function reportStreamFailure(message: string, error: unknown): void {
  const condition = getCameraAccessError(error);
  if (condition) {
    addBreadcrumb('media-bridge', message, { condition: condition.key });
  } else {
    logger.error(message, undefined, error);
  }
}

// ============================================================================
// Video Stream Access
// ============================================================================

export interface VideoConstraints {
  facingMode?: 'user' | 'environment';
  width?: number | { ideal?: number; exact?: number };
  height?: number | { ideal?: number; exact?: number };
  frameRate?: number;
  deviceId?: string | { exact?: string; ideal?: string };
}

/**
 * Request video stream (camera preview)
 * Uses standard getUserMedia API on all platforms
 */
export async function requestVideoStream(constraints?: VideoConstraints): Promise<MediaStream> {
  try {
    if (!isMediaDevicesAvailable()) {
      throw new DOMException('Camera API unavailable', 'NotSupportedError');
    }
    const videoConstraints =
      constraints && Object.keys(constraints).length > 0 ? constraints : true;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
    logger.debug('[MediaBridge] Video stream acquired', {
      tracks: stream.getVideoTracks().length,
      platform: getPlatform(),
    });
    return stream;
  } catch (error) {
    reportStreamFailure('[MediaBridge] Video stream error', error);
    throw error;
  }
}

/**
 * Request combined audio+video stream
 */
export async function requestMediaStream(
  video: VideoConstraints | boolean = true,
  audio: MicrophoneConstraints | boolean = true,
): Promise<MediaStream> {
  try {
    if (!isMediaDevicesAvailable()) {
      throw new DOMException('Camera API unavailable', 'NotSupportedError');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    logger.debug('[MediaBridge] Media stream acquired', {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      platform: getPlatform(),
    });
    return stream;
  } catch (error) {
    reportStreamFailure('[MediaBridge] Media stream error', error);
    throw error;
  }
}

/**
 * Stop all tracks in a MediaStream
 */
export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
  logger.debug('[MediaBridge] Media stream stopped');
}

// ============================================================================
// Device Enumeration
// ============================================================================

/**
 * Enumerate available media devices
 */
export async function enumerateMediaDevices(): Promise<MediaDeviceInfo[]> {
  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch (error) {
    logger.error('[MediaBridge] Device enumeration error', undefined, error);
    return [];
  }
}

/**
 * Check if getUserMedia API is available
 */
export function isMediaDevicesAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator?.mediaDevices?.getUserMedia === 'function'
  );
}

/**
 * Check if device enumeration is available
 */
export function isEnumerateDevicesAvailable(): boolean {
  return !!navigator?.mediaDevices?.enumerateDevices;
}

/**
 * Subscribe to device change events.
 * Returns an unsubscribe function for cleanup.
 */
export function onDeviceChange(callback: () => void): () => void {
  navigator.mediaDevices.addEventListener('devicechange', callback);
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', callback);
  };
}
