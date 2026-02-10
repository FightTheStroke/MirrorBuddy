// ============================================================================
// VOICE ERROR LOGGER
// Comprehensive client-side voice diagnostics logging
// Captures WebRTC state, microphone permissions, audio context, device info
// ============================================================================

import { logger } from '@/lib/logger';

/**
 * Device and browser information for diagnostics
 */
export function getDeviceInfo(): Record<string, string | number | boolean> {
  // SSR guard
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ssr: true };
  }

  try {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/u.test(ua);
    const isSafari = /Safari/u.test(ua) && !/Chrome/u.test(ua);
    const isChrome = /Chrome/u.test(ua);
    const isFirefox = /Firefox/u.test(ua);

    // iOS version detection
    let iosVersion: string | null = null;
    if (isIOS) {
      // eslint-disable-next-line security/detect-unsafe-regex -- Safe: matches "OS 17_1" pattern only
      const match = ua.match(/OS (\d+)_?(\d+)?/u);
      if (match) {
        iosVersion = `${match[1]}.${match[2] || '0'}`;
      }
    }

    const navWithDevice = navigator as Navigator & {
      deviceMemory?: number;
    };

    return {
      userAgent: ua,
      isIOS,
      isSafari,
      isChrome,
      isFirefox,
      iosVersion: iosVersion || 'unknown',
      platform: navigator.platform || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navWithDevice.deviceMemory || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      language: navigator.language || 'unknown',
      onLine: navigator.onLine,
    };
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to get device info', {}, error);
    return { error: 'Failed to get device info' };
  }
}

/**
 * WebRTC API support detection
 */
export function getWebRTCCapabilities(): Record<string, boolean> {
  // SSR guard
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      RTCPeerConnection: false,
      getUserMedia: false,
      mediaDevices: false,
      RTCDataChannel: false,
      AudioContext: false,
      WebRTC: false,
    };
  }

  try {
    const windowWithWebkit = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    return {
      RTCPeerConnection: !!window.RTCPeerConnection,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      mediaDevices: !!navigator.mediaDevices,
      RTCDataChannel: !!window.RTCDataChannel,
      AudioContext: !!window.AudioContext || !!windowWithWebkit.webkitAudioContext,
      WebRTC: !!window.RTCPeerConnection && !!navigator.mediaDevices?.getUserMedia,
    };
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to check WebRTC capabilities', {}, error);
    return { error: true };
  }
}

// Diagnostics functions moved to voice-diagnostics.ts to maintain file size
export {
  getAudioContextInfo,
  getAudioDevices,
  checkMicrophonePermissions,
  logVoiceDiagnosticsReport,
  logMediaStreamTracks,
} from './voice-diagnostics';

/**
 * Log WebRTC connection state changes
 */
export function logConnectionStateChange(state: RTCPeerConnectionState, maestroId: string): void {
  const context = {
    component: 'voice-webrtc',
    connectionState: state,
    maestroId,
    timestamp: new Date().toISOString(),
  };

  if (state === 'connected') {
    logger.info('[VoiceSession] WebRTC connection established', context);
  } else if (state === 'connecting') {
    logger.debug('[VoiceSession] WebRTC connecting...', context);
  } else if (state === 'disconnected') {
    logger.warn('[VoiceSession] WebRTC disconnected', context);
  } else if (state === 'failed') {
    logger.error('[VoiceSession] WebRTC connection failed', context);
  } else if (state === 'closed') {
    logger.info('[VoiceSession] WebRTC connection closed', context);
  } else if (state === 'new') {
    logger.debug('[VoiceSession] WebRTC peer connection created', context);
  }
}

/**
 * Log ICE connection state changes (more granular than peer connection state)
 */
export function logICEConnectionStateChange(state: RTCIceConnectionState, maestroId: string): void {
  const context = {
    component: 'voice-webrtc-ice',
    iceConnectionState: state,
    maestroId,
    timestamp: new Date().toISOString(),
  };

  if (state === 'connected' || state === 'completed') {
    logger.info('[VoiceSession] ICE connection successful', context);
  } else if (state === 'checking') {
    logger.debug('[VoiceSession] ICE checking candidates...', context);
  } else if (state === 'disconnected') {
    logger.warn('[VoiceSession] ICE disconnected', context);
  } else if (state === 'failed') {
    logger.error('[VoiceSession] ICE connection failed', context);
  }
}

/**
 * Log microphone permission request and result
 */
export function logMicrophonePermissionRequest(
  result: 'granted' | 'denied' | 'error',
  details?: Record<string, unknown>,
): void {
  const context = {
    component: 'voice-microphone',
    permissionResult: result,
    timestamp: new Date().toISOString(),
    ...details,
  };

  if (result === 'granted') {
    logger.info('[VoiceSession] Microphone permission granted', context);
  } else if (result === 'denied') {
    logger.warn('[VoiceSession] Microphone permission denied by user', context);
  } else if (result === 'error') {
    logger.error('[VoiceSession] Microphone permission request error', context);
  }
}

/**
 * Log audio context state (especially important on iOS where it starts suspended)
 */
export function logAudioContextState(
  state: AudioContextState,
  details?: Record<string, unknown>,
): void {
  const context = {
    component: 'voice-audio-context',
    contextState: state,
    timestamp: new Date().toISOString(),
    ...details,
  };

  if (state === 'running') {
    logger.debug('[VoiceSession] AudioContext running', context);
  } else if (state === 'suspended') {
    logger.info(
      '[VoiceSession] AudioContext suspended (normal on iOS before user gesture)',
      context,
    );
  } else if (state === 'closed') {
    logger.info('[VoiceSession] AudioContext closed', context);
  }
}

/**
 * Log data channel state changes
 */
export function logDataChannelStateChange(state: RTCDataChannelState, label: string): void {
  const context = {
    component: 'voice-data-channel',
    channelState: state,
    channelLabel: label,
    timestamp: new Date().toISOString(),
  };

  if (state === 'open') {
    logger.info('[VoiceSession] Data channel opened', context);
  } else if (state === 'connecting') {
    logger.debug('[VoiceSession] Data channel connecting...', context);
  } else if (state === 'closing') {
    logger.debug('[VoiceSession] Data channel closing...', context);
  } else if (state === 'closed') {
    logger.info('[VoiceSession] Data channel closed', context);
  }
}

/**
 * Log WebRTC offer/answer SDP exchange details
 */
export function logSDPExchange(direction: 'offer' | 'answer', sdpLength: number): void {
  logger.debug(`[VoiceSession] SDP ${direction} created`, {
    component: 'voice-webrtc-sdp',
    direction,
    sdpLength,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log voice connection error with full context
 */
export function logVoiceError(
  errorName: string,
  errorMessage: string,
  context?: Record<string, unknown>,
): void {
  const fullContext = {
    component: 'voice-error',
    errorName,
    errorMessage,
    timestamp: new Date().toISOString(),
    ...context,
  };

  logger.error(`[VoiceSession] ${errorName}: ${errorMessage}`, fullContext);
}

/**
 * Log network quality indicators (connection timing, latency)
 */
export function logNetworkQuality(metrics: {
  connectionTime?: number;
  latency?: number;
  packetLoss?: number;
  jitter?: number;
}): void {
  logger.debug('[VoiceSession] Network quality metrics', {
    component: 'voice-network',
    ...metrics,
    timestamp: new Date().toISOString(),
  });
}
