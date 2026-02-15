# V1Codex (V1) - MirrorBuddy Consolidated Remediation Source of Truth

Date: 2026-02-14
Sources: `DUPLICATION-ANALYSIS.md`; `mirrorbuddy-voice-architecture-audit-2026-02-14.md`; `Voice26.md`

Purpose: Single coherent, actionable reference for planning and execution; IDs in this doc are stable and should be used in issues/PRs. For detailed evidence and per-file notes, refer to the three source audits.

Non-negotiables (project rules):

- Next.js App Router, Prisma, `validateAuth()`/`pipe(withAuth, ...)`, `next-intl`, tier system.
- Proxy/CSP only in `src/proxy.ts`; CSP changes must stay aligned with nonces in `src/components/providers.tsx`.
- Safety is a critical path: `src/lib/safety/` guardrails must apply consistently (EU AI Act + GDPR + COPPA constraints).
- Accessibility is a critical path: WCAG 2.1 AA, 7 DSA profiles.
- No user data in `localStorage`.
- Keep files <= 250 lines (split when needed).

Deadlines and P0 risks:

- 2026-04-30: Azure Realtime Preview deprecation -> GA migration required.
- Voice safety gap vs chat (compliance risk for minors).
- Missing i18n namespaces (`voice`, `analytics`) -> runtime UX breakage risk.
- Consent fragmentation (GDPR risk) and conversation-store duplication (state divergence risk).

Repo snapshot (spot-checked 2026-02-14; re-check before execution):

- Voice Preview endpoints still active:
  - `src/app/api/realtime/ephemeral-token/route.ts` calls `/openai/realtimeapi/sessions?api-version=2025-04-01-preview`.
  - `src/app/api/realtime/token/route.ts` returns regional `*.realtimeapi-preview.ai.azure.com` WebRTC endpoint and uses `AZURE_OPENAI_REALTIME_REGION`.
- CSP still whitelists `*.realtimeapi-preview.ai.azure.com`: `src/proxy.ts`.
- WebRTC connection has avoidable latency: STUN + ICE wait + double fetch via `/api/realtime/token` in `src/lib/hooks/voice-session/webrtc-connection.ts`.
- Session config path is still `session.update` after connect; sequential memory + adaptive fetch in `src/lib/hooks/voice-session/session-config.ts`.
- Voice safety injection is not applied in voice session code (no `injectSafetyGuardrails` usage in `src/lib/hooks/voice-session/`).
- Voice prompt builder still truncates (now 6000 chars) while stripping KB: `src/lib/hooks/voice-session/voice-prompt-builder.ts`.
- i18n NAMESPACES missing `voice`/`analytics`: `src/i18n/request.ts`; code calls `useTranslations('voice')` and `useTranslations('analytics')`.
- CORS already allows `X-CSRF-Token` (Voice26 P6 appears resolved): `src/lib/security/cors-config.ts`.
- Locale-prefixed `/{locale}/admin` redirect drops query params: `src/proxy.ts`.

Target state (endgame across all three audits):

- One conversation UI framework (maestro/coach/buddy/education) with shared components and data-driven variants.
- Voice: GA protocol, <1.5s connect, consistent across characters, locale-correct greetings, safety parity, accessible call UX.
- i18n: one config, `messages/*` is source of truth, all namespaces loaded, no hardcoded UI strings.
- State: single consent source of truth, single conversation store, no `localStorage` user data, API calls deduped/cached.
- API: consistent `pipe()` usage and consistent error shapes.
- Utilities: canonical implementations for leveling, date/time formatting, filename sanitization, and shared error patterns.

## Priority backlog (stable IDs)

P0:

- V1-VOICE-GA-01: Preview -> GA migration (endpoints, session config in token request, GA event names, CSP).
- V1-VOICE-SAFE-01: Voice safety parity (instruction-level guardrails + monitoring/UX).
- V1-I18N-01: Load `voice` + `analytics` namespaces in `src/i18n/request.ts`.
- V1-STATE-01: Consent consolidation (GDPR correctness).
- V1-STATE-02: Conversation store consolidation (avoid divergent messages).

P1:

- V1-VOICE-PERF-01: Remove STUN/ICE waits, remove double fetch, parallelize session inputs, remove artificial greeting delays.
- V1-VOICE-UX-01: Locale-aware greetings + formal address correctness (5 locales).
- V1-CHAR-UX-01: Unify the 3 chat surfaces into `UnifiedChatView`.
- V1-CHAR-UX-02: Unify `MessageBubble` with feature parity (TTS/voice badge/attachments).
- V1-I18N-02: Remove dead i18n config and unused aggregated messages; enforce one message source.

P2:

- V1-API-01: Migrate eligible non-streaming manual-auth routes to the `pipe()` pattern.
- V1-API-02: Standardize API error response shape; extract conversation ownership checks.
- V1-UTIL-01: Consolidate `calculateLevel()` variants; make meaning explicit.
- V1-UTIL-02: Consolidate date/time formatting; make variants explicit.
- V1-UTIL-03: Consolidate `sanitizeFilename()`.
- V1-STATE-03: Eliminate user-data `localStorage` usage.
- V1-STATE-04: Add request dedup/caching for repeated endpoints.
- V1-UI-01: Shared `<Spinner />`; remove inline spinners over time.
- V1-CLEAN-01: Remove dead code (root `i18n/config.ts`, unused types, GA-migration cleanups).

