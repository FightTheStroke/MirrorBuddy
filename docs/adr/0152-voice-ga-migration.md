# ADR 0152: Azure OpenAI Realtime GA Migration

## Status

Accepted

## Context

MirrorBuddy's voice system was using the Azure OpenAI Realtime **Preview** API
(`gpt-4o-realtime-preview`) with flat payload format. In production, the ephemeral
token endpoint returned HTTP 400 `InvalidSessionType` because the Azure deployment
had already been upgraded to GA model `gpt-realtime` (v2025-08-28), but our code
still sent the preview payload format.

### Root Cause

GA requires `session.type = "realtime"` in the token request payload. Preview
used a flat `{ model: "..." }` format without the session wrapper.

## Decision

Migrate the ephemeral token endpoint to GA protocol format while retaining
preview fallback behind the `voice_ga_protocol` feature flag (enabled by default).

### Changes

1. **`payload-builders.ts`** (new): Extracted GA/preview format builders
   - `buildGAPayload()`: `{ session: { type: "realtime", model, audio: { output: { voice } } } }`
   - `buildPreviewPayload()`: `{ model }` (flat, deprecated)
   - `parseGAResponse()` / `parsePreviewResponse()`: handle different response shapes

2. **`route.ts`**: Uses `isFeatureEnabled('voice_ga_protocol')` to select format

3. **Feature flag**: `voice_ga_protocol` set to `enabled` (default)

4. **Headers**: No `OpenAI-Beta: realtime=v1` header for GA requests

5. **URL**: GA uses `/openai/v1/realtime/client_secrets` without `api-version` param

### GA vs Preview Protocol Summary

| Aspect            | Preview                                        | GA                                                                       |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Token request     | `{ model }`                                    | `{ session: { type: "realtime", model, audio: { output: { voice } } } }` |
| Token response    | `{ client_secret: { value, expires_at }, id }` | `{ value, expires_at, session: { id, model } }`                          |
| URL params        | `api-version=2025-04-01-preview`               | None                                                                     |
| Beta header       | `OpenAI-Beta: realtime=v1`                     | Not sent                                                                 |
| Event: audio      | `response.audio.delta`                         | `response.output_audio.delta`                                            |
| Event: transcript | `response.audio_transcript.delta`              | `response.output_audio_transcript.delta`                                 |

### Azure Deployment (verified via `az` CLI)

- Resource: `aoai-virtualbpm-prod` (Sweden Central)
- `gpt-4o-realtime` → model `gpt-realtime` v2025-08-28 (GA)
- `gpt-realtime-mini` → model `gpt-realtime-mini` v2025-12-15 (GA)

## Consequences

- Voice works in production with GA endpoint
- Rollback: set `voice_ga_protocol` flag to `disabled` (untested path)
- Event handlers support both GA and preview event names (dual switch cases)
- 22 tests cover both payload formats
- Preview API may be removed entirely in a future cleanup

## References

- ADR 0038: WebRTC Migration (parent decision)
- ADR 0150: Production Smoke Testing (discovery context)
- `src/app/api/realtime/ephemeral-token/payload-builders.ts`
- `src/app/api/realtime/ephemeral-token/route.ts`
- `docs/technical/AZURE_REALTIME_API.md`
