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
  try {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    const isFirefox = /Firefox/.test(ua);

    // iOS version detection
    let iosVersion = null;
    if (isIOS) {
      const match = ua.match(/OS (\d+)_?(\d+)?/);
      if (match) {
        iosVersion = `${match[1]}.${match[2] || '0'}`;
      }
    }

    return {
      userAgent: ua,
      isIOS,
      isSafari,
      isChrome,
      isFirefox,
      iosVersion: iosVersion || 'unknown',
      platform: navigator.platform || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
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
  try {
    return {
      RTCPeerConnection: !!window.RTCPeerConnection,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      mediaDevices: !!navigator.mediaDevices,
      RTCDataChannel: !!window.RTCDataChannel,
      AudioContext: !!window.AudioContext || !!(window as any).webkitAudioContext,
      WebRTC: !!window.RTCPeerConnection && !!navigator.mediaDevices?.getUserMedia,
    };
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to check WebRTC capabilities', {}, error);
    return { error: true };
  }
}

/**
 * Check microphone permissions status
 */
export async function checkMicrophonePermissions(): Promise<
  Record<string, string | boolean | null>
> {
  try {
    if (!navigator.permissions?.query) {
      return {
        permissionsAPI: false,
        status: 'Permissions API not supported',
      };
    }

    const permissionStatus = await navigator.permissions.query({
      name: 'microphone' as any,
    });

    return {
      permissionsAPI: true,
      status: permissionStatus.state, // 'granted', 'denied', 'prompt'
      canTry: permissionStatus.state !== 'denied',
    };
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to check microphone permissions', {}, error);
    return {
      permissionsAPI: false,
      status: 'Error checking permissions',
      error: String(error),
    };
  }
}

/**
 * Probe audio context state and audio device availability
 */
export function getAudioContextInfo(): Record<string, string | number | boolean | null> {
  try {
    // Try to create a test context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return {
        audioContextAvailable: false,
        status: 'AudioContext not available',
      };
    }

    const testContext = new AudioContextClass();
    const info = {
      audioContextAvailable: true,
      state: testContext.state, // 'suspended', 'running', 'closed'
      sampleRate: testContext.sampleRate,
      baseLatency: testContext.baseLatency,
      outputLatency: (testContext as any).outputLatency || 'unknown',
      maxChannelCount: (testContext as any).maxChannelCount || 'unknown',
      destinationChannels: testContext.destination?.maxChannelCount || 'unknown',
    };

    // Attempt to resume if suspended (especially on iOS)
    if (testContext.state === 'suspended') {
      testContext.resume().catch(() => {
        // Ignore resume errors during diagnostics
      });
    }

    testContext.close();
    return info;
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to get audio context info', {}, error);
    return {
      audioContextAvailable: false,
      error: String(error),
    };
  }
}

/**
 * Probe available audio input/output devices
 */
export async function getAudioDevices(): Promise<
  Record<string, number | Record<string, string>[] | string>
> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return {
        available: false,
        status: 'enumerateDevices not available',
      };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

    return {
      available: true,
      audioInputCount: audioInputs.length,
      audioOutputCount: audioOutputs.length,
      audioInputs: audioInputs.map(d => ({
        deviceId: d.deviceId || 'unknown',
        label: d.label || 'Microphone',
      })),
      audioOutputs: audioOutputs.map(d => ({
        deviceId: d.deviceId || 'unknown',
        label: d.label || 'Speaker',
      })),
    };
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to enumerate audio devices', {}, error);
    return {
      available: false,
      error: String(error),
    };
  }
}

/**
 * Log WebRTC connection state changes
 */
export function logConnectionStateChange(
  state: RTCPeerConnectionState,
  maestroId: string,
): void {
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
export function logICEConnectionStateChange(
  state: RTCIceConnectionState,
  maestroId: string,
): void {
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
    logger.warn('[VoiceSession] AudioContext suspended (may be normal on iOS)', context);
  } else if (state === 'closed') {
    logger.info('[VoiceSession] AudioContext closed', context);
  }
}

/**
 * Log data channel state changes
 */
export function logDataChannelStateChange(
  state: RTCDataChannelState,
  label: string,
): void {
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
 * Log comprehensive voice connection diagnostics report
 */
export async function logVoiceDiagnosticsReport(): Promise<void> {
  try {
    const deviceInfo = getDeviceInfo();
    const webrtcCaps = getWebRTCCapabilities();
    const audioContextInfo = getAudioContextInfo();
    const audioDevices = await getAudioDevices();
    const micPerms = await checkMicrophonePermissions();

    const report = {
      timestamp: new Date().toISOString(),
      component: 'voice-diagnostics',
      deviceInfo,
      webrtcCapabilities: webrtcCaps,
      audioContextInfo,
      audioDevices,
      microphonePermissions: micPerms,
    };

    logger.info('[VoiceSession] Diagnostics Report', report);

    // Also log to console for immediate visibility during debugging
    if (process.env.NODE_ENV !== 'production') {
      console.group('🎤 Voice Diagnostics Report');
      console.table(deviceInfo);
      console.table(webrtcCaps);
      console.table(audioContextInfo);
      console.log('Audio Devices:', audioDevices);
      console.log('Microphone Permissions:', micPerms);
      console.groupEnd();
    }
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to generate diagnostics report', {}, error);
  }
}

/**
 * Log media stream track info
 */
export function logMediaStreamTracks(
  stream: MediaStream,
  label: string = 'MediaStream',
): void {
  try {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    const context = {
      component: 'voice-media-stream',
      streamLabel: label,
      audioTrackCount: audioTracks.length,
      videoTrackCount: videoTracks.length,
      audioTracks: audioTracks.map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label,
      })),
      videoTracks: videoTracks.map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label,
      })),
      timestamp: new Date().toISOString(),
    };

    logger.debug('[VoiceSession] MediaStream tracks', context);
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to log media stream tracks', {}, error);
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
