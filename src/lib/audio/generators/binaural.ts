/**
 * Binaural beat generators
 */

/**
 * Generate binaural beats (stereo required)
 * Creates the perception of a beat frequency by playing slightly different
 * frequencies in each ear
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

export function getBinauralConfig(mode: 'binaural_alpha' | 'binaural_beta' | 'binaural_theta'): { baseFreq: number; beatFreq: number } | null {
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
