# MirrorBuddy Voice Architecture Audit Report

**Date**: 14 February 2026
**Author**: Claude Opus 4.6 (automated audit)
**Scope**: Azure OpenAI Realtime API WebRTC implementation
**Sources verified**: Azure docs (updated 14 Feb 2026), OpenAI docs, migration guide

---

## EXECUTIVE SUMMARY

MirrorBuddy's voice implementation uses the **Preview (Beta) protocol** which is
**deprecated as of 30 April 2026**. The GA protocol (available since September 2025) introduces breaking changes to endpoints, authentication, session
configuration, and event naming. Migration is urgent.

Additionally, several connection-time optimizations can reduce perceived latency
by ~50%. A "phone ring" UX pattern is viable and recommended as a complementary
measure.

---

## SECTION 1: GA vs PREVIEW - BREAKING CHANGES

### 1.1 Endpoint URLs (CRITICAL)

| Component       | PREVIEW (current MirrorBuddy)                                                                         | GA (required)                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Ephemeral token | `POST https://{resource}.openai.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview` | `POST https://{resource}.openai.azure.com/openai/v1/realtime/client_secrets` |
| WebRTC SDP      | `POST https://{region}.realtimeapi-preview.ai.azure.com/v1/realtimertc?model={deployment}`            | `POST https://{resource}.openai.azure.com/openai/v1/realtime/calls`          |
| WebSocket       | `wss://{resource}.openai.azure.com/openai/realtime?...&api-version=2025-04-01-preview`                | `wss://{resource}.openai.azure.com/openai/v1/realtime`                       |

**Key change**: GA uses the **resource endpoint directly** for WebRTC
(`/openai/v1/realtime/calls`), not a separate regional domain. This eliminates
the `AZURE_OPENAI_REALTIME_REGION` env var and the separate CSP entry for
`*.realtimeapi-preview.ai.azure.com`.

Source: [Azure migration guide](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-preview-api-migration-guide?view=foundry-classic) (updated 28 Jan 2026)

### 1.2 API Version

- PREVIEW: `api-version=2025-04-01-preview` required in URL
- GA: **No api-version parameter**. URL contains `/openai/v1/` instead.

### 1.3 Session Configuration in Token Request (CRITICAL)

In GA, the session configuration (instructions, voice, model) is sent **WITH**
the `client_secrets` request, not as a separate `session.update` after
connection. This has major latency implications.

**GA token request body**:

```json
{
  "session": {
    "type": "realtime",
    "model": "<deployment>",
    "instructions": "You are a helpful assistant.",
    "audio": {
      "output": {
        "voice": "marin"
      }
    }
  }
}
```

**Impact on MirrorBuddy**: Currently we:

1. Get ephemeral token (no session config)
2. Connect WebRTC
3. Wait for data channel open
4. Fetch conversation memory + adaptive context (sequential!)
5. Send session.update with full config
6. Wait for session.updated
7. Send greeting

With GA, steps 1+5 merge. The session is pre-configured when the token is
issued, so the model is ready immediately after WebRTC connects.

### 1.4 Event Name Changes

