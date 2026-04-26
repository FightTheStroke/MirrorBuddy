// ============================================================================
// AUDIO GENERATORS - BARREL EXPORT
// Re-exports all generator modules for backwards compatibility
// ============================================================================

// Noise generators
export { createWhiteNoiseNode, createPinkNoiseNode, createBrownNoiseNode } from './noise';

// Binaural beats
export { createBinauralBeatNodes, getBinauralConfig } from './binaural';

// Ambient sounds - Weather
export { createRainNode, createThunderstormNode } from './ambient/weather';

// Ambient sounds - Spaces
export { createFireplaceNode, createCafeNode, createLibraryNode } from './ambient/spaces';

// Ambient sounds - Nature
export { createForestNode, createOceanNode } from './ambient/nature';

// Factory function
export { createAudioNodeForMode } from './factory';
