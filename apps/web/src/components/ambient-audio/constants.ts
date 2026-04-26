import type { AudioMode, AudioPreset } from '@/types';

export const AUDIO_MODES: { mode: AudioMode; label: string; icon: string; category: string }[] = [
  { mode: 'white_noise', label: 'Rumore Bianco', icon: '⚪', category: 'noise' },
  { mode: 'pink_noise', label: 'Rumore Rosa', icon: '🟣', category: 'noise' },
  { mode: 'brown_noise', label: 'Rumore Marrone', icon: '🟤', category: 'noise' },
  { mode: 'binaural_alpha', label: 'Alpha (Focus)', icon: '🧘', category: 'binaural' },
  { mode: 'binaural_beta', label: 'Beta (Concentrazione)', icon: '⚡', category: 'binaural' },
  { mode: 'binaural_theta', label: 'Theta (Creatività)', icon: '✨', category: 'binaural' },
  { mode: 'rain', label: 'Pioggia', icon: '🌧️', category: 'ambient' },
  { mode: 'thunderstorm', label: 'Temporale', icon: '⛈️', category: 'ambient' },
  { mode: 'fireplace', label: 'Camino', icon: '🔥', category: 'ambient' },
  { mode: 'cafe', label: 'Caffè', icon: '☕', category: 'ambient' },
  { mode: 'library', label: 'Biblioteca', icon: '📚', category: 'ambient' },
  { mode: 'forest', label: 'Foresta', icon: '🌲', category: 'ambient' },
  { mode: 'ocean', label: 'Oceano', icon: '🌊', category: 'ambient' },
  { mode: 'night', label: 'Notte', icon: '🌙', category: 'ambient' },
];

export const PRESETS: { preset: AudioPreset; label: string; description: string }[] = [
  { preset: 'focus', label: 'Focus', description: 'Binaural alpha per concentrazione' },
  { preset: 'deep_work', label: 'Lavoro Profondo', description: 'Beta + rumore marrone' },
  { preset: 'creative', label: 'Creatività', description: 'Theta + natura' },
  { preset: 'library', label: 'Biblioteca', description: 'Ambiente tranquillo' },
  { preset: 'starbucks', label: 'Starbucks', description: 'Atmosfera caffè' },
  { preset: 'rainy_day', label: 'Giorno di Pioggia', description: 'Pioggia + camino' },
  { preset: 'nature', label: 'Natura', description: 'Foresta + oceano' },
];
