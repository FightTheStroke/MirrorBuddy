// ============================================================================
// USE AMBIENT AUDIO HOOK
// React hook for controlling ambient audio engine
// ============================================================================

import { useEffect, useCallback, useMemo } from 'react';
import { useAmbientAudioStore } from '@/lib/stores/ambient-audio-store';
import { getAudioEngine } from '@/lib/audio/engine';
import { logger } from '@/lib/logger';
import type { AudioMode, AudioPreset } from '@/types';

/**
 * Hook for controlling ambient audio
 * Synchronizes Zustand store with Web Audio API engine
 */
export function useAmbientAudio() {
  const store = useAmbientAudioStore();
  const engine = useMemo(() => getAudioEngine(), []);

  // Initialize audio engine on mount
  useEffect(() => {
    const initEngine = async () => {
      try {
        await engine.initialize();
        logger.info('Ambient audio hook: engine initialized');
      } catch (error) {
        logger.error('Failed to initialize audio engine', { error });
        store.setError('Failed to initialize audio system');
      }
    };

    initEngine();

    // Cleanup on unmount
    return () => {
      engine.stopAll();
    };
  }, [engine, store]);

  // Sync store state with engine
  useEffect(() => {
    if (store.playbackState !== 'playing') return;

    // Apply layers to engine
    const syncLayers = async () => {
      try {
        // Add/update layers from store
        for (const layer of store.layers) {
          if (layer.enabled) {
            await engine.addLayer(layer);
            engine.setLayerVolume(layer.id, layer.volume);
          }
        }
      } catch (error) {
        logger.error('Failed to sync layers with engine', { error });
        store.setError('Failed to sync audio layers');
      }
    };

    syncLayers();
  }, [engine, store, store.layers, store.playbackState]);

  // Sync master volume
  useEffect(() => {
    engine.setMasterVolume(store.masterVolume);
  }, [engine, store.masterVolume]);

  // Handle play/pause/stop
  const play = useCallback(async () => {
    try {
      await engine.resume();
      store.play();
    } catch (error) {
      logger.error('Failed to play audio', { error });
      store.setError('Failed to start audio playback');
    }
  }, [engine, store]);

  const pause = useCallback(() => {
    store.pause();
  }, [store]);

  const stop = useCallback(() => {
    engine.stopAll();
    store.stop();
  }, [engine, store]);

  // Layer management
  const addLayer = useCallback((mode: AudioMode, volume = 0.7) => {
    store.addLayer(mode, volume);
  }, [store]);

  const removeLayer = useCallback((layerId: string) => {
    engine.removeLayer(layerId);
    store.removeLayer(layerId);
  }, [engine, store]);

  const setLayerVolume = useCallback((layerId: string, volume: number) => {
    engine.setLayerVolume(layerId, volume);
    store.setLayerVolume(layerId, volume);
  }, [engine, store]);

  const toggleLayer = useCallback((layerId: string, enabled: boolean) => {
    engine.toggleLayer(layerId, enabled);
    store.toggleLayer(layerId, enabled);
  }, [engine, store]);

  // Preset management
  const applyPreset = useCallback((preset: AudioPreset) => {
    engine.stopAll();
    store.applyPreset(preset);
  }, [engine, store]);

  // Master volume control
  const setMasterVolume = useCallback((volume: number) => {
    store.setMasterVolume(volume);
  }, [store]);

  // Ducking for voice/TTS integration
  const duck = useCallback(() => {
    engine.duck(store.duckedVolume);
    store.duck();
  }, [engine, store]);

  const unduck = useCallback(() => {
    engine.unduck();
    store.unduck();
  }, [engine, store]);

  return {
    // State
    playbackState: store.playbackState,
    masterVolume: store.masterVolume,
    currentPreset: store.currentPreset,
    layers: store.layers,
    error: store.error,
    autoDuckEnabled: store.autoDuckEnabled,
    duckedVolume: store.duckedVolume,
    autoStartWithStudy: store.autoStartWithStudy,
    studySessionAudioMode: store.studySessionAudioMode,
    
    // Controls
    play,
    pause,
    stop,
    addLayer,
    removeLayer,
    setLayerVolume,
    toggleLayer,
    applyPreset,
    setMasterVolume,
    clearLayers: store.clearLayers,
    
    // Ducking
    duck,
    unduck,
    setAutoDuck: store.setAutoDuck,
    setDuckedVolume: store.setDuckedVolume,
    
    // Study integration
    setAutoStartWithStudy: store.setAutoStartWithStudy,
    setStudySessionAudioMode: store.setStudySessionAudioMode,

    // Pomodoro integration (ADR-0018)
    autoStartWithPomodoro: store.autoStartWithPomodoro,
    pauseDuringBreak: store.pauseDuringBreak,
    pomodoroPreset: store.pomodoroPreset,
    setAutoStartWithPomodoro: store.setAutoStartWithPomodoro,
    setPauseDuringBreak: store.setPauseDuringBreak,
    setPomodoroPreset: store.setPomodoroPreset,

    // Engine state
    engineState: engine.getState(),
  };
}
