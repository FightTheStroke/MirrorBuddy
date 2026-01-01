// ============================================================================
// AUDIO GENERATORS
// Procedural audio generation using Web Audio API
// Generates white/pink/brown noise and binaural beats
// ============================================================================

import type { AudioMode } from '@/types';

/**
 * Generate white noise (equal energy across frequencies)
 */
export function createWhiteNoiseNode(audioContext: AudioContext): AudioWorkletNode | ScriptProcessorNode {
  // Try to use AudioWorklet if available (better performance)
  // Fall back to ScriptProcessor for compatibility
  if (audioContext.audioWorklet) {
    try {
      const workletNode = new AudioWorkletNode(audioContext, 'white-noise-processor');
      return workletNode;
    } catch {
      // Fall through to ScriptProcessor
    }
  }

  // Fallback: ScriptProcessor (deprecated but widely supported)
  const bufferSize = 4096;
  const whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  whiteNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // Random value between -1 and 1
    }
  });

  return whiteNoise;
}

/**
 * Generate pink noise (1/f spectrum, more natural than white)
 */
export function createPinkNoiseNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const pinkNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  // Pink noise requires filtering - use Paul Kellett algorithm
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  pinkNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  });

  return pinkNoise;
}

/**
 * Generate brown noise (1/f² spectrum, deeper and rumbling)
 */
export function createBrownNoiseNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const brownNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  let lastOut = 0.0;
  
  brownNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for volume drop
    }
  });

  return brownNoise;
}

/**
 * Generate binaural beats (stereo required)
 * Creates the perception of a beat frequency by playing slightly different frequencies in each ear
 * 
 * @param audioContext - Web Audio context
 * @param baseFrequency - Base frequency (e.g., 200 Hz)
 * @param beatFrequency - Desired beat frequency (e.g., 10 Hz for alpha)
 * @returns Stereo panner with two oscillators
 */
export function createBinauralBeatNodes(
  audioContext: AudioContext,
  baseFrequency: number,
  beatFrequency: number
): { merger: ChannelMergerNode; oscillators: OscillatorNode[] } {
  // Left ear frequency
  const leftOsc = audioContext.createOscillator();
  leftOsc.type = 'sine';
  leftOsc.frequency.setValueAtTime(baseFrequency, audioContext.currentTime);

  // Right ear frequency (offset by beat frequency)
  const rightOsc = audioContext.createOscillator();
  rightOsc.type = 'sine';
  rightOsc.frequency.setValueAtTime(baseFrequency + beatFrequency, audioContext.currentTime);

  // Create stereo merger
  const merger = audioContext.createChannelMerger(2);
  
  // Left to left channel, right to right channel
  leftOsc.connect(merger, 0, 0);
  rightOsc.connect(merger, 0, 1);

  return { merger, oscillators: [leftOsc, rightOsc] };
}

/**
 * Get binaural beat configuration for different brainwave states
 */
export function getBinauralConfig(mode: AudioMode): { baseFreq: number; beatFreq: number } | null {
  switch (mode) {
    case 'binaural_alpha':
      return { baseFreq: 200, beatFreq: 10 }; // 10 Hz alpha wave
    case 'binaural_beta':
      return { baseFreq: 200, beatFreq: 20 }; // 20 Hz beta wave
    case 'binaural_theta':
      return { baseFreq: 200, beatFreq: 6 };  // 6 Hz theta wave
    default:
      return null;
  }
}

/**
 * Create an audio node for the given mode
 */
export function createAudioNodeForMode(
  audioContext: AudioContext,
  mode: AudioMode
): AudioNode | { merger: ChannelMergerNode; oscillators: OscillatorNode[] } | null {
  switch (mode) {
    case 'white_noise':
      return createWhiteNoiseNode(audioContext);
    case 'pink_noise':
      return createPinkNoiseNode(audioContext);
    case 'brown_noise':
      return createBrownNoiseNode(audioContext);
    case 'binaural_alpha':
    case 'binaural_beta':
    case 'binaural_theta':
      const config = getBinauralConfig(mode);
      if (config) {
        return createBinauralBeatNodes(audioContext, config.baseFreq, config.beatFreq);
      }
      return null;
    default:
      // Ambient sounds (rain, fireplace, etc.) will be loaded as audio files
      // For now, return null - these will be implemented in Phase 3
      return null;
  }
}
