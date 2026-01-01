/**
 * CONVERGIO EDUCATION - Audio Generators Unit Tests
 *
 * Tests for procedural audio generation algorithms.
 * These tests verify the audio generation functions produce valid output.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createWhiteNoiseNode,
  createPinkNoiseNode,
  createBrownNoiseNode,
  createBinauralBeatNodes,
  getBinauralConfig,
  createAudioNodeForMode,
} from './generators';

// Mock AudioContext for testing
class MockAudioContext {
  sampleRate = 44100;
  state = 'running';
  audioWorklet = null;
  
  createScriptProcessor(bufferSize: number, inputs: number, outputs: number) {
    const node = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
    };
    return node;
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  
  createChannelMerger(channels: number) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  get currentTime() {
    return 0;
  }
  
  get destination() {
    return { connect: vi.fn() };
  }
}

describe('Audio Generators', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    // @ts-ignore - Using mock for testing
    audioContext = new MockAudioContext();
  });

  describe('createWhiteNoiseNode', () => {
    it('creates a ScriptProcessorNode when AudioWorklet is not available', () => {
      const node = createWhiteNoiseNode(audioContext);
      
      expect(node).toBeDefined();
      expect(node.addEventListener).toBeDefined();
    });

    it('registers audioprocess event handler', () => {
      const node = createWhiteNoiseNode(audioContext);
      
      expect(node.addEventListener).toHaveBeenCalledWith(
        'audioprocess',
        expect.any(Function)
      );
    });
  });

  describe('createPinkNoiseNode', () => {
    it('creates a ScriptProcessorNode for pink noise', () => {
      const node = createPinkNoiseNode(audioContext);
      
      expect(node).toBeDefined();
      expect(node.addEventListener).toBeDefined();
    });

    it('registers audioprocess event handler for pink noise', () => {
      const node = createPinkNoiseNode(audioContext);
      
      expect(node.addEventListener).toHaveBeenCalledWith(
        'audioprocess',
        expect.any(Function)
      );
    });
  });

  describe('createBrownNoiseNode', () => {
    it('creates a ScriptProcessorNode for brown noise', () => {
      const node = createBrownNoiseNode(audioContext);
      
      expect(node).toBeDefined();
      expect(node.addEventListener).toBeDefined();
    });

    it('registers audioprocess event handler for brown noise', () => {
      const node = createBrownNoiseNode(audioContext);
      
      expect(node.addEventListener).toHaveBeenCalledWith(
        'audioprocess',
        expect.any(Function)
      );
    });
  });

  describe('createBinauralBeatNodes', () => {
    it('creates stereo oscillators with correct frequencies', () => {
      const baseFreq = 200;
      const beatFreq = 10;
      
      const result = createBinauralBeatNodes(audioContext, baseFreq, beatFreq);
      
      expect(result.merger).toBeDefined();
      expect(result.oscillators).toHaveLength(2);
      
      // Left oscillator should be at base frequency
      expect(result.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
        baseFreq,
        0
      );
      
      // Right oscillator should be offset by beat frequency
      expect(result.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
        baseFreq + beatFreq,
        0
      );
    });

    it('connects oscillators to stereo merger', () => {
      const result = createBinauralBeatNodes(audioContext, 200, 10);
      
      expect(result.oscillators[0].connect).toHaveBeenCalledWith(
        result.merger,
        0,
        0
      );
      expect(result.oscillators[1].connect).toHaveBeenCalledWith(
        result.merger,
        0,
        1
      );
    });
  });

  describe('getBinauralConfig', () => {
    it('returns correct config for alpha waves', () => {
      const config = getBinauralConfig('binaural_alpha');
      
      expect(config).toEqual({
        baseFreq: 200,
        beatFreq: 10,
      });
    });

    it('returns correct config for beta waves', () => {
      const config = getBinauralConfig('binaural_beta');
      
      expect(config).toEqual({
        baseFreq: 200,
        beatFreq: 20,
      });
    });

    it('returns correct config for theta waves', () => {
      const config = getBinauralConfig('binaural_theta');
      
      expect(config).toEqual({
        baseFreq: 200,
        beatFreq: 6,
      });
    });

    it('returns null for non-binaural modes', () => {
      const config = getBinauralConfig('white_noise');
      
      expect(config).toBeNull();
    });
  });

  describe('createAudioNodeForMode', () => {
    it('creates white noise node for white_noise mode', () => {
      const node = createAudioNodeForMode(audioContext, 'white_noise');
      
      expect(node).toBeDefined();
    });

    it('creates pink noise node for pink_noise mode', () => {
      const node = createAudioNodeForMode(audioContext, 'pink_noise');
      
      expect(node).toBeDefined();
    });

    it('creates brown noise node for brown_noise mode', () => {
      const node = createAudioNodeForMode(audioContext, 'brown_noise');
      
      expect(node).toBeDefined();
    });

    it('creates binaural beats for binaural_alpha mode', () => {
      const result = createAudioNodeForMode(audioContext, 'binaural_alpha');
      
      expect(result).toBeDefined();
      // @ts-ignore - checking for binaural structure
      expect(result.merger).toBeDefined();
      // @ts-ignore
      expect(result.oscillators).toHaveLength(2);
    });

    it('creates binaural beats for binaural_beta mode', () => {
      const result = createAudioNodeForMode(audioContext, 'binaural_beta');
      
      expect(result).toBeDefined();
      // @ts-ignore - checking for binaural structure
      expect(result.merger).toBeDefined();
    });

    it('creates binaural beats for binaural_theta mode', () => {
      const result = createAudioNodeForMode(audioContext, 'binaural_theta');
      
      expect(result).toBeDefined();
      // @ts-ignore - checking for binaural structure
      expect(result.merger).toBeDefined();
    });

    it('returns null for unimplemented ambient soundscapes', () => {
      const node = createAudioNodeForMode(audioContext, 'rain');
      
      expect(node).toBeNull();
    });

    it('returns null for other unimplemented modes', () => {
      const modes = ['fireplace', 'cafe', 'library', 'forest', 'ocean', 'night', 'thunderstorm'];
      
      modes.forEach(mode => {
        const node = createAudioNodeForMode(audioContext, mode as any);
        expect(node).toBeNull();
      });
    });
  });
});
