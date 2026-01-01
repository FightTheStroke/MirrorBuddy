/**
 * Unit tests for audio generators
 * Tests procedural audio generation functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AudioContext and related APIs
const mockAudioProcess = vi.fn();
const mockScriptProcessor = {
  addEventListener: vi.fn((event, callback) => {
    if (event === 'audioprocess') {
      mockAudioProcess.mockImplementation(callback);
    }
  }),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockOscillator = {
  type: 'sine',
  frequency: {
    setValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  gain: {
    setValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockMerger = {
  connect: vi.fn(),
};

const mockAudioContext = {
  sampleRate: 44100,
  currentTime: 0,
  createScriptProcessor: vi.fn(() => mockScriptProcessor),
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => mockGainNode),
  createChannelMerger: vi.fn(() => mockMerger),
  audioWorklet: undefined,
} as unknown as AudioContext;

// Import after mocks are set up
import {
  createWhiteNoiseNode,
  createPinkNoiseNode,
  createBrownNoiseNode,
  createBinauralBeatNodes,
  getBinauralConfig,
  createAudioNodeForMode,
  createRainNode,
  createThunderstormNode,
  createFireplaceNode,
  createCafeNode,
  createLibraryNode,
  createForestNode,
  createOceanNode,
} from '../generators';

describe('Audio Generators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Noise Generators', () => {
    it('creates white noise node', () => {
      const node = createWhiteNoiseNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(node).toBeDefined();
    });

    it('creates pink noise node', () => {
      const node = createPinkNoiseNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(node).toBeDefined();
    });

    it('creates brown noise node', () => {
      const node = createBrownNoiseNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(node).toBeDefined();
    });
  });

  describe('Binaural Beats', () => {
    it('returns correct config for alpha waves', () => {
      const config = getBinauralConfig('binaural_alpha');
      expect(config).toEqual({ baseFreq: 200, beatFreq: 10 });
    });

    it('returns correct config for beta waves', () => {
      const config = getBinauralConfig('binaural_beta');
      expect(config).toEqual({ baseFreq: 200, beatFreq: 20 });
    });

    it('returns correct config for theta waves', () => {
      const config = getBinauralConfig('binaural_theta');
      expect(config).toEqual({ baseFreq: 200, beatFreq: 6 });
    });

    it('returns null for non-binaural modes', () => {
      const config = getBinauralConfig('white_noise');
      expect(config).toBeNull();
    });

    it('creates binaural beat nodes with stereo merger', () => {
      const result = createBinauralBeatNodes(mockAudioContext, 200, 10);
      expect(result.merger).toBeDefined();
      expect(result.oscillators).toHaveLength(2);
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createChannelMerger).toHaveBeenCalledWith(2);
    });
  });

  describe('Ambient Sound Generators', () => {
    it('creates rain node', () => {
      const node = createRainNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates thunderstorm node', () => {
      const node = createThunderstormNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates fireplace node', () => {
      const node = createFireplaceNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates cafe node', () => {
      const node = createCafeNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates library node', () => {
      const node = createLibraryNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates forest node', () => {
      const node = createForestNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });

    it('creates ocean node', () => {
      const node = createOceanNode(mockAudioContext);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(node).toBeDefined();
    });
  });

  describe('createAudioNodeForMode', () => {
    it('returns white noise node for white_noise mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'white_noise');
      expect(node).toBeDefined();
    });

    it('returns pink noise node for pink_noise mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'pink_noise');
      expect(node).toBeDefined();
    });

    it('returns brown noise node for brown_noise mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'brown_noise');
      expect(node).toBeDefined();
    });

    it('returns binaural nodes for binaural_alpha mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'binaural_alpha');
      expect(node).toBeDefined();
      expect((node as { oscillators: unknown[] }).oscillators).toHaveLength(2);
    });

    it('returns rain node for rain mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'rain');
      expect(node).toBeDefined();
    });

    it('returns thunderstorm node for thunderstorm mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'thunderstorm');
      expect(node).toBeDefined();
    });

    it('returns fireplace node for fireplace mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'fireplace');
      expect(node).toBeDefined();
    });

    it('returns cafe node for cafe mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'cafe');
      expect(node).toBeDefined();
    });

    it('returns library node for library mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'library');
      expect(node).toBeDefined();
    });

    it('returns forest node for forest mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'forest');
      expect(node).toBeDefined();
    });

    it('returns ocean node for ocean mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'ocean');
      expect(node).toBeDefined();
    });

    it('returns null for unknown mode', () => {
      const node = createAudioNodeForMode(mockAudioContext, 'unknown_mode' as never);
      expect(node).toBeNull();
    });
  });
});