| PREVIEW (current)                 | GA (required)                            |
| --------------------------------- | ---------------------------------------- |
| `response.text.delta`             | `response.output_text.delta`             |
| `response.audio.delta`            | `response.output_audio.delta`            |
| `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

MirrorBuddy's event handler (`event-handlers.ts:182-186`) already handles both
`response.audio.delta` AND `response.output_audio.delta`, so partial
compatibility exists. But `response.text.delta` is not handled (unused in voice
mode, so low risk).

### 1.5 Session Update Event Changes

The `session.update` event now requires a `type` field:

- `"realtime"` for speech-to-speech
- `"transcription"` for realtime audio transcription

Current MirrorBuddy `session.update` does NOT include this field.

### 1.6 OpenAI-Beta Header

GA: Do NOT include the `OpenAI-Beta:` header. Verify MirrorBuddy does not send
it (current code does not appear to).

### 1.7 SDK Requirements

GA protocol requires OpenAI SDKs:

- TypeScript: `openai-node` (not Azure-specific)
- .NET: `openai-dotnet` v2.9.0+
- Microsoft Preview SDKs do NOT support GA protocol

### 1.8 WebRTC Filter (NEW FEATURE)

GA adds `?webrtcfilter=on` query parameter to `/v1/realtime/calls`. When
enabled, limits data channel messages to the browser, keeping prompt
instructions private. Only these events pass through:

- `input_audio_buffer.speech_started`
- `input_audio_buffer.speech_stopped`
- `output_audio_buffer.started`
- `output_audio_buffer.stopped`
- `conversation.item.input_audio_transcription.completed`
- `conversation.item.added`
- `conversation.item.created`
- `response.output_text.delta`
- `response.output_text.done`
- `response.output_audio_transcript.delta`
- `response.output_audio_transcript.done`

**Impact**: MirrorBuddy sends tool calls and receives tool results via data
channel. With `webrtcfilter=on`, tool-related events would be blocked. We should
NOT enable this filter unless we move tool handling server-side.

### 1.9 WebSocket Observer (NEW FEATURE)

GA allows creating a WebSocket sideband connection to observe/control a WebRTC
call. When the SDP exchange returns HTTP 201, the `Location` header contains a
call ID. A server can connect via WebSocket to:

```
wss://{resource}.openai.azure.com/openai/v1/realtime?call_id={call_id}
```

This enables server-side recording, monitoring, and control without proxying
audio. Could be valuable for:

- Session recording for compliance
- Real-time monitoring dashboard
- Server-side tool execution

### 1.10 Models Available (GA)

| Model                          | Version    | Notes                   |
| ------------------------------ | ---------- | ----------------------- |
| `gpt-4o-realtime-preview`      | 2024-12-17 | Preview only            |
| `gpt-4o-mini-realtime-preview` | 2024-12-17 | Preview only            |
| `gpt-realtime`                 | 2025-08-28 | **GA - recommended**    |
| `gpt-realtime-mini`            | 2025-10-06 | **GA - cost-optimized** |
| `gpt-realtime-mini-2025-12-15` | 2025-12-15 | **GA - latest mini**    |

Regions: East US 2, Sweden Central (global deployments).

---

## SECTION 2: CONNECTION FLOW PROBLEMS (VERIFIED)

### 2.1 CONFIRMED: ICE Servers Are Unnecessary

**Evidence from GA docs** (Azure sample code, 14 Feb 2026):

```javascript
let peerConnection = new RTCPeerConnection();
```

No ICE servers at all. Not even an empty array -- just the default constructor.
The GA sample does NOT use any STUN servers.

**MirrorBuddy current code** (`webrtc-types.ts:56-59`):

```typescript
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

**Impact**: Google STUN queries add 100-500ms to ICE gathering, with zero
benefit for client-to-Azure-server connections.

**Fix**: `new RTCPeerConnection()` with no config, or `{ iceServers: [] }`.

### 2.2 CONFIRMED: ICE Gathering Wait Is Unnecessary

**Evidence from GA docs** (Azure sample code):

```javascript
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
// IMMEDIATELY sends SDP -- no ICE gathering wait
const sdpResponse = await fetch(WEBRTC_URL, { ... body: offer.sdp ... });
```

**MirrorBuddy current code** (`webrtc-connection.ts:293-306`):

```typescript
if (this.peerConnection.iceGatheringState !== 'complete') {
  await new Promise<void>((resolve) => {
    // ... waits for 'icegatheringstatechange' to 'complete'
  });
}
```

**Impact**: 200-500ms wasted waiting for STUN queries to complete.

**Fix**: Remove the ICE gathering wait. Send offer immediately after
`setLocalDescription()`.

### 2.3 CONFIRMED: Double Fetch in SDP Exchange

**Current flow** (`webrtc-connection.ts:309-346`):

