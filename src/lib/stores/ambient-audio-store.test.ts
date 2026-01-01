/**
 * CONVERGIO EDUCATION - Ambient Audio Store Unit Tests
 *
 * Tests for ambient audio state management.
 * These tests verify state transitions and actions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAmbientAudioStore } from './ambient-audio-store';

describe('Ambient Audio Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useAmbientAudioStore.getState();
    store.reset();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useAmbientAudioStore.getState();
      
      expect(state.playbackState).toBe('idle');
      expect(state.masterVolume).toBe(0.5);
      expect(state.currentPreset).toBeNull();
      expect(state.layers).toEqual([]);
      expect(state.autoDuckEnabled).toBe(true);
      expect(state.duckedVolume).toBe(0.2);
      expect(state.autoStartWithStudy).toBe(false);
      expect(state.studySessionAudioMode).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('Playback Control', () => {
    it('play sets playback state to playing', () => {
      const store = useAmbientAudioStore.getState();
      
      store.play();
      
      expect(store.playbackState).toBe('playing');
      expect(store.error).toBeNull();
    });

    it('pause sets playback state to paused', () => {
      const store = useAmbientAudioStore.getState();
      
      store.play();
      store.pause();
      
      expect(store.playbackState).toBe('paused');
    });

    it('stop sets playback state to idle', () => {
      const store = useAmbientAudioStore.getState();
      
      store.play();
      store.stop();
      
      expect(store.playbackState).toBe('idle');
    });
  });

  describe('Volume Control', () => {
    it('setMasterVolume updates master volume', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setMasterVolume(0.75);
      
      expect(store.masterVolume).toBe(0.75);
    });

    it('clamps master volume to 0-1 range', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setMasterVolume(1.5);
      expect(store.masterVolume).toBe(1);
      
      store.setMasterVolume(-0.5);
      expect(store.masterVolume).toBe(0);
    });

    it('setLayerVolume updates specific layer volume', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise', 0.5);
      const layerId = store.layers[0].id;
      
      store.setLayerVolume(layerId, 0.8);
      
      expect(store.layers[0].volume).toBe(0.8);
    });

    it('clamps layer volume to 0-1 range', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise', 0.5);
      const layerId = store.layers[0].id;
      
      store.setLayerVolume(layerId, 2.0);
      expect(store.layers[0].volume).toBe(1);
      
      store.setLayerVolume(layerId, -1.0);
      expect(store.layers[0].volume).toBe(0);
    });
  });

  describe('Layer Management', () => {
    it('addLayer adds a new layer', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise', 0.7);
      
      expect(store.layers).toHaveLength(1);
      expect(store.layers[0].mode).toBe('white_noise');
      expect(store.layers[0].volume).toBe(0.7);
      expect(store.layers[0].enabled).toBe(true);
      expect(store.layers[0].id).toBeDefined();
    });

    it('addLayer uses default volume if not provided', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('pink_noise');
      
      expect(store.layers[0].volume).toBe(0.7);
    });

    it('addLayer clears current preset', () => {
      const store = useAmbientAudioStore.getState();
      
      store.applyPreset('focus');
      expect(store.currentPreset).toBe('focus');
      
      store.addLayer('brown_noise');
      
      expect(store.currentPreset).toBeNull();
    });

    it('removeLayer removes specific layer', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise');
      store.addLayer('pink_noise');
      const layerId = store.layers[0].id;
      
      store.removeLayer(layerId);
      
      expect(store.layers).toHaveLength(1);
      expect(store.layers[0].mode).toBe('pink_noise');
    });

    it('toggleLayer enables/disables layer', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise');
      const layerId = store.layers[0].id;
      
      store.toggleLayer(layerId, false);
      expect(store.layers[0].enabled).toBe(false);
      
      store.toggleLayer(layerId, true);
      expect(store.layers[0].enabled).toBe(true);
    });

    it('clearLayers removes all layers and preset', () => {
      const store = useAmbientAudioStore.getState();
      
      store.applyPreset('deep_work');
      expect(store.layers.length).toBeGreaterThan(0);
      expect(store.currentPreset).toBe('deep_work');
      
      store.clearLayers();
      
      expect(store.layers).toEqual([]);
      expect(store.currentPreset).toBeNull();
    });
  });

  describe('Preset Management', () => {
    it('applyPreset sets up focus preset', () => {
      const store = useAmbientAudioStore.getState();
      
      store.applyPreset('focus');
      
      expect(store.currentPreset).toBe('focus');
      expect(store.layers).toHaveLength(1);
      expect(store.layers[0].mode).toBe('binaural_alpha');
    });

    it('applyPreset sets up deep_work preset', () => {
      const store = useAmbientAudioStore.getState();
      
      store.applyPreset('deep_work');
      
      expect(store.currentPreset).toBe('deep_work');
      expect(store.layers).toHaveLength(2);
      expect(store.layers.some(l => l.mode === 'binaural_beta')).toBe(true);
      expect(store.layers.some(l => l.mode === 'brown_noise')).toBe(true);
    });

    it('applyPreset sets up creative preset', () => {
      const store = useAmbientAudioStore.getState();
      
      store.applyPreset('creative');
      
      expect(store.currentPreset).toBe('creative');
      expect(store.layers.some(l => l.mode === 'binaural_theta')).toBe(true);
    });

    it('applyPreset replaces existing layers', () => {
      const store = useAmbientAudioStore.getState();
      
      store.addLayer('white_noise');
      store.applyPreset('focus');
      
      expect(store.layers).toHaveLength(1);
      expect(store.layers[0].mode).toBe('binaural_alpha');
    });
  });

  describe('Auto-Duck Settings', () => {
    it('setAutoDuck updates auto-duck enabled state', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setAutoDuck(false);
      expect(store.autoDuckEnabled).toBe(false);
      
      store.setAutoDuck(true);
      expect(store.autoDuckEnabled).toBe(true);
    });

    it('setDuckedVolume updates ducked volume', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setDuckedVolume(0.3);
      
      expect(store.duckedVolume).toBe(0.3);
    });

    it('clamps ducked volume to 0-1 range', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setDuckedVolume(1.5);
      expect(store.duckedVolume).toBe(1);
      
      store.setDuckedVolume(-0.5);
      expect(store.duckedVolume).toBe(0);
    });
  });

  describe('Study Session Integration', () => {
    it('setAutoStartWithStudy updates setting', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setAutoStartWithStudy(true);
      
      expect(store.autoStartWithStudy).toBe(true);
    });

    it('setStudySessionAudioMode updates mode', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setStudySessionAudioMode('binaural_alpha');
      
      expect(store.studySessionAudioMode).toBe('binaural_alpha');
    });

    it('setStudySessionAudioMode accepts null', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setStudySessionAudioMode('binaural_beta');
      store.setStudySessionAudioMode(null);
      
      expect(store.studySessionAudioMode).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('setError updates error state', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setError('Test error');
      
      expect(store.error).toBe('Test error');
      expect(store.playbackState).toBe('error');
    });

    it('setError with null clears error', () => {
      const store = useAmbientAudioStore.getState();
      
      store.setError('Test error');
      store.setError(null);
      
      expect(store.error).toBeNull();
      expect(store.playbackState).toBe('idle');
    });
  });

  describe('Reset', () => {
    it('reset restores initial state', () => {
      const store = useAmbientAudioStore.getState();
      
      // Make changes
      store.play();
      store.setMasterVolume(0.8);
      store.applyPreset('focus');
      store.setAutoDuck(false);
      store.setError('Test error');
      
      // Reset
      store.reset();
      
      // Verify initial state restored
      expect(store.playbackState).toBe('idle');
      expect(store.masterVolume).toBe(0.5);
      expect(store.currentPreset).toBeNull();
      expect(store.layers).toEqual([]);
      expect(store.autoDuckEnabled).toBe(true);
      expect(store.error).toBeNull();
    });
  });
});
