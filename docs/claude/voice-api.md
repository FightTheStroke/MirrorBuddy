# Voice API

> Real-time voice conversations with AI Maestri via Azure OpenAI Realtime API (WebRTC + WebSocket fallback)

## Quick Reference

| Key          | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Path         | `src/lib/voice/`, `src/lib/hooks/voice-session/`                                           |
| API          | `POST /api/realtime/ephemeral-token`                                                       |
| ADRs         | 0038 (WebRTC), 0050 (cost guards), 0069 (adaptive VAD), 0152 (GA migration), 0159 (v1.5+) |
| Transport    | WebRTC (primary, ~200ms latency) / WebSocket (fallback, ~500ms)                            |
| Audio Format | PCM16, 24kHz, mono, base64-encoded                                                         |
| Model        | `gpt-realtime-1.5` (v1.5, default) / `gpt-realtime` (v1.0, fallback)                       |

## Models

| Model              | Version    | Purpose     | Feature Flag        | Env Var                                | Deployment Name   |
| ------------------ | ---------- | ----------- | ------------------- | -------------------------------------- | ----------------- |
| `gpt-realtime-1.5` | v2026-02-23| Voice (GA)  | `voice_realtime_15` | `AZURE_OPENAI_REALTIME_DEPLOYMENT_V15` | `gpt-realtime-15` |
| `gpt-realtime`     | v2025-08-28| Voice (GA)  | -                   | `AZURE_OPENAI_REALTIME_DEPLOYMENT`     | `gpt-realtime`    |
| `gpt-audio-1.5`    | v2026-02-23| TTS         | `tts_audio_15`      | `AZURE_OPENAI_AUDIO_DEPLOYMENT`        | `gpt-audio-15`    |
| `tts-hd`           | -          | TTS fallback| -                   | `AZURE_OPENAI_TTS_HD_DEPLOYMENT`       | `tts-hd-deployment` |

**Fallback chains** (ADR 0159):
- **Realtime**: `gpt-realtime-1.5` → `gpt-realtime`
- **TTS**: `gpt-audio-1.5` → `tts-hd` → OpenAI TTS API

`gpt-audio-1.5` uses Chat Completions API with `modalities: ["text", "audio"]` instead of dedicated TTS endpoint.

## Architecture

Voice sessions use Azure OpenAI Realtime API with adaptive transport selection. The system probes WebRTC and WebSocket in parallel, caches the result for 24h, and auto-switches on degradation. WebRTC connects directly browser-to-Azure via SDP negotiation; WebSocket routes through a local proxy that keeps the API key server-side.

VAD (Voice Activity Detection) is profile-aware (ADR 0069): each DSA accessibility profile has tuned threshold, silence duration, and noise reduction settings. For example, dyslexia uses 1500ms silence tolerance vs 700ms default.

Cost guards (ADR 0050) enforce soft cap (30 min warning) and hard cap (60 min auto-switch to text), plus P95-based spike detection with 15-min cooldown kill-switch.

## Key Files

| File                                             | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| `src/lib/hooks/voice-session/transport-probe.ts` | WebRTC/WebSocket probing                     |
| `src/lib/hooks/voice-session/adaptive-vad.ts`    | DSA profile VAD config                       |
| `src/lib/hooks/voice-session/session-config.ts`  | Session setup + instructions                 |
| `src/lib/metrics/voice-cost-guards.ts`           | Duration caps + spike protection             |
| `src/lib/stores/voice-session-store.ts`          | Zustand state (connected/listening/speaking) |
| `src/types/voice.ts`                             | TypeScript interfaces                        |
| `src/components/voice/voice-session.tsx`         | Main voice UI component                      |

## Code Patterns

```typescript
// Start cost tracking
import { startVoiceSession, updateVoiceDuration } from '@/lib/metrics/voice-cost-guards';
startVoiceSession(sessionId, userId);
const check = updateVoiceDuration(sessionId, currentMinutes);
if (!check.allowed) switchToTextMode(check.message);

// Adaptive VAD per accessibility profile
import { getAdaptiveVadConfig } from '@/lib/hooks/voice-session/adaptive-vad';
const vadConfig = getAdaptiveVadConfig('dyslexia');
// { threshold: 0.55, silence_duration_ms: 1500, prefix_padding_ms: 400 }

// Voice session store
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
const { isConnected, isSpeaking, isListening } = useVoiceSessionStore();
```

## Critical Notes

- **Preview vs GA API**: GA is default (`voice_ga_protocol=enabled`). Event names differ (`response.audio.delta` vs `response.output_audio.delta`). Both handled in switch statements. GA token payload requires `session.type: "realtime"` wrapper (ADR 0152).
- **v1.5 vs v1.0**: v1.5 is default (`voice_realtime_15=enabled`). Both use GA protocol. Fallback to v1.0 if v1.5 deployment unavailable.
- **TTS: gpt-audio-1.5**: Uses Chat Completions endpoint (`POST /chat/completions`) with `modalities: ["text", "audio"]` instead of `/audio/speech`. Requires `tts_audio_15=enabled`.
- **48kHz to 24kHz**: Browser captures at 48kHz; must resample to 24kHz before sending to Azure.
- **Stale closure**: Use `useRef` pattern for WebSocket `onmessage` handler to avoid stale React closures.
- **CSP**: `connect-src` must include `*.openai.azure.com` for GA Realtime API (WebRTC SDP exchange).

## See Also

- `docs/technical/AZURE_REALTIME_API.md` -- Full technical reference with debug checklist
- `docs/adr/0038-webrtc-migration.md` -- Transport selection and rollout strategy
- `docs/adr/0050-voice-cost-guards.md` -- Cost sustainability controls
- `docs/adr/0069-adaptive-vad-accessibility-profiles.md` -- DSA-aware VAD tuning
- `docs/adr/0159-gpt-realtime-15-audio-15.md` -- v1.5 models and fallback chains
- `.claude/rules/accessibility.md` -- 7 DSA profiles