1. `GET /api/realtime/token` -- fetches `webrtcEndpoint` (static value)
2. `POST webrtcEndpoint` -- actual SDP exchange

**GA flow**: The WebRTC URL is deterministic:
`https://{resource}.openai.azure.com/openai/v1/realtime/calls`

No need for a separate fetch. The endpoint can be returned with the ephemeral
token or hardcoded.

**Impact**: 100-300ms wasted on unnecessary HTTP round-trip.

### 2.4 CONFIRMED: Sequential Fetches in Session Config

**Current flow** (`session-config.ts:101-124`):

```typescript
// Sequential fetch 1
const memory = await fetchConversationMemory(maestro.id);
// Sequential fetch 2
const response = await fetch('/api/adaptive/context?...');
```

**Fix**: `Promise.all()` or, better, pre-fetch during connection setup (parallel
with token + getUserMedia).

### 2.5 CORRECTION: PCM16 Config

My previous analysis suggested PCM16 might be a problem. After reviewing the GA
docs more carefully:

- WebRTC transport: audio goes via **media tracks** using Opus natively
- The `input_audio_format`/`output_audio_format` fields in `session.update`
  apply to **WebSocket data channel audio**, not WebRTC media tracks
- In GA, audio format config is part of the session configuration sent with
  `client_secrets`, not `session.update`

**Current MirrorBuddy**: Sets `pcm16` format in `session.update`. Since audio
flows via WebRTC media tracks (Opus), this config has **no effect** on the audio
pipeline. It's harmless dead config.

**Fix**: Remove `input_audio_format` and `output_audio_format` from
`session.update` to avoid confusion. In GA, configure audio in the
`client_secrets` request if needed.

---

## SECTION 3: PHONE RING UX PATTERN

### 3.1 Research Findings

The "phone ring while connecting" pattern is not a formally documented UX
standard, but the underlying principle is well-established:

> "Users will tolerate small delays if they are masked thoughtfully. What they
> will not tolerate is silence." -- Twilio Voice AI Best Practices

Key research data points:

- **300ms**: Human conversation response threshold. Beyond this, users perceive
  delay. (Source: AssemblyAI)
- **500ms-1000ms**: Smooth zone. Audio cues make 1000ms feel like 500ms.
  (Source: Twilio)
- **>2000ms**: Conversation failure zone. Abandonment rates spike 40%+.
  (Source: Trillet AI Benchmarks 2026)

### 3.2 Why a Phone Ring Makes Sense for MirrorBuddy

MirrorBuddy's connection time is ~2-3.5 seconds (desktop), well into the
"conversation failure zone". A phone ring pattern works because:

1. **Mental model alignment**: Students are "calling" a maestro. A ringing
   phone is the expected feedback for a call being placed.
2. **Perceived control**: The ring tells the user "the system is working" --
   silence tells them "something is broken".
3. **Emotional preparation**: The ring gives the student a moment to mentally
   prepare for the conversation, especially important for students with anxiety
   (autism, ADHD profiles).
4. **Time masking**: 2-3 rings at ~2s each masks the entire connection setup.
5. **Natural transition**: The ring stops and the maestro greets -- exactly like
   a phone call being answered.

### 3.3 Implementation Design

```
User clicks "Chiama [Maestro]"
    |
    v
[Ring animation + ring sound starts immediately]
    |
    +-- Ring 1 (~0-800ms) ---- Background: getUserMedia + ephemeral token
    |
    +-- Ring 2 (~800-1600ms) -- Background: createOffer + SDP exchange
    |
    +-- Ring 3 (~1600-2400ms) - Background: waitForConnection + session.update
    |
    v
[Connection ready] --> Stop ring --> Maestro greeting plays
```

**Audio**: Use a gentle, warm phone ring tone. Not a harsh traditional ring.
Consider a custom "MirrorBuddy ring" that fits the app's educational tone.
Per-maestro custom ring tones could add personality.

**Visual**: Show the maestro's avatar with a pulsing ring animation (like
WhatsApp/FaceTime calling screen). Show the maestro's name and subject.

