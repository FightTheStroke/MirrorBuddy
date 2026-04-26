// ============================================================================
// WebRTC Browser Support Detection
// ============================================================================

'use client';

import { isMediaDevicesAvailable } from '@/lib/native/media-bridge';

/**
 * Check if browser supports WebRTC including getUserMedia.
 * Without media devices, voice sessions will fail with NotSupportedError.
 */
export function isWebRTCSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  const hasRTC = !!(
    w.RTCPeerConnection ||
    w.webkitRTCPeerConnection ||
    w.mozRTCPeerConnection ||
    w.msRTCPeerConnection
  );
  return hasRTC && isMediaDevicesAvailable();
}
