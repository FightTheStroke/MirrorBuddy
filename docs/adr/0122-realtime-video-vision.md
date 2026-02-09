# ADR 0122: Realtime Video Vision (Pro-Only)

## Status

Accepted

## Date

2026-02-05

## Context

MirrorBuddy's webcam feature currently captures **single frames** (JPEG snapshots) and sends them to the Vision API for analysis. Students studying physical subjects (geometry, biology, chemistry labs) need **continuous visual analysis** — the AI should "see" what's happening in real-time while talking to the student.

### Current Limitations

1. **Single-shot capture**: `webcam-handler.ts` captures one frame, sends to Chat Completions Vision API, returns text
2. **No voice integration**: Webcam analysis is a separate tool call, disconnected from the realtime voice session
3. **Latency**: Each frame requires a full HTTP round-trip to Azure Chat Completions API (~2-3s)
4. **No multimodal session**: Voice and vision are separate pipelines — the AI cannot "see and talk" simultaneously

### Azure Realtime API Image Support (Verified 2026-02-05)

The Azure OpenAI Realtime API now supports image input on GA models:

- **`gpt-realtime`** (v2025-08-28) — supports `input_image` content type (MirrorBuddy current deployment)
- **`gpt-realtime-mini`** (v2025-10-06, v2025-12-15) — supports `input_image`
- **`gpt-4o-realtime-preview`** (v2024-12-17) — does NOT support images (deprecated 2026-03-24, migration complete)

Images are sent via the WebRTC data channel as `conversation.item.create` events with base64-encoded data URIs. No video codec or video track is needed — the API accepts discrete image frames.

### Pricing (gpt-realtime, per million tokens)

| Modality  | Input     | Output | Cached Input |
| --------- | --------- | ------ | ------------ |
| Text      | $4.00     | $16.00 | $0.40        |
| Audio     | $32.00    | $64.00 | $0.40        |
| **Image** | **$5.00** | N/A    | $0.50        |

Source: [OpenAI API Pricing](https://openai.com/api/pricing/)

## Decision

### 1. Periodic Frame Capture via Realtime Data Channel

Send periodic webcam frames to the existing Realtime API session through the WebRTC data channel. This approach:

- Reuses the existing `gpt-realtime` deployment (already `gpt-realtime` v2025-08-28 model)
- No new Azure deployment needed
- Images and audio flow through the same session — the AI "sees and hears" simultaneously
- Student can ask "what do you see?" verbally and get immediate multimodal response

### 2. Frame Capture Strategy

```
Camera Stream → Canvas capture (every N seconds) → JPEG base64 → Data Channel → Azure
```

- **Capture interval**: Configurable, default 5 seconds (balances cost vs. responsiveness)
- **Resolution**: 640x480 max (sufficient for educational content, ~50-100KB per frame)
- **JPEG quality**: 0.7 (balance quality vs. token cost)
- **Throttle**: Skip frame if previous analysis still pending
- **Motion-triggered**: Prefer sending frames only when camera content changes significantly
- **Auto-pause**: Stop capturing when student is not speaking (VAD-based or `semantic_vad`)

### 3. Pro-Only Feature Gate

Video vision is gated by the `video_vision` feature flag, which is already Pro-only:

- `src/lib/tier/video-vision-guard.ts` — `canUseVideoVision()` / `requireVideoVision()`
- Trial/Base: Feature disabled, webcam button hidden during voice sessions
- Pro: Full access to continuous video analysis during voice sessions

### 4. Data Channel Protocol

Images sent as `conversation.item.create` with `input_image` content:

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_image",
        "image_url": "data:image/jpeg;base64,{base64_data}"
      }
    ]
  }
}
```

Followed by `response.create` only when the student asks a visual question (not on every frame). The model accumulates visual context silently.

### 5. Session Configuration Update

Add image capability instructions to the session config:

```json
{
  "type": "session.update",
  "session": {
    "instructions": "...existing instructions...\n\nYou can see images from the student's camera. When images arrive, observe them silently unless the student asks about what you see. Use visual context to enhance your teaching."
  }
}
```

## Implementation

### Key Files to Modify

| File                                               | Change                                                        |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/hooks/voice-session/webrtc-connection.ts` | Add `getUserMedia({ video: true })` when video vision enabled |
| `src/lib/hooks/voice-session/actions.ts`           | Add `useSendVideoFrame()` action                              |
| `src/lib/hooks/voice-session/use-voice-session.ts` | Expose video controls (start/stop/interval)                   |
| `src/lib/hooks/voice-session/session-config.ts`    | Add vision instructions to session prompt                     |
| `src/components/voice/voice-session.tsx`           | Add camera preview overlay during voice session               |
| `src/lib/tier/video-vision-guard.ts`               | Already implemented, no changes needed                        |
| `src/types/voice.ts`                               | Add `videoEnabled`, `toggleVideo` to VoiceSessionHandle       |

### New Files

| File                                           | Purpose                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| `src/lib/hooks/voice-session/video-capture.ts` | Periodic frame capture logic, canvas encoding, throttling |
| `src/components/voice/video-preview.tsx`       | Small camera preview overlay (picture-in-picture style)   |

### Cost Control

Based on real-world testing (~$0.067 per 640x360 image at $5/M image tokens):

- **Frame budget**: Max 12 frames/minute (1 every 5s) = ~$0.80/min for images
- **Combined with audio**: ~$0.86/min total (audio ~$0.06/min + images ~$0.80/min)
- **Continuous video at 1 FPS**: ~$4.00/min — **prohibitively expensive**, avoid fixed-rate capture
- **Motion-triggered strategy**: Expect 3-6 meaningful frames/min in practice = ~$0.20-$0.40/min
- **Daily cap**: Enforce via existing `voiceMinutesDaily` limit (Pro = unlimited but monitored)
- **Cost tracking**: Log frame count + estimated tokens to `ExternalServiceMetric`
- **Hard limit**: Max 60 frames per voice session (configurable by admin)