**Accessibility**:

- `prefers-reduced-motion`: Static "Calling..." text instead of animation
- Screen reader: "Calling [Maestro name]. Please wait."
- Auditory impairment profile: Visual-only feedback (no ring sound)

**Timeout**: If connection takes >8 seconds (>4 rings), show a "Still
connecting..." message. At 15s (desktop) / 60s (mobile), show error.

### 3.4 Edge Cases

- **Fast connection** (<1s): Play at least 1 full ring before answering. Abrupt
  transitions feel jarring.
- **Permission dialog**: If browser shows mic permission dialog, pause the ring
  animation and show "Waiting for microphone permission..."
- **Connection failure**: Ring stops, show error with retry button.
- **Reconnection**: On auto-reconnect, show "Reconnecting..." with a different
  (shorter) sound cue, not the full ring.

---

## SECTION 4: OPTIMIZED CONNECTION TIMELINE (GA + RING UX)

### 4.1 Before (current Preview protocol)

```
t=0ms      Click "Parla"
t=0ms      getUserMedia() + POST /api/realtime/ephemeral-token (parallel)
t=~400ms   Token + mic ready
t=~420ms   createPeerConnection(STUN servers)
t=~450ms   createOffer + setLocalDescription
t=~700ms   WAIT ICE gathering complete (STUN queries)
t=~900ms   GET /api/realtime/token (unnecessary fetch)
t=~1100ms  POST regional SDP endpoint
t=~1400ms  connectionState = 'connected'
t=~1450ms  Data channel open -> session.update sent
t=~1500ms  fetchConversationMemory (sequential)
t=~1700ms  GET /api/adaptive/context (sequential)
t=~1900ms  session.update assembled and sent
t=~2200ms  session.updated received -> unmute + greeting scheduled
t=~2500ms  setTimeout(sendGreeting, 300ms)
t=~2800ms  Greeting sent -> response.create
t=~3200ms  Maestro starts speaking

TOTAL: ~3.0-3.5 seconds (desktop), ~4-6 seconds (mobile)
```

### 4.2 After (GA protocol + optimizations + ring UX)

```
t=0ms      Click "Chiama [Maestro]"
t=0ms      RING STARTS (immediate audio+visual feedback)
t=0ms      getUserMedia()                               ─┐
t=0ms      fetchConversationMemory()                     │ ALL
t=0ms      GET /api/adaptive/context                     │ PARALLEL
t=0ms      POST /v1/realtime/client_secrets              │
           (includes session config, voice, instructions) ─┘
t=~400ms   All parallel fetches complete
t=~410ms   createPeerConnection() (no ICE servers)
t=~420ms   addTrack + createDataChannel + createOffer
t=~430ms   setLocalDescription (NO ICE gathering wait)
t=~440ms   POST /v1/realtime/calls (resource endpoint, not regional)
t=~700ms   setRemoteDescription
t=~800ms   connectionState = 'connected'
t=~810ms   RING STOPS
t=~850ms   data channel open -> send greeting immediately
           (session already configured via client_secrets)
t=~1100ms  Maestro starts speaking

TOTAL: ~1.0-1.2 seconds (desktop), ~1.5-2.5 seconds (mobile)
Ring masks: 100% of wait time (user perceives ~0ms dead time)
```

### 4.3 Savings Breakdown

| Optimization                                                      | Saved            |
| ----------------------------------------------------------------- | ---------------- |
| Remove STUN servers + ICE gathering wait                          | ~300-500ms       |
| Eliminate GET /api/realtime/token                                 | ~100-300ms       |
| Session config in client_secrets (skip session.update round-trip) | ~400-600ms       |
| Parallelize memory + adaptive context fetch                       | ~200-400ms       |
| Use resource endpoint (not regional)                              | ~50-100ms        |
| Remove 300ms greeting delay                                       | ~300ms           |
| **TOTAL**                                                         | **~1350-2200ms** |

