# ADR 0169: Azure Voice 2026-07 Rollout (gpt-realtime-2.1 + Cedar voice)

## Status

Accepted — 2026-07-19
Corrected — 2026-08-31 (historical lifecycle evidence: **Public Preview**, not GA)
Corrected — 2026-09-17 (retirement dates: published schedule and regional catalogue disagree)
Audited — 2026-09-21 (lifecycle sources conflict; production configuration and device alignment)
Verified — 2026-09-21 (legacy variable is a real GA deployment; every configured rung mints, both GA rungs answer)

## Historical correction (2026-08-31; evidence refreshed 2026-09-17)

The original decision below recorded `gpt-realtime-2.1` (and, by implication, the
whole GPT Realtime 2.x line) as **GA**. The evidence available for this correction
classified the entire 2.x line as **Public Preview**. The following table preserves
the September 17 snapshot; see the September 21 audit for changed lifecycle labels:

- Overview page is literally titled _"GPT Realtime 2.x (preview)"_ and states
  _"This feature is currently in public preview … provided without a service-level
  agreement"_ —
  <https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/realtime-2>
- Retirement schedule (read 2026-09-17, updated 2026-09-14) lists the lifecycle stage for each row —
  <https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule>

| Model                   | Version    | Lifecycle   | Published retirement    | Regional inference retirement |
| ----------------------- | ---------- | ----------- | ----------------------- | ----------------------------- |
| `gpt-realtime`          | 2025-08-28 | **GA**      | 2027-03-02              | 2027-03-02                    |
| `gpt-realtime-1.5`      | 2026-02-23 | **GA**      | 2027-08-24              | 2027-08-24                    |
| `gpt-realtime-2`        | 2026-05-06 | **Preview** | 2026-08-31              | 2026-10-31                    |
| `gpt-realtime-2.1`      | 2026-07-07 | **Preview** | 2027-06-25              | 2027-07-31                    |
| `gpt-realtime-2.1-mini` | 2026-07-07 | **Preview** | 2027-06-25              | 2027-07-31                    |
| `gpt-realtime-mini`     | 2025-12-15 | **GA**      | 2026-12-15 / 2027-06-15 | 2026-12-15                    |

The regional column comes from `az cognitiveservices model list -l swedencentral`,
`model.deprecation.inference`, read 2026-09-17. The mini model has two conflicting
published rows for the same version. Use the earlier date for planning until
Microsoft reconciles these sources; neither metadata source proves live inference.
The prior **2026-10-15** claim for 2.1 was incorrect, not a verified date change.
That date belongs to the **2025-03-20** versions of `gpt-4o-transcribe`,
`gpt-4o-mini-transcribe`, and `gpt-4o-mini-tts`.

Read-only deployment inventory confirms the versions above for configured 2.1,
2.0, and mini, and identifies the GA 1.5 deployment as **`gpt-realtime-15`**.
The resource instead uses `gpt-realtime-whisper` `2026-05-06` and `tts` / `tts-hd`
`001`, whose regional retirement dates are 2027-05-06 and 2026-12-15 respectively.
Do not apply the October date to all transcription or speech synthesis models.

### Accepted risk (historical decision, not superseded by conflicting labels)

Running a model documented as Public Preview in production is an **accepted, conscious risk**, not
a bug. Preview carries **no SLA** and Microsoft does not recommend it for production.
It is accepted here because 2.1 has genuinely better alphanumeric speech
(dates/numbers/formulas), which materially helps students with discalculia and STEM
Maestri. This risk must stay explicitly recorded; the newer conflicting GA labels
below do not establish SLA coverage or supersede this decision.

### Rollback reality

