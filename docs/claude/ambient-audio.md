# Ambient Audio

> Procedural audio system with noise generation, binaural beats, and presets for focus/relaxation

## Quick Reference

| Key       | Value                                             |
| --------- | ------------------------------------------------- |
| Path      | `src/lib/audio/`, `src/components/ambient-audio/` |
| Store     | `src/lib/stores/ambient-audio-store.ts`           |
| Hook      | `src/lib/hooks/use-ambient-audio.ts`              |
| ADR       | 0018 (audio coordination)                         |
| Test page | `/test-audio`                                     |

## Architecture

The system uses Web Audio API for real-time procedural generation. Three layers: Zustand store (state), React hook (sync), and Audio Engine (Web Audio API singleton). All audio is generated client-side with no server calls.

Audio coordination (ADR 0018) follows auto-pause strategy: when a voice session starts, ambient audio pauses automatically and resumes when the session ends. This avoids mixing complexity and prevents ambient sounds from interfering with VAD.

Pomodoro integration: ambient auto-starts during focus phases and optionally pauses during breaks. Settings: `autoStartWithPomodoro`, `pauseDuringBreak`, `pomodoroPreset`.

## Audio Modes

| Category       | Modes                                                                              | Notes                     |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| Noise          | `white_noise`, `pink_noise`, `brown_noise`                                         | Procedural generation     |
| Binaural Beats | `binaural_alpha` (8-14Hz), `binaural_beta` (14-30Hz), `binaural_theta` (4-8Hz)     | Require stereo headphones |
| Soundscapes    | `rain`, `thunderstorm`, `fireplace`, `cafe`, `library`, `forest`, `ocean`, `night` | Ambient samples           |

## Presets

| Preset    | Composition            | Best For          |
| --------- | ---------------------- | ----------------- |
| Focus     | Binaural Alpha         | General study     |
| Deep Work | Beta + Brown Noise     | Problem-solving   |
| Creative  | Theta + Nature         | Brainstorming     |
| Library   | White Noise + Ambience | Simulated library |
| Rainy Day | Rain + Fireplace       | Cozy atmosphere   |

## Key Files

| File                                                     | Purpose                        |
| -------------------------------------------------------- | ------------------------------ |
| `src/lib/audio/engine.ts`                                | Web Audio API singleton engine |
| `src/lib/audio/generators.ts`                            | Procedural audio generators    |
| `src/lib/stores/ambient-audio-store.ts`                  | Zustand state management       |
| `src/lib/hooks/use-ambient-audio.ts`                     | React integration hook         |
| `src/components/ambient-audio/ambient-audio-control.tsx` | UI control panel               |
| `src/types/audio.ts`                                     | TypeScript types               |

## Code Patterns

```typescript
import { useAmbientAudio } from "@/lib/hooks/use-ambient-audio";

const { play, pause, applyPreset, duck, unduck, setMasterVolume } =
  useAmbientAudio();

// Start focus preset
applyPreset("focus");
play();

// Duck volume during voice playback (auto-ducking)
duck(); // Reduces to duckedVolume (default 0.2)
unduck(); // Restores original volume

// Custom layer mixer
const { addLayer, removeLayer, setLayerVolume, toggleLayer } =
  useAmbientAudio();
addLayer({ id: "rain-1", mode: "rain", volume: 0.5, enabled: true });
```

## Performance

CPU: ~1-2% | Memory: <30MB | Latency: <10ms start | Battery: minimal impact

## See Also

- `docs/technical/AMBIENT_AUDIO.md` -- Full feature documentation with scientific references
- `docs/adr/0018-audio-coordination.md` -- Voice/ambient coordination strategy
- `docs/claude/pomodoro.md` -- Pomodoro timer integration
