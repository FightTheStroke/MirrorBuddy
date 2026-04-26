// ============================================================================
// WebRTC Support Detection
// Detects browser support for WebRTC APIs
// ============================================================================

import { isMediaDevicesAvailable } from '@/lib/native/media-bridge';

/**
 * Checks if the browser supports WebRTC APIs
 * Verifies both RTCPeerConnection and getUserMedia availability
 * @returns true if WebRTC is supported, false otherwise
 */
export function isWebRTCSupported(): boolean {
  // Check if running in browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check for RTCPeerConnection availability
  const hasRTCPeerConnection = !!window.RTCPeerConnection;

  // Check for getUserMedia availability via mediaDevices API
  const hasGetUserMedia = isMediaDevicesAvailable();

  return hasRTCPeerConnection && hasGetUserMedia;
}

/**
 * Checks if RTCPeerConnection is available
 * @returns true if RTCPeerConnection is supported
 */
export function hasRTCPeerConnection(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!window.RTCPeerConnection;
}

/**
 * Checks if getUserMedia is available
 * @returns true if getUserMedia is supported
 */
export function hasGetUserMedia(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return isMediaDevicesAvailable();
}

/**
 * Gets a detailed report of WebRTC support in the browser
 * Useful for debugging and logging
 * @returns Object with support status for each WebRTC API
 */
export function getWebRTCSupportReport(): {
  webrtcSupported: boolean;
  rtcPeerConnection: boolean;
  getUserMedia: boolean;
  mediaDevices: boolean;
} {
  const hasNavigator = typeof navigator !== 'undefined';
  return {
    webrtcSupported: isWebRTCSupported(),
    rtcPeerConnection: hasRTCPeerConnection(),
    getUserMedia: hasGetUserMedia(),
    mediaDevices: hasNavigator && isMediaDevicesAvailable(),
  };
}
