// ============================================================================
// AMBIENT AUDIO TYPES - Focus Modes, Presets, Playback State
// ============================================================================

/**
 * Audio focus modes for procedural generation and ambient sounds.
 */
export type AudioMode =
  | 'white_noise'
  | 'pink_noise'
  | 'brown_noise'
  | 'binaural_alpha'    // 8-14 Hz - Relaxed focus
  | 'binaural_beta'     // 14-30 Hz - Active concentration
  | 'binaural_theta'    // 4-8 Hz - Creative, meditative
  | 'rain'
  | 'thunderstorm'
  | 'fireplace'
  | 'cafe'
  | 'library'
  | 'forest'
  | 'ocean'
  | 'night';

/**
 * Preset combinations of audio modes.
 */
export type AudioPreset =
  | 'deep_work'        // Binaural beta + brown noise
  | 'library'          // Quiet ambience + white noise
  | 'starbucks'        // Café + soft lo-fi
  | 'rainy_day'        // Rain + fireplace + thunder
  | 'nature'           // Forest + birds + wind
  | 'focus'            // Binaural alpha
  | 'creative';        // Binaural theta + nature

/**
 * Playback state of ambient audio system.
 */
export type AudioPlaybackState = 'idle' | 'playing' | 'paused' | 'loading' | 'error';

/**
 * Configuration for a single audio layer in the mixer.
 */
export interface AudioLayer {
  id: string;
  mode: AudioMode;
  volume: number;      // 0-1
  enabled: boolean;
}

/**
 * Ambient audio system state.
 */
export interface AmbientAudioState {
  playbackState: AudioPlaybackState;
  masterVolume: number;        // 0-1
  currentPreset: AudioPreset | null;
  layers: AudioLayer[];
  // Auto-ducking: reduce volume during voice/TTS
  autoDuckEnabled: boolean;
  duckedVolume: number;        // Volume to reduce to when ducking (0-1)
  // Integration with study sessions
  autoStartWithStudy: boolean;
  studySessionAudioMode: AudioMode | null;
  // Error state
  error: string | null;
}
