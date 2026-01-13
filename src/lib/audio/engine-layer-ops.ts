/**
 * Audio Layer Operations
 * Handles layer lifecycle, creation, and management
 */

import { logger } from '@/lib/logger';
import type { AudioLayer } from '@/types';
import type { ActiveLayer } from './types';
import { createAudioNodeForMode } from './generators';

/**
 * Create and connect a new audio layer
 */
export function createAudioLayer(
  audioContext: AudioContext,
  masterGainNode: GainNode,
  layer: AudioLayer
): ActiveLayer {
  // Create gain node for this layer
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(layer.volume, audioContext.currentTime);
  gainNode.connect(masterGainNode);

  // Create audio source node based on mode
  const result = createAudioNodeForMode(audioContext, layer.mode);

  if (!result) {
    logger.warn('Audio mode not yet implemented', { mode: layer.mode });
    throw new Error(`Audio mode not implemented: ${layer.mode}`);
  }

  let sourceNode: AudioNode;
  let oscillators: OscillatorNode[] | undefined;

  // Handle binaural beats (returns object with merger and oscillators)
  if ('merger' in result && 'oscillators' in result) {
    sourceNode = result.merger;
    oscillators = result.oscillators;
    result.merger.connect(gainNode);
  } else {
    // Regular audio nodes (noise generators)
    sourceNode = result;
    sourceNode.connect(gainNode);
  }

  return {
    id: layer.id,
    mode: layer.mode,
    gainNode,
    sourceNode,
    oscillators,
    started: false,
  };
}

/**
 * Start playback for a layer
 */
export function startAudioLayer(layer: ActiveLayer): void {
  if (layer.started) return;

  logger.info('Starting audio layer', { layerId: layer.id });

  // Start oscillators for binaural beats
  if (layer.oscillators) {
    layer.oscillators.forEach((osc) => osc.start());
  }

  layer.started = true;
}

/**
 * Stop and cleanup a layer
 */
export function stopAudioLayer(layer: ActiveLayer): void {
  logger.info('Stopping audio layer', { layerId: layer.id });

  try {
    // Stop oscillators
    if (layer.oscillators) {
      layer.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Ignore if already stopped
        }
      });
    }

    // Disconnect nodes
    if (layer.sourceNode) {
      layer.sourceNode.disconnect();
    }
    layer.gainNode.disconnect();
  } catch (error) {
    logger.error('Error stopping audio layer', { error, layerId: layer.id });
  }
}