---

## SECTION 5: CSP IMPACT

### 5.1 Current CSP (Preview)

```
connect-src 'self'
  https://*.openai.azure.com
  wss://*.openai.azure.com
  https://*.realtimeapi-preview.ai.azure.com;
```

### 5.2 GA CSP

```
connect-src 'self'
  https://*.openai.azure.com
  wss://*.openai.azure.com;
```

The `*.realtimeapi-preview.ai.azure.com` entry can be **removed** after
migration, since GA uses the resource endpoint directly.

---

## SECTION 6: FILES REQUIRING CHANGES

### 6.1 Server-side (API routes)

| File                                            | Changes                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/realtime/ephemeral-token/route.ts` | New URL (`/v1/realtime/client_secrets`), include session config in request body, remove api-version param                          |
| `src/app/api/realtime/token/route.ts`           | Update webrtcEndpoint to `/v1/realtime/calls` on resource domain, remove regional endpoint, potentially merge into ephemeral-token |
| `src/proxy.ts`                                  | Remove `*.realtimeapi-preview.ai.azure.com` from CSP                                                                               |

### 6.2 Client-side (WebRTC connection)

| File                                               | Changes                                                                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/hooks/voice-session/webrtc-connection.ts` | Remove ICE servers, remove ICE gathering wait, remove double fetch in `exchangeSDP()`, get webrtcEndpoint from token response                                         |
| `src/lib/hooks/voice-session/webrtc-types.ts`      | Remove `ICE_SERVERS` export, update `EphemeralTokenResponse` to include `webrtcEndpoint`                                                                              |
| `src/lib/hooks/voice-session/connection.ts`        | Pre-fetch memory + adaptive context in parallel with token                                                                                                            |
| `src/lib/hooks/voice-session/session-config.ts`    | Simplify -- session config sent with token, only greeting needed after connection. Remove sequential fetches. Add `type: "realtime"` to session.update if still used. |
| `src/lib/hooks/voice-session/event-handlers.ts`    | Update event names for GA. Remove legacy preview event cases. Simplify greeting to single attempt.                                                                    |
| `src/lib/hooks/voice-session/constants.ts`         | No changes needed                                                                                                                                                     |

### 6.3 UX (Phone Ring Pattern)

| File                                               | Changes                                               |
| -------------------------------------------------- | ----------------------------------------------------- |
| `src/components/voice/voice-session.tsx`           | Add ring state machine (idle -> ringing -> connected) |
| `src/components/voice/calling-overlay.tsx`         | NEW: Ring animation + sound component                 |
| `public/sounds/ring-tone.mp3`                      | NEW: Custom ring tone audio file                      |
| `src/lib/hooks/voice-session/use-calling-state.ts` | NEW: Hook managing ring UX lifecycle                  |

### 6.4 Cleanup (dead code)

| File                                                   | Action                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `src/lib/hooks/voice-session/audio-playback.ts`        | Remove (dead code in WebRTC mode)                              |
| `src/lib/hooks/voice-session/audio-playback-types.ts`  | Remove                                                         |
| `src/lib/hooks/voice-session/ring-buffer.ts`           | Remove                                                         |
| `src/lib/hooks/voice-session/audio-polling-helpers.ts` | Keep (used for input level) or remove if only used by playback |
| `src/lib/hooks/voice-session/transport-probe.ts`       | Remove (no WebSocket fallback in GA)                           |
| `src/lib/hooks/voice-session/transport-selector.ts`    | Remove                                                         |
| `src/lib/hooks/voice-session/transport-switcher.ts`    | Remove                                                         |
| `src/lib/hooks/voice-session/transport-cache.ts`       | Remove                                                         |
| `src/server/realtime-proxy/`                           | Remove entire directory (deprecated WebSocket proxy)           |

---

## SECTION 7: CORRECTIONS TO PREVIOUS REPORT

