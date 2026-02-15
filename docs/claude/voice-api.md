# Voice API

> Real-time voice conversations with AI Maestri via Azure OpenAI Realtime API (WebRTC + WebSocket fallback)

## Quick Reference

| Key          | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Path         | `src/lib/voice/`, `src/lib/hooks/voice-session/`                            |
| API          | `POST /api/realtime/ephemeral-token`                                        |
| ADRs         | 0038 (WebRTC), 0050 (cost guards), 0069 (adaptive VAD), 0152 (GA migration) |
| Transport    | WebRTC (primary, ~200ms latency) / WebSocket (fallback, ~500ms)             |
| Audio Format | PCM16, 24kHz, mono, base64-encoded                                          |
| Model        | `gpt-realtime` (GA API)                                                     |

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
- **48kHz to 24kHz**: Browser captures at 48kHz; must resample to 24kHz before sending to Azure.
- **Stale closure**: Use `useRef` pattern for WebSocket `onmessage` handler to avoid stale React closures.
- **CSP**: `connect-src` must include `*.openai.azure.com` for GA Realtime API (WebRTC SDP exchange).

## See Also

- `docs/technical/AZURE_REALTIME_API.md` -- Full technical reference with debug checklist
- `docs/adr/0038-webrtc-migration.md` -- Transport selection and rollout strategy
- `docs/adr/0050-voice-cost-guards.md` -- Cost sustainability controls
- `docs/adr/0069-adaptive-vad-accessibility-profiles.md` -- DSA-aware VAD tuning
- `.claude/rules/accessibility.md` -- 7 DSA profiles