## Workstreams

### A) Voice (GA + safety + UX)

A1) GA migration (deadline-driven):

- V1-VOICE-GA-01 (server): `src/app/api/realtime/ephemeral-token/route.ts` -> GA `/openai/v1/realtime/client_secrets`; include session config in request body.
- V1-VOICE-GA-02 (server): `src/app/api/realtime/token/route.ts` -> remove regional preview endpoint and `AZURE_OPENAI_REALTIME_REGION`; keep deterministic `/openai/v1/realtime/calls`.
- V1-VOICE-GA-03 (client): `src/lib/hooks/voice-session/webrtc-connection.ts` -> no STUN servers, no ICE wait, no double fetch, use GA endpoint.
- V1-VOICE-GA-04 (client): `src/lib/hooks/voice-session/event-handlers.ts` -> GA event names (`response.output_*`).
- V1-VOICE-GA-05 (infra): `src/proxy.ts` -> drop preview domain from CSP once fully cut over.
  Acceptance: no Preview domains/api-version in prod path; `./scripts/ci-summary.sh --quick` passes.

A2) Safety parity:

- Prefer server-side safety injection once session config moves into `client_secrets`; until then, inject in `src/lib/hooks/voice-session/session-config.ts`.
- Add transcript-based monitoring/reaction via `src/lib/hooks/voice-session/event-handlers.ts` (log + cancel/redirect + UI warning).
- Add unit tests to prevent regression.
  Acceptance: voice instructions include safety guardrails; safety events are observable/logged for crisis/bias/jailbreak patterns.

A3) Perf/UX:

- Parallelize memory/adaptive-context fetches or move them server-side under GA.
- Remove PCM16 fields (dead in WebRTC) once GA path is stable.
- Greetings: locale/formality correctness; optional ring UX after GA stabilization (must honor reduced motion and DSA profiles).
  Acceptance: measurable connect time improvement (<1.5s desktop target); greeting locale matches it/en/fr/de/es.

### B) Character conversation UI unification

- Migrate MaestroSession, CharacterChatView, and Education conversation to `UnifiedChatView`.
- Unify `MessageBubble` and `CharacterCard`; ensure TTS/handoff/voice affordances are consistent with tier gating.
  Acceptance: feature parity across character types; fewer duplicated components; accessibility review passes for unified surfaces.

### C) i18n correctness + cleanup

- V1-I18N-01: add `voice` + `analytics` to `src/i18n/request.ts` NAMESPACES.
- Remove dead root `i18n/config.ts`; remove or regenerate `src/i18n/messages/*.json` if confirmed unused.
- Migrate hardcoded Italian strings (start with export labels and voice UI error states).
  Acceptance: `useTranslations('voice'/'analytics')` resolves correctly; no unused/confusing i18n sources.

### D) State and consent integrity

- Consolidate consent into one runtime store + one persistence key (single migration path).
- Consolidate conversation state into one authoritative message source + persistence strategy.
- Remove `localStorage` user-data; add request dedup/caching.
  Acceptance: consent revocation consistent; conversation state does not diverge; `localStorage` policy upheld.

### E) API standardization

- Move eligible routes to `pipe(withSentry, withCSRF, withAuth, ...)` (keep streaming exceptions explicit).
- Standardize error shape; extract conversation ownership checks.
  Acceptance: consistent auth/CSRF ordering; clients handle errors uniformly.

### F) Utilities and dead code

- Replace ambiguous `calculateLevel()` variants; centralize date/time formatting; centralize `sanitizeFilename()`.
- Remove dead files flagged by audits (and GA-only cleanup).
  Acceptance: no duplicate utilities with same name/different meaning; removal does not break build/tests.

## Execution order (recommended)

- Phase 0 (same day): V1-I18N-01; V1-VOICE-SAFE-01 if GA is not shipping within 48h; quick deletions only after confirming unused.
- Phase 1 (week 1): Workstream A1 GA migration + CSP updates.
- Phase 2 (week 2): Workstream A2 safety finalized server-side; A3 perf and greetings.
- Phase 3 (weeks 3-6): Workstream B UI unification; Workstream D consent/store consolidation.
- Phase 4 (weeks 6+): Workstreams E/F and deeper i18n hardcoded-string audit.

## Verification commands

- `./scripts/ci-summary.sh --quick`
- `./scripts/ci-summary.sh`
- Targeted unit tests for touched areas; run `./scripts/ci-summary.sh --full` for release gate rehearsals.

Assumptions and residual risks:

- Confirm `src/i18n/messages/*.json` is truly unused before deletion (dynamic imports may exist).
- Transcript safety reactions are inherently post-audio in WebRTC; instruction-level safety is mandatory.
- GA migration can change model behavior; validate all 26 maestri and tier gating before rollout.