| Previous claim                        | Correction                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "WebRTC endpoint uses preview domain" | CONFIRMED. GA moves to resource domain `/v1/realtime/calls`                                                                                        |
| "STUN servers are unnecessary"        | CONFIRMED by GA sample code (no ICE servers at all)                                                                                                |
| "ICE gathering wait is unnecessary"   | CONFIRMED by GA sample code (sends offer immediately)                                                                                              |
| "PCM16 format is a problem"           | CORRECTED. PCM16 config has no effect in WebRTC mode. It only applies to WebSocket data channel audio. Harmless but should be removed for clarity. |
| "API version is obsolete (preview)"   | CONFIRMED. Preview deprecated 30 April 2026. GA uses `/openai/v1/` path, no api-version.                                                           |
| "Double fetch in SDP exchange"        | CONFIRMED. GA eliminates the need for separate token endpoint.                                                                                     |
| "Audio playback queue is dead code"   | CONFIRMED. WebRTC audio goes via `ontrack` -> `<Audio>` element. The entire queue/scheduler system is unused.                                      |

---

## SECTION 8: ADR 0038 UPDATE (PROPOSED)

Below is the proposed update to ADR 0038. Changes are marked.

```markdown
# ADR 0038: WebRTC Migration for Azure Realtime Voice

## Status

Accepted -> **Superseded by ADR 0038-v2 (GA Protocol Migration)**

## Amendment: GA Protocol Migration (14 February 2026)

### Context

The original ADR 0038 documented migration from WebSocket to WebRTC using
Azure's Preview API (api-version 2025-04-01-preview). Azure has since released
the GA protocol (September 2025) with significant changes. The Preview protocol
is **deprecated as of 30 April 2026**.

### Decision

Migrate from Preview to GA Realtime API protocol. Key changes:

#### 1. Endpoint Migration

- Ephemeral token: `/openai/realtimeapi/sessions?api-version=...`
  -> `/openai/v1/realtime/client_secrets` (no api-version)
- WebRTC SDP: `https://{region}.realtimeapi-preview.ai.azure.com/v1/realtimertc`
  -> `https://{resource}.openai.azure.com/openai/v1/realtime/calls`
- WebSocket (if used): Include `/openai/v1/` path, no api-version

#### 2. Session Configuration in Token Request

Session config (instructions, voice, model, tools) is now sent with the
`client_secrets` POST request body. The model is pre-configured before WebRTC
connects, eliminating the session.update -> session.updated round-trip.

#### 3. Simplified WebRTC Connection

- No ICE servers needed (Azure handles routing)
- No ICE gathering wait (send offer immediately)
- No regional endpoint (use resource domain directly)
- No separate `/api/realtime/token` fetch

#### 4. Event Name Updates

- `response.text.delta` -> `response.output_text.delta`
- `response.audio.delta` -> `response.output_audio.delta`
- `response.audio_transcript.delta` -> `response.output_audio_transcript.delta`
- `session.update` requires `type: "realtime"` field

#### 5. WebSocket Fallback Removal

WebSocket proxy (src/server/realtime-proxy/) is removed. GA recommends WebRTC
for all client-side connections. The transport probe/selector/switcher system
is removed.

#### 6. Phone Ring UX Pattern

A phone ring animation and sound effect masks connection latency. The ring
starts immediately on click and stops when the connection is ready. This
provides continuous audio/visual feedback during the ~1-1.5s connection setup.

#### 7. CSP Simplification

Remove `*.realtimeapi-preview.ai.azure.com` from CSP. GA uses the resource
domain directly.

### Consequences

#### Positive

- ~50% faster connection (1.0-1.5s vs 2.5-3.5s)
- Simpler CSP (one fewer domain)
- Reduced code complexity (remove transport probe, WebSocket proxy, audio queue)
- Access to GA models (gpt-realtime-mini, lower cost)
- New features (webrtcfilter, WebSocket observer, video/image support)
- No perceived dead time (ring UX)

#### Negative

- Breaking change (cannot fall back to Preview after 30 April 2026)
- Must test all 26 maestri with GA models
- Ring tone asset needed (audio file)

