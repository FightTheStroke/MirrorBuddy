// ============================================================================
// AUDIO GENERATORS - BACKWARDS COMPATIBILITY RE-EXPORT
// This file now re-exports from the modular generators/ directory
// See src/lib/audio/generators/ for the actual implementations
// ============================================================================

export {
  createWhiteNoiseNode,
  createPinkNoiseNode,
  createBrownNoiseNode,
  createBinauralBeatNodes,
  getBinauralConfig,
  createRainNode,
  createThunderstormNode,
  createFireplaceNode,
  createCafeNode,
  createLibraryNode,
  createForestNode,
  createOceanNode,
  createAudioNodeForMode,
} from './generators/index';
