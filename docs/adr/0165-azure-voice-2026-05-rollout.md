# ADR 0165: Azure Voice 2026-05 Rollout (whisper, realtime-2, translate)

## Status

Accepted — 2026-05-25

## Context

OpenAI released a new wave of realtime voice models on **2026-05-06**, GA in
Azure Sweden Central (EU) shortly after. Three new deployments are relevant to
MirrorBuddy's voice stack:

| Model                    | Version    | Lifecycle | Pricing       | Purpose                                  |
| ------------------------ | ---------- | --------- | ------------- | ---------------------------------------- |
| `gpt-realtime-2`         | 2026-05-06 | Preview   | per-token TBD | Next-gen successor of `gpt-realtime-1.5` |
| `gpt-realtime-whisper`   | 2026-05-06 | GA        | $0.017/min    | Streaming low-latency live transcription |
| `gpt-realtime-translate` | 2026-05-06 | GA        | $0.034/min    | Streaming speech-to-speech translation   |

Current production stack (per ADR 0159, 0152) uses `gpt-realtime-1.5` for voice
and `whisper-1` for inline live transcription inside the WebRTC realtime
session.

### EU-only Constraint

Per user/org policy, only **European** regions are acceptable. All three new
models are available in `swedencentral`. The legacy `gpt-4o-mini-tts`
controllable TTS is **excluded** because it is only published in `eastus2`.

## Decision

Deploy all three models in `swedencentral` on `aoai-virtualbpm-prod` and roll
them out behind feature flags. Each rollout is independent and individually
killable.

### Deployments (already provisioned 2026-05-25)

```bash
az cognitiveservices account deployment create -n aoai-virtualbpm-prod \
  -g rg-virtualbpm-prod \
  --deployment-name gpt-realtime-2 --model-name gpt-realtime-2 \
  --model-version 2026-05-06 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 10
# (same pattern for gpt-realtime-whisper and gpt-realtime-translate, cap=10)
```

Initial quota is 10 RPM (Azure preview/new-model default). Bump via support
when Pro tier traffic warrants it.

### Empirical API findings (curl-verified, not docs)

| Endpoint                                | Status | Notes                                                                                          |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `/openai/v1/realtime/client_secrets` w/ model=`gpt-realtime-2`             | ✅ 200 | Drop-in replacement: identical session contract to `gpt-realtime-1.5`. Only deployment changes. |
| `/openai/v1/realtime/client_secrets` w/ session.audio.input.transcription.model=`gpt-realtime-whisper` | ✅ 200 | Whisper works as the **inline transcription model** of a regular realtime session. Replaces `whisper-1`. |
| `/openai/v1/realtime/translations`      | ❌ 404 | Dedicated translate endpoint not yet exposed on Azure (works on OpenAI direct).                |
| `/openai/v1/realtime/client_secrets` w/ model=`gpt-realtime-translate`     | ❌ 400 | `OperationNotSupported` — model cannot piggyback on regular realtime endpoint either.          |
| `/openai/v1/realtime/transcription_sessions` (dedicated)                   | ❌ 404 | Dedicated transcription endpoint not yet exposed on Azure.                                     |

**Reference:** MS Learn `realtime-audio-reference` confirms Azure deviation:
*"input_audio_transcription.model accepts the name of the existing model
deployment"* — this validates the whisper-as-nested-model approach.

### Changes

| File                                                              | Change                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `.env.example`                                                    | Add `AZURE_OPENAI_REALTIME_DEPLOYMENT_V2`, `AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT`. Translate stays commented (pending Azure). |
| `apps/web/src/lib/ai/providers/deployment-mapping.ts`             | Register `gpt-realtime-2`, `gpt-realtime-whisper`, `gpt-realtime-translate`. |
| `apps/web/src/lib/feature-flags/types.ts` + service + client      | Add `voice_realtime_2`, `voice_realtime_whisper_transcription`, `voice_realtime_translate`. |
| `apps/web/src/app/api/realtime/ephemeral-token/route.ts`          | Prefer V2 deployment when `voice_realtime_2` is enabled.       |
| `apps/web/src/app/api/realtime/token/route.ts`                    | Mirror the same V2 preference.                                 |
| `apps/web/src/lib/hooks/voice-session/session-config.ts`          | Use whisper-realtime deployment name as `input.transcription.model` when `voice_realtime_whisper_transcription` is enabled. |
| `apps/web/src/lib/azure/realtime-translate-availability.ts` (new) | Stub probe used by status route; flag defaults to `degraded`.  |
| `apps/web/src/app/api/realtime/status/route.ts`                   | Surface the three new flags' state for admin diagnostics.      |
| Tests                                                             | Extend `deployment-mapping.test.ts`, `feature-flags` known-flags, payload builder. |
| Docs                                                              | Update `CLAUDE.md` voice section + this ADR + `ARCHITECTURE.md` voice diagram. |

