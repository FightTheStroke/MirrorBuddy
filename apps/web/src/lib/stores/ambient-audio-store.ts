// ============================================================================
// AMBIENT AUDIO STORE (Zustand)
// Manages ambient audio state and playback control
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { AudioMode, AudioPreset, AudioPlaybackState, AudioLayer } from '@/types';

// Preset configurations mapping to audio layer combinations
const PRESET_CONFIGS: Record<AudioPreset, AudioMode[]> = {
  deep_work: ['binaural_beta', 'brown_noise'],
  library: ['library', 'white_noise'],
  starbucks: ['cafe'],
  rainy_day: ['rain', 'fireplace', 'thunderstorm'],
  nature: ['forest', 'ocean'],
  focus: ['binaural_alpha'],
  creative: ['binaural_theta', 'forest'],
};

interface AmbientAudioStore {
  // State
  playbackState: AudioPlaybackState;
  masterVolume: number;
  currentPreset: AudioPreset | null;
  layers: AudioLayer[];
  autoDuckEnabled: boolean;
  duckedVolume: number;
  autoStartWithStudy: boolean;
  studySessionAudioMode: AudioMode | null;
  error: string | null;
  // Pomodoro integration (ADR-0018)
  autoStartWithPomodoro: boolean;
  pauseDuringBreak: boolean;
  pomodoroPreset: AudioPreset;

  // Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setMasterVolume: (volume: number) => void;
  setLayerVolume: (layerId: string, volume: number) => void;
  toggleLayer: (layerId: string, enabled: boolean) => void;
  addLayer: (mode: AudioMode, volume?: number) => void;
  removeLayer: (layerId: string) => void;
  clearLayers: () => void;
  applyPreset: (preset: AudioPreset) => void;
  setAutoDuck: (enabled: boolean) => void;
  setDuckedVolume: (volume: number) => void;
  duck: () => void;
  unduck: () => void;
  setAutoStartWithStudy: (enabled: boolean) => void;
  setStudySessionAudioMode: (mode: AudioMode | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  // Pomodoro integration (ADR-0018)
  setAutoStartWithPomodoro: (enabled: boolean) => void;
  setPauseDuringBreak: (enabled: boolean) => void;
  setPomodoroPreset: (preset: AudioPreset) => void;
}

const initialState = {
  playbackState: 'idle' as AudioPlaybackState,
  masterVolume: 0.5,
  currentPreset: null as AudioPreset | null,
  layers: [] as AudioLayer[],
  autoDuckEnabled: true,
  duckedVolume: 0.2,
  autoStartWithStudy: false,
  studySessionAudioMode: null as AudioMode | null,
  error: null as string | null,
  // Pomodoro integration (ADR-0018)
  autoStartWithPomodoro: false,
  pauseDuringBreak: true,
  pomodoroPreset: 'focus' as AudioPreset,
};

export const useAmbientAudioStore = create<AmbientAudioStore>((set, get) => ({
  ...initialState,

  play: () => {
    logger.info('Ambient audio: play');
    set({ playbackState: 'playing', error: null });
  },

  pause: () => {
    logger.info('Ambient audio: pause');
    set({ playbackState: 'paused' });
  },

  stop: () => {
    logger.info('Ambient audio: stop');
    set({ playbackState: 'idle' });
  },

  setMasterVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    logger.info('Ambient audio: set master volume', { volume: clampedVolume });
    set({ masterVolume: clampedVolume });
  },

  setLayerVolume: (layerId: string, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    logger.info('Ambient audio: set layer volume', { layerId, volume: clampedVolume });
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, volume: clampedVolume } : layer
      ),
    }));
  },

  toggleLayer: (layerId: string, enabled: boolean) => {
    logger.info('Ambient audio: toggle layer', { layerId, enabled });
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, enabled } : layer
      ),
    }));
  },

  addLayer: (mode: AudioMode, volume = 0.7) => {
    const id = `${mode}-${Date.now()}`;
    logger.info('Ambient audio: add layer', { mode, id });
    set((state) => ({
      layers: [...state.layers, { id, mode, volume, enabled: true }],
      currentPreset: null, // Clear preset when manually adding layers
    }));
  },

  removeLayer: (layerId: string) => {
    logger.info('Ambient audio: remove layer', { layerId });
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== layerId),
    }));
  },

  clearLayers: () => {
    logger.info('Ambient audio: clear all layers');
    set({ layers: [], currentPreset: null });
  },

  applyPreset: (preset: AudioPreset) => {
    logger.info('Ambient audio: apply preset', { preset });
    const modes = PRESET_CONFIGS[preset];
    const layers: AudioLayer[] = modes.map((mode, index) => ({
      id: `${mode}-${Date.now()}-${index}`,
      mode,
      volume: 0.7,
      enabled: true,
    }));
    set({ layers, currentPreset: preset });
  },

  setAutoDuck: (enabled: boolean) => {
    logger.info('Ambient audio: set auto-duck', { enabled });
    set({ autoDuckEnabled: enabled });
  },

  setDuckedVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    logger.info('Ambient audio: set ducked volume', { volume: clampedVolume });
    set({ duckedVolume: clampedVolume });
  },

  duck: () => {
    // Temporarily reduce volume (called during TTS/voice playback)
    const { autoDuckEnabled } = get();
    if (autoDuckEnabled) {
      logger.info('Ambient audio: ducking volume');
      // Volume reduction is handled by the audio engine
    }
  },

  unduck: () => {
    // Restore volume after TTS/voice playback
    const { autoDuckEnabled } = get();
    if (autoDuckEnabled) {
      logger.info('Ambient audio: restoring volume');
      // Volume restoration is handled by the audio engine
    }
  },

  setAutoStartWithStudy: (enabled: boolean) => {
    logger.info('Ambient audio: set auto-start with study', { enabled });
    set({ autoStartWithStudy: enabled });
  },

  setStudySessionAudioMode: (mode: AudioMode | null) => {
    logger.info('Ambient audio: set study session audio mode', { mode });
    set({ studySessionAudioMode: mode });
  },

  setError: (error: string | null) => {
    logger.error('Ambient audio: error', { errorMessage: error });
    set({ error, playbackState: error ? 'error' : 'idle' });
  },

  reset: () => {
    logger.info('Ambient audio: reset to initial state');
    set(initialState);
  },

  // Pomodoro integration (ADR-0018)
  setAutoStartWithPomodoro: (enabled: boolean) => {
    logger.info('Ambient audio: set auto-start with pomodoro', { enabled });
    set({ autoStartWithPomodoro: enabled });
  },

  setPauseDuringBreak: (enabled: boolean) => {
    logger.info('Ambient audio: set pause during break', { enabled });
    set({ pauseDuringBreak: enabled });
  },

  setPomodoroPreset: (preset: AudioPreset) => {
    logger.info('Ambient audio: set pomodoro preset', { preset });
    set({ pomodoroPreset: preset });
  },
}));