The deployment-selection priority is
`gpt-realtime-2.1` → `gpt-realtime-2` → `gpt-realtime-1.5` → `gpt-realtime`. Note that
**`gpt-realtime-2` is itself Preview, with conflicting retirement dates above**:
it is not a durable fallback. A configured deployment reporting `Succeeded` does
not prove that it can still serve requests. The **uncontested GA fallback rungs** are `gpt-realtime-1.5`
(retires 2027-08-24) and `gpt-realtime` (retires 2027-03-02). A true rollback to a
supported model must land on one of those two.

## Read-only audit (2026-09-21)

### Lifecycle sources still disagree

The regional `swedencentral` catalogue now labels `gpt-realtime-2.1`
`2026-07-07` **GenerallyAvailable**, with inference retirement **2027-07-31**.
Microsoft Learn's retirement schedule, fetched September 21, now labels both
`gpt-realtime-2.1` and `gpt-realtime-2.1-mini` **GA**, retiring **2027-06-25**.
The regional catalogue still labels **2.1-mini Preview**. The overview linked
above still describes the entire 2.x line as **Preview, without an SLA**.
These sources conflict: neither blanket Preview nor blanket GA is an adequate
current summary, and **SLA coverage cannot be inferred** from these labels.

`gpt-realtime-2` remains Preview in both lifecycle listings. Learn's
**2026-08-31** retirement date is already past, while the regional catalogue says
**2026-10-31**; this disagreement is **not proof of an outage**.
For `gpt-realtime-mini` `2025-12-15`, Learn still has duplicate retirement dates
**2026-12-15 / 2027-06-15**, while the regional date remains **2026-12-15**.
Keep the earlier date for planning; this audit does not mandate a mini upgrade.

### Production configuration and bounded inference proof

The production audit observed `deployment: gpt-realtime-2.1` at
<https://www.mirrorbuddy.org/api/realtime/token> and the same value for
`azure.realtimeModel` at <https://www.mirrorbuddy.org/api/provider/status>.
The following compares inspected Vercel production values against the inventory
from `az cognitiveservices account deployment list` on the configured resource:

| Environment variable suffix (`AZURE_OPENAI_REALTIME_DEPLOYMENT`) | Production value    | Azure model / version              |
| ---------------------------------------------------------------- | ------------------- | ---------------------------------- |
| `_V21`                                                           | `gpt-realtime-2.1`  | `gpt-realtime-2.1` / `2026-07-07`  |
| `_V2`                                                            | `gpt-realtime-2`    | `gpt-realtime-2` / `2026-05-06`    |
| `_V15`                                                           | `gpt-realtime-15`   | `gpt-realtime-1.5` / `2026-02-23`  |
| `_MINI`                                                          | `gpt-realtime-mini` | `gpt-realtime-mini` / `2025-12-15` |
| (none; legacy)                                                   | `gpt-realtime`      | `gpt-realtime` / `2025-08-28`      |

The legacy row previously recorded here as `gpt-4o-realtime` — a name absent from
the deployment inventory — was **not confirmed**. A direct read of the production
environment on **2026-09-21 at 13:05 UTC** (`vercel env pull --environment=production`,
values held only in memory and deleted immediately) returned
`AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime`, which matches a real GA deployment.
The variable was last modified 218 days before that read, so it did not change during
this correction. **There is no legacy configuration drift.** No cloud mutations were
authorized or performed by this audit.
Endpoint metadata and inventory alone do **not** prove inference. A bounded probe
on September 21 at 09:29 UTC used the current resource key (held only in memory),
minted a GA client secret, connected by WebSocket, selected Cedar, and requested
one short synthetic audio response per deployment:

| Deployment         | Token HTTP | Session update | Response  | Audio bytes received |
| ------------------ | ---------- | -------------- | --------- | -------------------- |
| `gpt-realtime-2.1` | 200        | accepted       | completed | 84,000               |
| `gpt-realtime-15`  | 200        | accepted       | completed | 60,000               |

This proves real audio inference on both the selected deployment and the intended
GA fallback, not browser microphone/playback or student usability. The route tests
separately prove a rejected preferred deployment retries on `gpt-realtime-15`.
No production outage was induced or feature flag changed. The copied local `.env`
key initially returned 401; this was not a production-service failure.

