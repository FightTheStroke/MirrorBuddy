# ADR 0038: WebRTC Migration to GA Realtime Protocol

## Status

Accepted (updated 2026-07-14 — GA migration complete)

## Context

MirrorBuddy uses Azure OpenAI Realtime API for real-time voice conversations with 26 AI Maestri. The original implementation used the Preview API (`gpt-4o-realtime-preview`) with flat payload format. Azure released the GA version with a different protocol, requiring migration.

## Decision

MirrorBuddy migrates voice transport to the GA realtime protocol. Preview compatibility is retained behind the `voice_ga_protocol` feature flag for rollback, but GA is enabled by default.

### Key Changes: Preview → GA

| Aspect                | Preview (deprecated)                                  | GA (current)                                                                           |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Deployment model      | `gpt-4o-realtime-preview`                             | `gpt-realtime` (v2025-08-28)                                                           |
| Mini model            | N/A                                                   | `gpt-realtime-mini` (v2025-12-15)                                                      |
| Token endpoint        | `/openai/realtime` + `api-version=2025-04-01-preview` | `/openai/v1/realtime/client_secrets` (no api-version)                                  |
| WebRTC endpoint       | N/A                                                   | `/openai/v1/realtime/calls`                                                            |
| Token request payload | `{ model: "..." }`                                    | `{ session: { type: "realtime", model: "...", audio: { output: { voice: "..." } } } }` |
| Token response        | `{ client_secret: { value, expires_at }, id }`        | `{ value, expires_at, session: { id, model } }`                                        |
| Headers               | `OpenAI-Beta: realtime=v1` required                   | No `OpenAI-Beta` header                                                                |
| Audio events          | `response.audio.delta`                                | `response.output_audio.delta`                                                          |
| Transcript events     | `response.audio_transcript.delta`                     | `response.output_audio_transcript.delta`                                               |
| session.update        | Flat `{ voice, instructions, ... }`                   | `{ type: "realtime", audio: { output: { voice } }, ... }`                              |

### Azure Deployment Configuration

- Resource: `aoai-virtualbpm-prod` (Sweden Central)
- `gpt-realtime` → model `gpt-realtime` v2025-08-28 (GA)
- `gpt-realtime-mini` → model `gpt-realtime-mini` v2025-12-15 (GA)
- API version: not needed for GA (removed from URL)

### Implementation

- `payload-builders.ts`: Extracted GA/preview format builders and response parsers
- `route.ts`: Uses `isFeatureEnabled('voice_ga_protocol')` to select format
- `event-handlers.ts`: Dual switch cases handle both GA and preview event names
- Feature flag `voice_ga_protocol`: enabled by default

## Consequences

- GA endpoint and auth flow are the default for production
- Preview guidance is removed from primary runbooks and retained only in rollback notes
- `session.type: "realtime"` is **required** in GA payload (omitting it causes `InvalidSessionType` error)
- Voice is nested under `session.audio.output.voice` (not top-level `voice` field)
- Dual event name handling ensures backward compatibility during transition
- No `OpenAI-Beta` header sent for GA requests
