/**
 * Audio Volume Operations
 * Handles volume control, ducking, and master gain management
 */

import { logger } from '@/lib/logger';

const DUCKING_TRANSITION_TIME = 0.2; // 200ms smooth transition

/**
 * Clamp volume value between 0 and 1
 */
export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

/**
 * Set layer gain value
 */
export function setGainValue(
  gainNode: GainNode,
  volume: number,
  audioContext: AudioContext
): void {
  const clampedVolume = clampVolume(volume);
  gainNode.gain.setValueAtTime(clampedVolume, audioContext.currentTime);
  logger.debug('Gain value set', { volume: clampedVolume });
}

/**
 * Smoothly transition gain to a new value (for ducking)
 */
export function transitionGainSmooth(
  gainNode: GainNode,
  targetVolume: number,
  audioContext: AudioContext
): void {
  const clampedVolume = clampVolume(targetVolume);
  gainNode.gain.linearRampToValueAtTime(
    clampedVolume,
    audioContext.currentTime + DUCKING_TRANSITION_TIME
  );
}

/**
 * Apply ducking (reduce volume for voice/TTS)
 */
export function applyDucking(
  gainNode: GainNode,
  audioContext: AudioContext,
  duckedVolume = 0.2
): void {
  const clampedVolume = clampVolume(duckedVolume);
  transitionGainSmooth(gainNode, clampedVolume, audioContext);
  logger.debug('Audio ducked', { duckedVolume: clampedVolume });
}

/**
 * Remove ducking (restore original volume)
 */
export function removeDucking(
  gainNode: GainNode,
  audioContext: AudioContext,
  originalVolume: number
): void {
  transitionGainSmooth(gainNode, originalVolume, audioContext);
  logger.debug('Audio unducked', { volume: originalVolume });
}