#### Second probe — every configured rung, 2026-09-21 13:10 UTC

The September 21 probe above covered two deployments. A second bounded probe the
same day covered **every rung the selection chain can reach**, using the resource
key read from `az cognitiveservices account keys list` and held only in memory. Each
deployment was minted over the GA protocol
(`POST /openai/v1/realtime/client_secrets`) and then driven over WebSocket with one
text turn, so the answer is upstream inference output rather than provisioning state:

| Deployment          | Client secret | WebSocket text response |
| ------------------- | ------------- | ----------------------- |
| `gpt-realtime`      | HTTP 200      | `Fallback ok.`          |
| `gpt-realtime-15`   | HTTP 200      | `fallback ok`           |
| `gpt-realtime-2.1`  | HTTP 200      | `fallback ok`           |
| `gpt-realtime-2`    | HTTP 200      | not exercised           |
| `gpt-realtime-mini` | HTTP 200      | not exercised           |

This closes the open acceptance item "demonstrate selection and successful inference
on the intended GA fallback": both GA rungs — `gpt-realtime-15` and the legacy
`gpt-realtime` — answered a real request on the day of the check.

#### Watch item — `gpt-realtime-mini` retirement

`gpt-realtime-mini` `2025-12-15` carries a regional inference retirement of
**2026-12-15**, and its successor `gpt-realtime-2.1-mini` is **not deployed** on the
resource (inventory read 2026-09-21). This is not a production risk today: no token
route selects the mini rung — since the removal of per-tier model selection it
survives only as a name alias in `deployment-mapping.ts`. If a mini rung is ever put
back into a selection chain, `gpt-realtime-2.1-mini` must be deployed first.

### Selection versus request retry

Flag-aware selection uses configured priority **V21 -> V2 -> V15 -> legacy**.
Until #1080 an ephemeral-session request failure permitted **one** retry only,
targeting V15 when configured, otherwise legacy — so a failed V15 retry did not
fall through to legacy. Since #1080 (2026-09-21) the route walks the **full chain of
untried GA candidates** (`resolveGaFallbackChain`), stopping at the first success or
at any failure that is not a missing deployment. Both GA rungs are now reachable
from a single request, and the legacy value is a real GA deployment (see above), so
the fallback risk recorded here is resolved.

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

> Historical lifecycle row corrected 2026-08-31; not a current lifecycle verdict.
> This row originally read `GA`. See the September 21 source conflict above.

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
route previously used environment-only priority V21 -> V2 -> legacy, without these
flags or the V15 rung. **Behavior in this change, not yet verified in production:**
device credentials use the shared `resolveRealtimeDeployment` and the same feature
flags and V21 -> V2 -> V15 -> legacy priority as web configuration.
Neither path consults the user's tier for model selection; the September 16
removal did not change routing or tier-based voice usage limits.

Preview-model risk remains tracked in #1022 (Finding 1); the `gpt-realtime-mini`
2026-12-15 retirement (Finding 3) is outside this removal.

### Original rollout

1. Add `gpt-realtime-2.1` to the deployment map, gated by a new feature flag
   `voice_realtime_21`.
2. `voice_realtime_21` takes **precedence over** `voice_realtime_2` in both the
   realtime token routes, with a deployment-selection priority:
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
- Fallback reduces exposure to a retired V21 deployment; it does not guarantee
  availability. Successful inference on the selected fallback still needs live evidence.

## Rollback

Set `voice_realtime_21` `killSwitch: true` (or status `disabled`) — traffic
can fall back to `gpt-realtime-2` on flag-aware web routes. That is still Preview,
not a confirmed GA rollback. This change aligns the device path with web selection,
but that alignment is not yet production evidence.
Verify the selected deployment and successful inference before declaring recovery.
The documentation audit does not change flags, cloud resources, or the accepted-risk decision.