#### Neutral

- Preview models still work during transition (dual endpoint support)

### Migration Strategy

#### Phase 1: GA Endpoint Migration

- Update ephemeral-token route to use `/v1/realtime/client_secrets`
- Include session config in token request
- Update WebRTC URL to `/v1/realtime/calls` on resource domain
- Remove ICE servers and gathering wait
- Update event handlers for GA event names

#### Phase 2: Connection Optimization

- Parallelize memory + adaptive context fetch with token request
- Remove double fetch in SDP exchange
- Remove 300ms greeting delay

#### Phase 3: Phone Ring UX

- Add ring tone audio asset
- Create calling overlay component
- Implement ring state machine
- Add accessibility adaptations per profile

#### Phase 4: Cleanup

- Remove WebSocket proxy (src/server/realtime-proxy/)
- Remove transport probe/selector/switcher
- Remove audio playback queue (dead code)
- Remove `*.realtimeapi-preview.ai.azure.com` from CSP
- Remove `AZURE_OPENAI_REALTIME_REGION` env var

### Related ADRs

- ADR 0038 (original, superseded)
- ADR 0069: Adaptive VAD (no changes needed -- VAD config moves to client_secrets)
- ADR 0122: Realtime Video Vision (verify GA video support compatibility)
- ADR 0050: Voice Cost Guards (update for GA model pricing)
```

---

## SECTION 9: RISK ASSESSMENT

| Risk                                            | Severity | Mitigation                             |
| ----------------------------------------------- | -------- | -------------------------------------- |
| Preview deprecation (30 Apr 2026)               | **HIGH** | Start migration now, 2.5 months runway |
| GA model behavior differs from preview          | MEDIUM   | Test all 26 maestri with GA models     |
| CSP change breaks production                    | MEDIUM   | Support both domains during transition |
| Ring tone UX feels unprofessional               | LOW      | A/B test with users, make configurable |
| WebSocket observer leak (compliance)            | LOW      | Don't enable until privacy review      |
| Session config in token = larger server request | LOW      | ~2KB extra, negligible                 |

---

## SECTION 10: RECOMMENDED PRIORITY

### Immediate (before 30 April 2026 deadline)

1. **P0**: Migrate endpoints to GA protocol (client_secrets + /v1/realtime/calls)
2. **P0**: Update event handlers for GA event names
3. **P0**: Remove ICE servers + ICE gathering wait
4. **P0**: Add `type: "realtime"` to session.update

### Short-term (connection optimization)

5. **P1**: Merge session config into client_secrets request
6. **P1**: Parallelize memory + adaptive context fetches
7. **P1**: Remove double fetch in SDP exchange
8. **P1**: Implement phone ring UX pattern

### Medium-term (cleanup)

9. **P2**: Remove WebSocket proxy (dead code)
10. **P2**: Remove transport probe/selector/switcher
11. **P2**: Remove audio playback queue (dead code)
12. **P2**: Evaluate GA models (gpt-realtime-mini for cost savings)
13. **P2**: Evaluate WebSocket observer for compliance recording

---

## SOURCES

- [Azure OpenAI Realtime API WebRTC (GA)](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc?view=foundry-classic) - Updated 14 Feb 2026
- [Azure Migration Guide: Preview to GA](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-preview-api-migration-guide?view=foundry-classic) - Updated 28 Jan 2026
- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime WebRTC Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Twilio: Core Latency in AI Voice Agents](https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents)
- [AssemblyAI: The 300ms Rule](https://www.assemblyai.com/blog/low-latency-voice-ai)
- [Voice AI Latency Benchmarks 2026](https://www.trillet.ai/blogs/voice-ai-latency-benchmarks)
- [webrtcHacks: How OpenAI does WebRTC](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/)
- [webrtcHacks: Measuring Realtime API Latency](https://webrtchacks.com/measuring-the-response-latency-of-openais-webrtc-based-real-time-api/)
