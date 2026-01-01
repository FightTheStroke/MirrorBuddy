# Ambient Audio System

On-demand documentation for the ambient audio feature (Issue #71).

## Overview

Procedural audio generation for focus and study sessions. All sounds are generated in real-time using Web Audio API - no audio files needed.

## Sound Types

### Noise Generators
| Mode | Description |
|------|-------------|
| `white_noise` | Equal energy across frequencies |
| `pink_noise` | 1/f spectrum, more natural |
| `brown_noise` | 1/f² spectrum, deeper rumble |

### Binaural Beats
| Mode | Frequency | Effect |
|------|-----------|--------|
| `binaural_alpha` | 10 Hz | Relaxed focus |
| `binaural_beta` | 20 Hz | Active concentration |
| `binaural_theta` | 6 Hz | Creative, meditative |

### Ambient Sounds
| Mode | Description |
|------|-------------|
| `rain` | Filtered noise with rain drops |
| `thunderstorm` | Rain + thunder rumbles |
| `fireplace` | Crackling fire sounds |
| `cafe` | Murmur + subtle clinks |
| `library` | Quiet ambience, page turns |
| `forest` | Wind + bird chirps |
| `ocean` | Waves with rhythm |

## Presets

| Preset | Layers |
|--------|--------|
| `focus` | binaural_alpha |
| `deep_work` | binaural_beta + brown_noise |
| `creative` | binaural_theta + forest |
| `rainy_day` | rain + fireplace + thunderstorm |
| `nature` | forest + ocean |
| `library` | library + white_noise |
| `starbucks` | cafe |

## Key Files

- `src/lib/audio/generators.ts` - Sound generators
- `src/lib/audio/engine.ts` - Web Audio engine
- `src/lib/stores/ambient-audio-store.ts` - Zustand store
- `src/lib/hooks/use-ambient-audio.ts` - React hook
- `src/components/ambient-audio/` - UI components

## Voice Integration (ADR-0018)

Audio auto-pauses when voice session is active:
- `useVoiceSessionStore.isConnected` triggers pause
- Resumes automatically when voice session ends
- Prevents conflicts with TTS/voice input

## Pomodoro Integration

Settings in store:
- `autoStartWithPomodoro` - Start audio on focus phase
- `pauseDuringBreak` - Pause during breaks
- `pomodoroPreset` - Which preset to use

## Usage in Components

```tsx
import { useAmbientAudio } from '@/lib/hooks/use-ambient-audio';

function MyComponent() {
  const { play, pause, applyPreset, playbackState } = useAmbientAudio();

  // Apply a preset and play
  applyPreset('focus');
  play();
}
```

## Header Widget

`AmbientAudioHeaderWidget` provides quick access:
- Preset buttons (Focus, Deep Work, Creative, Rain)
- Play/pause/stop controls
- Volume slider
- Link to full settings
