# ADR 0183: MirrorBuddy's AI moves to the FightTheStroke Azure tenant

**Status**: Accepted
**Date**: 2026-10-04
**Supersedes**: ADR 0173 (MirrorBuddy stays on Azure API keys), section "The two ways out"
**References**: ADR 0182 (GPT-6.1 Sol single model), ADR 0169 (realtime 2.1), `docs/operations/AZURE-KEY-ROTATION.md`

## The point, in one sentence

MirrorBuddy no longer uses any Azure resource in the Microsoft corporate tenant:
its AI runs on `mirrorbuddy-aoai-swc` in the FightTheStroke tenant, which
reopens the keyless (Vercel OIDC) path that ADR 0173 declared closed.

## Context

Until 2026-10-04 MirrorBuddy called `aoai-virtualbpm-prod`, an Azure OpenAI
resource in a Microsoft corporate subscription shared with other internal
projects. That subscription is subject to Microsoft security compliance
(S360/SFI): API-key access must be disabled, and federation from Vercel is
blocked by tenant policy (ADR 0173). MirrorBuddy was the only consumer still
authenticating with keys, so it blocked the remediation for everyone else.

ADR 0173 listed "move the resource into a FightTheStroke-controlled tenant" as
closed because that tenant did not exist. It now exists and is used.

## Decision

1. **New resource, smallest footprint.** Resource group `rg-mirrorbuddy-ai`
   (swedencentral), subscription `906ca84a-6733-4eb0-904e-c7a2fd67ef72`,
   tenant FightTheStroke. Only the deployments production actually uses:

   | Deployment             | Model                | SKU                                  |
   | ---------------------- | -------------------- | ------------------------------------ |
   | mb-gpt-61-sol          | gpt-6.1-sol          | DataZoneStandard (EU)                |
   | gpt-5-nano             | gpt-5-nano           | DataZoneStandard (EU)                |
   | text-embedding-3-small | text-embedding-3-sm. | DataZoneStandard (EU)                |
   | gpt-realtime-2.1       | gpt-realtime-2.1     | DataZoneStandard (EU)                |
   | gpt-realtime-whisper   | gpt-realtime-whisper | GlobalStandard (no EU data zone yet) |
   | tts-hd-deployment      | tts-hd               | Standard (regional, Sweden)          |

   Every voice alias (`gpt-realtime`, `-mini`, `-1.5`, `-2`) points to
   `gpt-realtime-2.1`; `gpt-5.6-terra`/`gpt-5.6-sol` resolve to `mb-gpt-61-sol`.
   `gpt-audio-1.5` is not provisioned: without `AZURE_OPENAI_AUDIO_DEPLOYMENT`
   the TTS route uses `tts-hd`.

2. **Secrets.** Key Vault `kv-mirrorbuddy-fts` (RBAC, purge protection) in the
   same group replaces `kv-virtualbpm-prod` for MirrorBuddy. The February 2026
   `.env` backup was copied as `mirrorbuddy-env-backup-2026-02-15-historical`
   and is never restored by `scripts/env-vault.sh`: it holds retired Microsoft
   endpoints and keys.

3. **Authentication, in two steps.** The cutover keeps API keys so it could be
   proven and rolled back in minutes. The next step is keyless access through
   Vercel OIDC federated to an Entra app registration in the FightTheStroke
   tenant; after it is proven, local (key) authentication is disabled on
   `mirrorbuddy-aoai-swc`.

## Evidence (2026-10-04)

- Direct tests on the new resource: chat, vision, nano, embeddings (1536 dims),
  TTS, realtime GA `client_secrets` and preview sessions, a websocket session
  returning audio and transcript.
- Production after the switch: anonymous `/api/chat` answered from
  `mb-gpt-61-sol`; a token minted by `/api/realtime/ephemeral-token` opened a
  realtime session on the new resource and returned audio. Azure metrics show
  the traffic on `mirrorbuddy-aoai-swc` and none on the old resource.

## Consequences

- Microsoft can disable key access on `aoai-virtualbpm-prod` without breaking
  MirrorBuddy.
- Cost is now billed to FightTheStroke. Measured usage is below 1 USD/month.
- Monitoring (`check-azure-key-drift.sh`, `azure-model-monitor.sh`,
  `env-vault.sh`, cost scripts) defaults to the FightTheStroke subscription.
- Rolling back means pointing Vercel back at the old endpoint and key; that
  stays possible only until the old deployments are removed.
