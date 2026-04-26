/**
 * Unit tests for ambient audio store
 * Tests Zustand store state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAmbientAudioStore } from '../ambient-audio-store';

describe('Ambient Audio Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAmbientAudioStore.getState().reset();
  });

  describe('Initial State', () => {
    it('has correct initial playback state', () => {
      const state = useAmbientAudioStore.getState();
      expect(state.playbackState).toBe('idle');
    });

    it('has correct initial master volume', () => {
      const state = useAmbientAudioStore.getState();
      expect(state.masterVolume).toBe(0.5);
    });

    it('has no layers initially', () => {
      const state = useAmbientAudioStore.getState();
      expect(state.layers).toHaveLength(0);
    });

    it('has no preset initially', () => {
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBeNull();
    });

    it('has auto-duck enabled by default', () => {
      const state = useAmbientAudioStore.getState();
      expect(state.autoDuckEnabled).toBe(true);
    });
  });

  describe('Playback Control', () => {
    it('play sets state to playing', () => {
      useAmbientAudioStore.getState().play();
      expect(useAmbientAudioStore.getState().playbackState).toBe('playing');
    });

    it('pause sets state to paused', () => {
      useAmbientAudioStore.getState().play();
      useAmbientAudioStore.getState().pause();
      expect(useAmbientAudioStore.getState().playbackState).toBe('paused');
    });

    it('stop sets state to idle', () => {
      useAmbientAudioStore.getState().play();
      useAmbientAudioStore.getState().stop();
      expect(useAmbientAudioStore.getState().playbackState).toBe('idle');
    });
  });

  describe('Volume Control', () => {
    it('sets master volume', () => {
      useAmbientAudioStore.getState().setMasterVolume(0.8);
      expect(useAmbientAudioStore.getState().masterVolume).toBe(0.8);
    });

    it('clamps volume to 0-1 range (lower)', () => {
      useAmbientAudioStore.getState().setMasterVolume(-0.5);
      expect(useAmbientAudioStore.getState().masterVolume).toBe(0);
    });

    it('clamps volume to 0-1 range (upper)', () => {
      useAmbientAudioStore.getState().setMasterVolume(1.5);
      expect(useAmbientAudioStore.getState().masterVolume).toBe(1);
    });
  });

  describe('Layer Management', () => {
    it('adds a layer', () => {
      useAmbientAudioStore.getState().addLayer('white_noise', 0.7);
      const layers = useAmbientAudioStore.getState().layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].mode).toBe('white_noise');
      expect(layers[0].volume).toBe(0.7);
      expect(layers[0].enabled).toBe(true);
    });

    it('removes a layer', () => {
      useAmbientAudioStore.getState().addLayer('white_noise');
      const layerId = useAmbientAudioStore.getState().layers[0].id;
      useAmbientAudioStore.getState().removeLayer(layerId);
      expect(useAmbientAudioStore.getState().layers).toHaveLength(0);
    });

    it('toggles layer enabled state', () => {
      useAmbientAudioStore.getState().addLayer('white_noise');
      const layerId = useAmbientAudioStore.getState().layers[0].id;
      useAmbientAudioStore.getState().toggleLayer(layerId, false);
      expect(useAmbientAudioStore.getState().layers[0].enabled).toBe(false);
    });

    it('sets layer volume', () => {
      useAmbientAudioStore.getState().addLayer('white_noise', 0.5);
      const layerId = useAmbientAudioStore.getState().layers[0].id;
      useAmbientAudioStore.getState().setLayerVolume(layerId, 0.9);
      expect(useAmbientAudioStore.getState().layers[0].volume).toBe(0.9);
    });

    it('clears all layers', () => {
      useAmbientAudioStore.getState().addLayer('white_noise');
      useAmbientAudioStore.getState().addLayer('rain');
      useAmbientAudioStore.getState().clearLayers();
      expect(useAmbientAudioStore.getState().layers).toHaveLength(0);
    });

    it('clears preset when manually adding layers', () => {
      useAmbientAudioStore.getState().applyPreset('focus');
      useAmbientAudioStore.getState().addLayer('rain');
      expect(useAmbientAudioStore.getState().currentPreset).toBeNull();
    });
  });

  describe('Presets', () => {
    it('applies focus preset', () => {
      useAmbientAudioStore.getState().applyPreset('focus');
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBe('focus');
      expect(state.layers.some(l => l.mode === 'binaural_alpha')).toBe(true);
    });

    it('applies deep_work preset', () => {
      useAmbientAudioStore.getState().applyPreset('deep_work');
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBe('deep_work');
      expect(state.layers.some(l => l.mode === 'binaural_beta')).toBe(true);
      expect(state.layers.some(l => l.mode === 'brown_noise')).toBe(true);
    });

    it('applies rainy_day preset', () => {
      useAmbientAudioStore.getState().applyPreset('rainy_day');
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBe('rainy_day');
      expect(state.layers.some(l => l.mode === 'rain')).toBe(true);
      expect(state.layers.some(l => l.mode === 'fireplace')).toBe(true);
    });

    it('applies nature preset', () => {
      useAmbientAudioStore.getState().applyPreset('nature');
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBe('nature');
      expect(state.layers.some(l => l.mode === 'forest')).toBe(true);
      expect(state.layers.some(l => l.mode === 'ocean')).toBe(true);
    });

    it('applies starbucks preset', () => {
      useAmbientAudioStore.getState().applyPreset('starbucks');
      const state = useAmbientAudioStore.getState();
      expect(state.currentPreset).toBe('starbucks');
      expect(state.layers.some(l => l.mode === 'cafe')).toBe(true);
    });
  });

  describe('Auto-Duck Settings', () => {
    it('sets auto-duck enabled', () => {
      useAmbientAudioStore.getState().setAutoDuck(false);
      expect(useAmbientAudioStore.getState().autoDuckEnabled).toBe(false);
    });

    it('sets ducked volume', () => {
      useAmbientAudioStore.getState().setDuckedVolume(0.3);
      expect(useAmbientAudioStore.getState().duckedVolume).toBe(0.3);
    });
  });

  describe('Pomodoro Integration', () => {
    it('sets auto-start with pomodoro', () => {
      useAmbientAudioStore.getState().setAutoStartWithPomodoro(true);
      expect(useAmbientAudioStore.getState().autoStartWithPomodoro).toBe(true);
    });

    it('sets pause during break', () => {
      useAmbientAudioStore.getState().setPauseDuringBreak(false);
      expect(useAmbientAudioStore.getState().pauseDuringBreak).toBe(false);
    });

    it('sets pomodoro preset', () => {
      useAmbientAudioStore.getState().setPomodoroPreset('deep_work');
      expect(useAmbientAudioStore.getState().pomodoroPreset).toBe('deep_work');
    });
  });

  describe('Error Handling', () => {
    it('sets error and changes playback state', () => {
      useAmbientAudioStore.getState().setError('Test error');
      const state = useAmbientAudioStore.getState();
      expect(state.error).toBe('Test error');
      expect(state.playbackState).toBe('error');
    });

    it('clears error and resets playback state', () => {
      useAmbientAudioStore.getState().setError('Test error');
      useAmbientAudioStore.getState().setError(null);
      const state = useAmbientAudioStore.getState();
      expect(state.error).toBeNull();
      expect(state.playbackState).toBe('idle');
    });
  });

  describe('Reset', () => {
    it('resets to initial state', () => {
      // Modify state
      useAmbientAudioStore.getState().play();
      useAmbientAudioStore.getState().setMasterVolume(0.9);
      useAmbientAudioStore.getState().addLayer('rain');
      useAmbientAudioStore.getState().applyPreset('focus');

      // Reset
      useAmbientAudioStore.getState().reset();

      const state = useAmbientAudioStore.getState();
      expect(state.playbackState).toBe('idle');
      expect(state.masterVolume).toBe(0.5);
      expect(state.layers).toHaveLength(0);
      expect(state.currentPreset).toBeNull();
    });
  });
});
