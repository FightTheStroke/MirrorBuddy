// ============================================================================
// WebRTC Browser Support Detection
// ============================================================================

'use client';

/**
 * Check if browser supports WebRTC
 */
export function isWebRTCSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(
    w.RTCPeerConnection ||
    w.webkitRTCPeerConnection ||
    w.mozRTCPeerConnection ||
    w.msRTCPeerConnection
  );
}