### Azure-Specific Notes

- The OpenAI direct API supports a **video-track-to-snapshot gateway** (add video track to WebRTC, snapshots extracted automatically). This is **NOT confirmed on Azure** endpoints.
- For Azure: use **manual frame capture via data channel** (`conversation.item.create` with `input_image`). This is the safe, documented approach.
- Azure WebRTC endpoints: `{region}.realtimeapi-preview.ai.azure.com/v1/realtimertc`
- Regions with realtime support: **East US 2**, **Sweden Central** (our deployment)

## Consequences

### Positive

1. **Multimodal tutoring**: AI can see homework, lab experiments, diagrams while talking
2. **No new deployment**: Uses existing `gpt-realtime` (v2025-08-28) which already supports images
3. **Reuses infrastructure**: WebRTC data channel, same session, same auth flow
4. **Cost controlled**: Frame throttling + Pro-only gating limits exposure
5. **Graceful degradation**: If image sending fails, voice session continues unaffected

### Negative

1. **Cost increase**: ~$0.20-$0.80/min vs ~$0.06/min for audio-only sessions (3-14x increase)
2. **Bandwidth**: ~50-100KB per frame, 20 frames/min = ~1-2MB/min upload
3. **Privacy**: Camera access during voice session requires explicit consent
4. **Mobile battery**: Camera + microphone + WebRTC = significant battery drain

### Mitigations

1. **Cost**: Pro-only, daily budget monitoring, admin alerts at threshold
2. **Bandwidth**: Adaptive quality based on connection speed
3. **Privacy**: Explicit opt-in toggle, camera indicator always visible, no server-side storage of frames
4. **Battery**: Auto-pause video when app backgrounded, option to disable camera

## Azure Model Catalog Update (2026-02-05)

### New Models Available (Not Yet Deployed)

| Model              | Version    | Status  | Category  | Notes                   |
| ------------------ | ---------- | ------- | --------- | ----------------------- |
| gpt-5.1-chat       | 2025-11-13 | Preview | Chat      | Successor to gpt-5-chat |
| gpt-5.1-codex-mini | 2025-11-13 | GA      | Code      | Coding-optimized        |
| gpt-4.1            | 2025-04-14 | GA      | Chat      | Fine-tunable            |
| gpt-4.1-mini       | 2025-04-14 | GA      | Chat      | Fine-tunable            |
| gpt-4.1-nano       | 2025-04-14 | GA      | Chat      | Fine-tunable            |
| o4-mini            | 2025-04-16 | GA      | Reasoning | Reasoning model         |
| gpt-realtime-mini  | 2025-12-15 | GA      | Realtime  | Newer version available |
| model-router       | 2025-11-18 | GA      | Router    | Multi-model routing     |

### Deprecation Warnings

| Model                        | Version    | Deprecation Date | Action Needed                 | Status   |
| ---------------------------- | ---------- | ---------------- | ----------------------------- | -------- |
| gpt-4o-realtime-preview      | 2024-12-17 | 2026-03-24       | Migrated to gpt-realtime      | Complete |
| gpt-4o-mini-realtime-preview | 2024-12-17 | 2026-03-24       | Migrated to gpt-realtime-mini | Complete |
| gpt-5-chat                   | 2025-08-07 | 2026-03-01       | Upgrade to v2025-10-03        |
| gpt-5-chat                   | 2025-10-03 | 2026-03-01       | Monitor for newer version     |
| gpt-5.2-chat                 | 2025-12-11 | 2026-04-01       | Monitor, still Preview        |

### Current Deployments (Verified)

| Deployment Name        | Model                  | Version    | SKU            |
| ---------------------- | ---------------------- | ---------- | -------------- |
| gpt4o-mini-deployment  | gpt-4o-mini            | 2024-07-18 | Standard       |
| gpt-4o-realtime        | gpt-realtime           | 2025-08-28 | GlobalStandard |
| gpt-5.2-edu            | gpt-5.2-chat           | 2025-12-11 | GlobalStandard |
| gpt-5-edu-mini         | gpt-5-mini             | 2025-08-07 | GlobalStandard |
| gpt-5-chat             | gpt-5-chat             | 2025-10-03 | GlobalStandard |
| gpt-5-nano             | gpt-5-nano             | 2025-08-07 | GlobalStandard |
| text-embedding-ada-002 | text-embedding-ada-002 | 2          | Standard       |

### Recommendation

1. **No action needed for video vision**: `gpt-realtime` v2025-08-28 already supports images
2. **Monitor `gpt-5-chat` deprecation**: v2025-10-03 expires 2026-03-01, plan upgrade
3. **Consider deploying `gpt-realtime-mini` v2025-12-15**: Newer version with image support for Trial/Base tiers (future)
4. **`gpt-5.1-chat` evaluation**: When promoted to GA, evaluate as potential `gpt-5.2-edu` replacement

## Related

- ADR 0071: Tier Subscription System — feature gating
- ADR 0118: Webcam Fullscreen Architecture — single-frame capture
- ADR 0038: WebRTC Migration for Azure Realtime Voice — WebRTC infrastructure
- `src/lib/tier/video-vision-guard.ts` — existing Pro-only gate
- `src/lib/hooks/voice-session/` — WebRTC voice session

## References

- [Azure OpenAI Realtime API - Image Input](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)
