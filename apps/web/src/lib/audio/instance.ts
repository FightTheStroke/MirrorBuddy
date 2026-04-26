/**
 * Audio Engine Singleton Instance
 * Provides global access to the audio engine
 */

import { AmbientAudioEngine } from './engine';

let engineInstance: AmbientAudioEngine | null = null;

/**
 * Get the singleton audio engine instance
 */
export function getAudioEngine(): AmbientAudioEngine {
  if (!engineInstance) {
    engineInstance = new AmbientAudioEngine();
  }
  return engineInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAudioEngine(): void {
  engineInstance = null;
}