### Feature Flags & Default Rollout

| Flag                                    | Default     | Rollout %     | Tier scope        |
| --------------------------------------- | ----------- | ------------- | ----------------- |
| `voice_realtime_2`                      | `disabled`  | 10% (Pro)     | Pro only — A/B vs `gpt-realtime-1.5` |
| `voice_realtime_whisper_transcription`  | `enabled`   | 100% all tiers | Accessibility — replaces `whisper-1` |
| `voice_realtime_translate`              | `degraded`  | 0%            | Pending Azure endpoint enablement    |

Killing any flag is non-breaking: the route falls back to the existing
`gpt-realtime-1.5` deployment + `whisper-1` transcription.

### Environment Variables

```bash
# New (rolled out 2026-05-25)
AZURE_OPENAI_REALTIME_DEPLOYMENT_V2=gpt-realtime-2
AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT=gpt-realtime-whisper

# Pending Azure endpoint rollout — DO NOT enable yet
# AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT=gpt-realtime-translate
```

## Consequences

### Positive

- **Accessibility win**: `gpt-realtime-whisper` delivers tighter caption
  deltas (<250ms vs ~700ms for `whisper-1`) → live subtitles become
  default-on for DSA profiles (dyslexia, ADHD, hearing-impaired).
- **Quality runway**: `gpt-realtime-2` is a drop-in for `gpt-realtime-1.5`;
  A/B with the same WebRTC plumbing.
- **Future-proof**: translate deployment is provisioned and ready when Azure
  exposes the dedicated endpoint; switching flag to `enabled` will be a
  single edit.

### Negative

- Initial RPM cap = 10 per model (Azure default for new models). Pro tier
  will saturate quickly — budget a support quota bump.
- Whisper-realtime is priced per minute ($0.017/min) — marginal vs
  `whisper-1` ($0.006/min). Net cost +$0.011 per voice minute.
- Translate endpoint is region-blocked on Azure today; cannot ship the
  multilingual tandem flow until Microsoft enables `/v1/realtime/translations`
  in swedencentral.

### Risks & Mitigations

| Risk                                             | Mitigation                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `gpt-realtime-2` Preview API breaks unannounced  | Feature flag kill-switch; auto-falls back to 1.5.                          |
| Whisper-realtime regression in any language      | Kept behind a flag for fast rollback; A/B telemetry on WER per locale.    |
| Azure translate endpoint never ships in EU       | Provision stays cheap (idle billing only); ADR remains valid as roadmap.  |
| Quota cap (10 RPM) trips production              | Status route surfaces `quotaSaturated`; degradation service falls back.   |

### Cost Guards

`apps/web/src/lib/metrics/voice-cost-guards.ts` already gates voice minutes.
Add per-deployment lines so dashboards (Grafana per ADR 0047) separate:

- `gpt-realtime-1.5` baseline (current)
- `gpt-realtime-2` A/B (Pro)
- `gpt-realtime-whisper` transcription overhead

### Testing

- Unit: `deployment-mapping.test.ts` covers all 3 new mappings.
- Unit: `payload-builders.test.ts` covers transcription model override.
- Smoke: `/api/realtime/status` returns the 3 flag states.
- Manual: Pro tier voice session with `voice_realtime_2=enabled` shows
  `model: "gpt-realtime-2"` in the session.update echo.

## Roadmap

| Phase | When             | What                                                                          |
| ----- | ---------------- | ----------------------------------------------------------------------------- |
| 1     | This ADR (now)   | All three deployments live, env+mapping+flags+route+session+probe shipped.    |
| 2     | +7d              | Promote `voice_realtime_2` 10% → 50% on Pro if telemetry green.                |
| 3     | +14d             | Default-on live captions overlay (DSA profile `hearing-impaired`).             |
| 4     | When Azure ships | Enable `voice_realtime_translate` and design tandem multilingue flow.          |
| 5     | +30d             | Read-back checker for dyslexia (whisper-realtime tight-loop pronunciation).    |
| 6     | +60d             | Retire `gpt-realtime-1.5` once `-2` is GA and ≥99% sessions opted in.          |

## References

- ADR 0152: Voice GA Migration (parent — GA protocol contract)
- ADR 0159: GPT-Realtime/Audio 1.5 Migration (previous wave)
- ADR 0069: Adaptive VAD per DSA profile
- ADR 0038: WebRTC Migration
- `apps/web/src/app/api/realtime/ephemeral-token/route.ts`
- `apps/web/src/lib/hooks/voice-session/session-config.ts`
- OpenAI: <https://developers.openai.com/api/docs/models/gpt-realtime-whisper>
- OpenAI: <https://developers.openai.com/api/docs/models/gpt-realtime-translate>
- MS Learn: <https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-audio-reference>
