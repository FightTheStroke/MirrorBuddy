# ADR 0159: GPT-Realtime-1.5 and GPT-Audio-1.5 Migration

## Status

Accepted

## Context

MirrorBuddy uses `gpt-realtime` (v2025-08-28) for WebRTC voice with 26 Maestri.
OpenAI released GA models `gpt-realtime-1.5` and `gpt-audio-1.5` (2026-02-23)
with better multilingual support, tool calling, and instruction following.

### Current Voice Stack

- Realtime API: `gpt-realtime` v2025-08-28 (GA protocol per ADR 0152)
- TTS: `tts-hd` via audio/speech endpoint (ArrayBuffer response)
- Use case: Real-time voice with 26 Maestri across 5 locales (it/en/fr/de/es)

### New Models

- **gpt-realtime-1.5**: Better multilingual accuracy, improved tool calls
- **gpt-audio-1.5**: TTS via Chat Completions API (base64 response)

## Decision

Migrate to `gpt-realtime-1.5` for voice and add `gpt-audio-1.5` as TTS provider,
behind feature flags for controlled rollout.

### Changes

| File                                            | Change                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `src/app/api/realtime/ephemeral-token/route.ts` | Check `voice_realtime_15` flag → use v1.5 deployment          |
| `src/app/api/realtime/token/route.ts`           | Same flag check for non-ephemeral tokens                       |
| `src/lib/ai/deployment-mapping.ts`              | Add `AZURE_OPENAI_REALTIME_DEPLOYMENT_V15` mapping             |
| `src/app/api/voice/tts/route.ts`                | Check `tts_audio_15` flag → Chat Completions w/ audio modality |

### Feature Flags

- `voice_realtime_15`: Controls realtime API version (default: `disabled`)
- `tts_audio_15`: Controls TTS provider (default: `disabled`)

### Environment Variables

```bash
AZURE_OPENAI_REALTIME_DEPLOYMENT_V15=gpt-realtime-15  # v1.5 deployment
AZURE_OPENAI_AUDIO_DEPLOYMENT=gpt-audio-15            # TTS deployment
```

### TTS Architecture Change

| Model      | API                    | Response Format                           |
| ---------- | ---------------------- | ----------------------------------------- |
| `tts-hd`   | `/audio/speech`        | `ArrayBuffer` (binary audio)              |
| `audio-1.5`| Chat Completions       | `choices[0].message.audio.data` (base64)  |

**New TTS Flow (when `tts_audio_15` enabled)**:

1. Request: `{ model: "gpt-audio-1.5", messages: [...], modalities: ["text", "audio"], audio: { voice, format } }`
2. Response: `{ choices: [{ message: { audio: { id, data: "<base64>", expires_at, transcript } } }] }`
3. Decode base64 → send to client

### Deployment Strategy

1. Deploy with flags `disabled` (both models available, old in use)
2. Enable `voice_realtime_15` for new sessions (test in production)
3. Monitor error rates, latency, voice quality
4. Enable `tts_audio_15` after realtime validation
5. Keep old deployments for 30 days

### Rollback Plan

1. Toggle feature flag to `disabled` (affects new sessions only)
2. Active sessions continue with their initial model
3. Old Azure deployments (`gpt-realtime`, `tts-hd`) remain deployed

## Consequences

### Positive

- Better multilingual accuracy (5 locales)
- Improved tool calling (maestri use 8+ tools)
- Unified TTS API (Chat Completions vs separate endpoint)
- Feature flag safety net

### Negative

- TTS response format change (base64 decoding step)
- Dual codepaths for 30-day transition
- Requires new Azure deployments

### Testing

- Unit: TTS response parsing (base64 → ArrayBuffer)
- E2E: Voice sessions with new model (smoke test)
- Load: Token generation latency under `voice_realtime_15`

## References

- ADR 0152: Voice GA Migration (parent decision)
- ADR 0038: WebRTC Migration
- `src/app/api/realtime/ephemeral-token/route.ts`
- `src/app/api/voice/tts/route.ts`
- `src/lib/ai/deployment-mapping.ts`
