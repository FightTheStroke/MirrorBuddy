// ============================================================================
// AUDIO NODE FACTORY
// Creates audio nodes based on audio mode
// ============================================================================

import type { AudioMode } from '@/types';

import { createWhiteNoiseNode, createPinkNoiseNode, createBrownNoiseNode } from './noise';
import { createBinauralBeatNodes, getBinauralConfig } from './binaural';
import { createRainNode, createThunderstormNode } from './ambient/weather';
import { createFireplaceNode, createCafeNode, createLibraryNode } from './ambient/spaces';
import { createForestNode, createOceanNode } from './ambient/nature';

/**
 * Create an audio node for the given mode
 */
export function createAudioNodeForMode(
  audioContext: AudioContext,
  mode: AudioMode
): AudioNode | { merger: ChannelMergerNode; oscillators: OscillatorNode[] } | null {
  switch (mode) {
    // Noise generators
    case 'white_noise':
      return createWhiteNoiseNode(audioContext);
    case 'pink_noise':
      return createPinkNoiseNode(audioContext);
    case 'brown_noise':
      return createBrownNoiseNode(audioContext);

    // Binaural beats
    case 'binaural_alpha':
    case 'binaural_beta':
    case 'binaural_theta': {
      const config = getBinauralConfig(mode);
      if (config) {
        return createBinauralBeatNodes(audioContext, config.baseFreq, config.beatFreq);
      }
      return null;
    }

    // Ambient sounds (procedural)
    case 'rain':
      return createRainNode(audioContext);
    case 'thunderstorm':
      return createThunderstormNode(audioContext);
    case 'fireplace':
      return createFireplaceNode(audioContext);
    case 'cafe':
      return createCafeNode(audioContext);
    case 'library':
      return createLibraryNode(audioContext);
    case 'forest':
      return createForestNode(audioContext);
    case 'ocean':
      return createOceanNode(audioContext);

    default:
      return null;
  }
}
