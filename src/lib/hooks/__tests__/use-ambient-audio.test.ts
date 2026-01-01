/**
 * Unit tests for use-ambient-audio hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAmbientAudio } from '../use-ambient-audio';

// Mock the audio engine
vi.mock('@/lib/audio/engine', () => ({
  getAudioEngine: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    stopAll: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
    addLayer: vi.fn().mockResolvedValue(undefined),
    removeLayer: vi.fn(),
    setLayerVolume: vi.fn(),
    toggleLayer: vi.fn(),
    setMasterVolume: vi.fn(),
    duck: vi.fn(),
    unduck: vi.fn(),
    getState: vi.fn(() => ({ isInitialized: true })),
  })),
}));

// Mock the store
vi.mock('@/lib/stores/ambient-audio-store', () => ({
  useAmbientAudioStore: vi.fn(() => ({
    playbackState: 'idle',
    masterVolume: 0.5,
    currentPreset: null,
    layers: [],
    error: null,
    autoDuckEnabled: true,
    duckedVolume: 0.2,
    autoStartWithStudy: false,
    studySessionAudioMode: null,
    autoStartWithPomodoro: false,
    pauseDuringBreak: true,
    pomodoroPreset: 'focus',
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    setLayerVolume: vi.fn(),
    toggleLayer: vi.fn(),
    applyPreset: vi.fn(),
    setMasterVolume: vi.fn(),
    clearLayers: vi.fn(),
    setError: vi.fn(),
    duck: vi.fn(),
    unduck: vi.fn(),
    setAutoDuck: vi.fn(),
    setDuckedVolume: vi.fn(),
    setAutoStartWithStudy: vi.fn(),
    setStudySessionAudioMode: vi.fn(),
    setAutoStartWithPomodoro: vi.fn(),
    setPauseDuringBreak: vi.fn(),
    setPomodoroPreset: vi.fn(),
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useAmbientAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('returns playback state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.playbackState).toBe('idle');
    });

    it('returns master volume', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.masterVolume).toBe(0.5);
    });

    it('returns current preset', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.currentPreset).toBeNull();
    });

    it('returns layers array', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.layers).toEqual([]);
    });

    it('returns error state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.error).toBeNull();
    });
  });

  describe('Playback Controls', () => {
    it('provides play function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.play).toBe('function');
    });

    it('provides pause function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.pause).toBe('function');
    });

    it('provides stop function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.stop).toBe('function');
    });
  });

  describe('Layer Management', () => {
    it('provides addLayer function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.addLayer).toBe('function');
    });

    it('provides removeLayer function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.removeLayer).toBe('function');
    });

    it('provides setLayerVolume function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setLayerVolume).toBe('function');
    });

    it('provides toggleLayer function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.toggleLayer).toBe('function');
    });

    it('provides clearLayers function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.clearLayers).toBe('function');
    });
  });

  describe('Preset Management', () => {
    it('provides applyPreset function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.applyPreset).toBe('function');
    });
  });

  describe('Volume Control', () => {
    it('provides setMasterVolume function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setMasterVolume).toBe('function');
    });
  });

  describe('Ducking Controls', () => {
    it('provides duck function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.duck).toBe('function');
    });

    it('provides unduck function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.unduck).toBe('function');
    });

    it('returns autoDuckEnabled state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.autoDuckEnabled).toBe(true);
    });

    it('returns duckedVolume', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.duckedVolume).toBe(0.2);
    });

    it('provides setAutoDuck function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setAutoDuck).toBe('function');
    });

    it('provides setDuckedVolume function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setDuckedVolume).toBe('function');
    });
  });

  describe('Study Integration', () => {
    it('returns autoStartWithStudy state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.autoStartWithStudy).toBe(false);
    });

    it('returns studySessionAudioMode', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.studySessionAudioMode).toBeNull();
    });

    it('provides setAutoStartWithStudy function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setAutoStartWithStudy).toBe('function');
    });

    it('provides setStudySessionAudioMode function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setStudySessionAudioMode).toBe('function');
    });
  });

  describe('Pomodoro Integration', () => {
    it('returns autoStartWithPomodoro state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.autoStartWithPomodoro).toBe(false);
    });

    it('returns pauseDuringBreak state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.pauseDuringBreak).toBe(true);
    });

    it('returns pomodoroPreset', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.pomodoroPreset).toBe('focus');
    });

    it('provides setAutoStartWithPomodoro function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setAutoStartWithPomodoro).toBe('function');
    });

    it('provides setPauseDuringBreak function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setPauseDuringBreak).toBe('function');
    });

    it('provides setPomodoroPreset function', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(typeof result.current.setPomodoroPreset).toBe('function');
    });
  });

  describe('Engine State', () => {
    it('returns engine state', () => {
      const { result } = renderHook(() => useAmbientAudio());
      expect(result.current.engineState).toEqual({ isInitialized: true });
    });
  });
});
