/**
 * Audio Context Initialization Helpers
 */

import { logger } from '@/lib/logger';

/**
 * Resume an audio context if suspended
 */
export async function resumeAudioContext(context: AudioContext): Promise<void> {
  if (context.state === 'suspended') {
    logger.debug('[VoiceSession] 🔊 Resuming suspended AudioContext...');
    await context.resume();
  }
}

/**
 * Set audio output device if specified
 */
export async function setAudioOutputDevice(
  context: AudioContext,
  deviceId?: string
): Promise<void> {
  if (!deviceId || !('setSinkId' in context)) {
    return;
  }

  try {
    await (context as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
    logger.debug(`[VoiceSession] 🔊 Audio output set to device: ${deviceId}`);
  } catch (err) {
    logger.warn('[VoiceSession] ⚠️ Could not set output device, using default', { err });
  }
}

/**
 * Create analyser for real-time monitoring
 */
export function createPlaybackAnalyser(context: AudioContext): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.3;
  return analyser;
}

/**
 * Create and connect gain node
 */
export function createAndConnectGainNode(
  context: AudioContext,
  analyser: AnalyserNode
): GainNode {
  const gainNode = context.createGain();
  gainNode.connect(analyser);
  analyser.connect(context.destination);
  return gainNode;
}
