// ============================================================================
// VOICE DIAGNOSTICS
// Comprehensive voice connection diagnostics and device probing
// ============================================================================

import { logger } from '@/lib/logger';
import { isEnumerateDevicesAvailable, enumerateMediaDevices } from '@/lib/native/media-bridge';
import { getDeviceInfo, getWebRTCCapabilities } from './voice-error-logger';

/**
 * Probe audio context state and audio device availability
 */
export function getAudioContextInfo(): Record<string, string | number | boolean | null> {
  try {
    // Try to create a test context
    const windowWithWebkit = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext;
    if (!AudioContextClass) {
      return {
        audioContextAvailable: false,
        status: 'AudioContext not available',
      };
    }

    const testContext = new AudioContextClass();
    const contextWithExtended = testContext as AudioContext & {
      outputLatency?: number;
      maxChannelCount?: number;
    };
    const info = {
      audioContextAvailable: true,
      state: testContext.state, // 'suspended', 'running', 'closed'
      sampleRate: testContext.sampleRate,
      baseLatency: testContext.baseLatency,
      outputLatency: contextWithExtended.outputLatency || 'unknown',
      maxChannelCount: contextWithExtended.maxChannelCount || 'unknown',
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
export async function getAudioDevices(): Promise<Record<string, unknown>> {
  try {
    if (!isEnumerateDevicesAvailable()) {
      return {
        available: false,
        status: 'enumerateDevices not available',
      };
    }

    const devices = await enumerateMediaDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');
    const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

    return {
      available: true,
      audioInputCount: audioInputs.length,
      audioOutputCount: audioOutputs.length,
      audioInputs: audioInputs.map((d) => ({
        deviceId: d.deviceId || 'unknown',
        label: d.label || 'Microphone',
      })),
      audioOutputs: audioOutputs.map((d) => ({
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
      name: 'microphone' as PermissionName,
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
      logger.debug('🎤 Voice Diagnostics Report', {
        deviceInfo,
        webrtcCaps,
        audioContextInfo,
        audioDevices,
        micPerms,
      });
    }
  } catch (error) {
    logger.error('[VoiceErrorLogger] Failed to generate diagnostics report', {}, error);
  }
}

/**
 * Log media stream track info
 */
export function logMediaStreamTracks(stream: MediaStream, label: string = 'MediaStream'): void {
  try {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    const context = {
      component: 'voice-media-stream',
      streamLabel: label,
      audioTrackCount: audioTracks.length,
      videoTrackCount: videoTracks.length,
      audioTracks: audioTracks.map((t) => ({
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label,
      })),
      videoTracks: videoTracks.map((t) => ({
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
