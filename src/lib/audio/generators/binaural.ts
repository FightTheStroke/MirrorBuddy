/**
 * Binaural beat generators
 */

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
