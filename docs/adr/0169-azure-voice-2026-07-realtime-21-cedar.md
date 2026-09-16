# ADR 0169: Azure Voice 2026-07 Rollout (gpt-realtime-2.1 + Cedar voice)

## Status

Accepted — 2026-07-19
Corrected — 2026-08-31 (lifecycle label: `gpt-realtime-2.1` is **Public Preview**, not GA)

## Correction (2026-08-31) — lifecycle label was wrong

The original decision below recorded `gpt-realtime-2.1` (and, by implication, the
whole GPT Realtime 2.x line) as **GA**. This is factually incorrect. Microsoft
classifies the entire 2.x line as **Public Preview**:

- Overview page is literally titled _"GPT Realtime 2.x (preview)"_ and states
  _"This feature is currently in public preview … provided without a service-level
  agreement"_ —
  <https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/realtime-2>
- Retirement schedule (updated 2026-08-26) lists the lifecycle stage for each row —
  <https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule>

| Model              | Version    | Lifecycle   | Retirement date |
| ------------------ | ---------- | ----------- | --------------- |
| `gpt-realtime`     | 2025-08-28 | **GA**      | 2027-03-02      |
| `gpt-realtime-1.5` | 2026-02-23 | **GA**      | 2027-08-24      |
| `gpt-realtime-2`   | 2026-05-06 | **Preview** | 2026-10-31      |
| `gpt-realtime-2.1` | 2026-07-07 | **Preview** | 2026-10-15      |

> Retirement dates re-verified 2026-09-16 against `az cognitiveservices model list -l
swedencentral`. The 2.1 date moved forward from the 2027-06-25 originally recorded
> here: the preview line now ends **2026-10-15**, so the GA fallback in
> `app/api/realtime/ephemeral-token` is what keeps voice alive past that date.

### Accepted risk

Running a Public Preview model in production is an **accepted, conscious risk**, not
a bug. Preview carries **no SLA** and Microsoft does not recommend it for production.
It is accepted here because 2.1 has genuinely better alphanumeric speech
(dates/numbers/formulas), which materially helps students with discalculia and STEM
Maestri. This risk must stay explicitly recorded — not mislabelled as GA.

### Rollback reality

The documented fallback chain is
`gpt-realtime-2.1` → `gpt-realtime-2` → `gpt-realtime-1.5` → `gpt-realtime`. Note that
**`gpt-realtime-2` is itself Preview and reaches retirement on 2026-08-31** — it is not
a durable fallback. The **only GA rungs** of the chain are `gpt-realtime-1.5`
(retires 2027-08-24) and `gpt-realtime` (retires 2027-03-02). A true rollback to a
supported model must land on one of those two.

---

## Context

OpenAI released `gpt-realtime-2.1` on **2026-07-07**, available in Azure Sweden
Central (EU). It is a drop-in successor of `gpt-realtime-2` (ADR 0165) with:

- **Better alphanumeric speech** — cleaner rendering of dates, numbers and
  formulas. Directly relevant to students with **discalculia** and to STEM
  Maestri (math/physics/chemistry).
- **Noise robustness** — fewer false turn-detections in noisy classrooms/homes.
- **Lower latency** — tighter turn-taking.
- **Cedar voice** — new premium voice introduced with the 2.x line, alongside
  `marin`. Both are the recommended high-naturalness voices for realtime agents.

| Model              | Version    | Lifecycle      | Purpose                       |
| ------------------ | ---------- | -------------- | ----------------------------- |
| `gpt-realtime-2.1` | 2026-07-07 | Public Preview | Successor of `gpt-realtime-2` |

> Lifecycle corrected 2026-08-31 — see the Correction section at the top of this ADR.
> This row originally read `GA`, which was wrong.

### EU-only Constraint

Per org policy, only European regions are acceptable. `gpt-realtime-2.1` is
available in `swedencentral` (resource `aoai-virtualbpm-prod`). The deployment
uses the `Microsoft.DefaultV2` RAI policy (required by CloudGov input-filter
policy for sexual/hate content), mirroring `gpt-realtime-2`.

## Decision

### Clarification (2026-09-16) — no per-tier voice model

Per-tier realtime model configuration was removed on 2026-09-16 (issue #846,
Finding 2) because no voice session route used it. The database column is retained
for backwards compatibility, but tier helpers, seeds, and admin controls no longer
read or write a voice model assignment. No database migration was created.

Web token routes choose a deployment globally using environment variables and the
`voice_realtime_21`, `voice_realtime_2`, and `voice_realtime_15` feature flags,
with the configured priority V21 -> V2 -> V15 -> legacy. The device credentials
route currently uses environment-only priority V21 -> V2 -> legacy, without these
flags or the V15 rung. Neither path consults the user's tier for model selection;
this removal does not change their routing or tier-based voice usage limits.

Preview-model risk remains tracked in #1022 (Finding 1); the `gpt-realtime-mini`
2026-12-15 retirement (Finding 3) is outside this removal.

### Original rollout

1. Add `gpt-realtime-2.1` to the deployment map, gated by a new feature flag
   `voice_realtime_21`.
2. `voice_realtime_21` takes **precedence over** `voice_realtime_2` in both the
   realtime token routes, with a graceful fallback chain:
   `gpt-realtime-2.1` → `gpt-realtime-2` → `gpt-realtime-1.5` → `gpt-realtime`.
   If `AZURE_OPENAI_REALTIME_DEPLOYMENT_V21` is unset, the flag is a no-op and
   the previous behaviour is preserved.
3. Add `cedar` to the `RealtimeVoice` union and surface it (with `marin`) in the
   accessibility voice picker. Cedar is valid on the `gpt-realtime-2.x` line.

## Consequences

- New env var `AZURE_OPENAI_REALTIME_DEPLOYMENT_V21` documented in `.env.example`,
  `.env`, `SETUP.md`, `.github/workflows/ci.yml`, `validate-pre-deploy.ts`.
- Flag activated at 100% (server + client defaults) once the Azure deployment
  exists. Kill-switch available for instant rollback to v2.
- Fallback chain guarantees no voice outage if the V21 deployment is removed.

## Rollback

Set `voice_realtime_21` `killSwitch: true` (or status `disabled`) — traffic
falls back to `gpt-realtime-2` immediately. No redeploy required.
