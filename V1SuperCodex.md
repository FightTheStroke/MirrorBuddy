# V1SuperCodex — MirrorBuddy Full Operational Implementation Plan

**Date**: 14 February 2026  
**Status**: Execution-ready plan  
**Sources consolidated**: `DUPLICATION-ANALYSIS.md`, `mirrorbuddy-voice-architecture-audit-2026-02-14.md`, `Voice26.md`

---

## 1) Goal and non-negotiables

Build one ordered, end-to-end remediation program that removes voice protocol risk, restores safety/personality fidelity, unifies conversation architecture, resolves i18n/consent/state issues, and standardizes API/utilities.

Non-negotiables:

1. Voice must migrate to GA Realtime protocol before Preview deprecation.
2. Voice must match chat safety intent (preventive + reactive controls).
3. No policy-breaking user-data persistence in `localStorage`.
4. No wave closes without its exit gate passing.
5. Traceability to all findings (`DUP-*`, `VA-*`, `VOX-*`) is mandatory.

---

## 2) Execution model

## 2.1 Definition of Ready (per task)

- Scope and target files are explicit.
- Dependencies are marked complete.
- Validation command is assigned.

## 2.2 Definition of Done (per task)

- Code/docs updated.
- Required tests/checks for that task pass.
- Linked findings are marked covered in traceability map.

## 2.3 Global feature flags to use

- `voice.gaProtocol`
- `voice.fullPrompt`
- `voice.transcriptSafety`
- `voice.callingOverlay`
- `chat.unifiedView`
- `consent.unifiedModel`

---

## 3) Wave order (hard sequence)

1. **W0 Foundation** -> 2. **W1 Voice GA Core** -> 3. **W2 Voice Safety + Persona** -> 4. **W3 Voice UX + Locale** -> 5. **W4 Conversation Unification** -> 6. **W5 i18n + Consent + State** -> 7. **W6 API + Utility + Perf** -> 8. **W7 Hardening + Release**

Parallelization rule:

- W4 and W5 can overlap only after W3 exit gate.
- W6 starts after W4 and W5 interface contracts are stable.

---

## 4) Detailed task plan (ordered execution)

## W0 — Foundation and controls

**Exit gate**: baseline health checks green + rollout controls in place.

- **W0-01** Create execution branch/worktree and lock target scope. `Depends: none`.
- **W0-02** Capture baseline metrics: voice connect latency, first audio latency, voice failure rate.
- **W0-03** Capture baseline CI: `./scripts/ci-summary.sh --quick` and `--unit`.
- **W0-04** Create parity matrix template (TTS, voice call, handoff, headers, i18n).
- **W0-05** Define rollback toggles for all feature flags.
- **W0-06** Define compliance logging checkpoints for voice safety events.
- **W0-07** Record current CSP/proxy assumptions and env vars for migration diff.
- **W0-08** Build voice secret matrix (local, dev, preview, prod, CI) with required vars and owners.

## W1 — Voice GA protocol and latency core (P0)

**Primary findings**: `VA-01..VA-11`, `VA-14`, `VOX-05`  
**Exit gate**: GA voice call succeeds with stable latency and no preview-only dependency.

- **W1-01** Update ephemeral token route to use `/openai/v1/realtime/client_secrets`. `Depends: W0-07`.
- **W1-02** Move session config payload into token request body (`model`, `instructions`, `voice`, audio config).
- **W1-03** Update SDP exchange to `/openai/v1/realtime/calls` on resource domain.
- **W1-04** Remove preview `api-version` dependence from GA flow.
- **W1-05** Ensure GA path does not send `OpenAI-Beta` header.
- **W1-06** Update client token/endpoint types for GA contract.
- **W1-07** Remove explicit STUN/ICE server dependency for Azure WebRTC call.
- **W1-08** Remove ICE gathering completion wait before posting SDP offer.
- **W1-09** Remove double-fetch SDP flow; use deterministic endpoint from GA contract.
- **W1-10** Parallelize memory/adaptive-context fetch with token + media acquisition.
- **W1-11** Wire `token-cache` into voice connection flow.
- **W1-12** Keep `webrtcfilter` explicitly disabled (until tool event architecture changes).
- **W1-13** Treat WebSocket observer as backlog item, not migration blocker.
- **W1-14** Update CSP (`src/proxy.ts`) by removing preview realtime domain after cutover validation.
- **W1-15** Remove deprecated voice transport fallback artifacts only after W1 tests pass.
- **W1-16** Align Azure realtime model deployments (`gpt-realtime`, `gpt-realtime-mini`) with tier mapping and deployment-mapping logic.
- **W1-17** Rotate/sync realtime secrets across environments and retire deprecated voice vars (`AZURE_OPENAI_REALTIME_REGION`, `AZURE_OPENAI_REALTIME_API_VERSION`) from runtime checks/docs.

Validation for W1:

- `npm run test:unit -- src/lib/hooks/voice-session/`
- `npm run test:e2e:smoke`
- Target: connect path works with `voice.gaProtocol` enabled.

## W2 — Voice safety parity + personality fidelity (P0)

**Primary findings**: `VOX-01`, `VOX-02`, `VA-04..VA-06`, `VA-12`, `VA-13`  
**Exit gate**: full persona + layered safety active in voice sessions.

- **W2-01** Replace truncation behavior tied to `MAX_VOICE_PROMPT_CHARS`.
- **W2-02** Build full voice instruction assembly from complete character system prompt.
- **W2-03** Integrate safety guardrails strategy equivalent to `injectSafetyGuardrails` for client-safe usage.
- **W2-04** Add transcript safety check on user transcription events.
- **W2-05** Add transcript post-check on assistant transcript events for audit and escalation.
- **W2-06** Implement safe-response redirect flow (`response.cancel` + safe continuation), not hard session kill.
- **W2-07** Add UI warning state for safety intervention during voice call.
- **W2-08** Update event handler mapping for GA event names and keep controlled compatibility window.
- **W2-09** Ensure `session.update` includes `type: "realtime"` wherever still required.
- **W2-10** Add/extend tests: prompt builder, transcript safety, compliance logging hooks.
- **W2-11** Run persona fidelity review on representative set (maestri/coaches/buddies) before full rollout.

Validation for W2:

- `npm run test:unit -- src/lib/hooks/voice-session/`
- `./scripts/ci-summary.sh --unit`

## W3 — Voice UX, locale correctness, and critical polish (P1)

**Primary findings**: `VOX-03..VOX-07`  
**Exit gate**: locale/formality behavior deterministic; no CORS/admin redirect regressions.

- **W3-01** Thread current locale into character creation pipeline.
- **W3-02** Use `getGreeting({ language })` for maestri/coaches; static `greeting` fallback only.
- **W3-03** Enforce formal greeting behavior for formal professors (ADR 0064 alignment).
- **W3-04** Add tests for multilingual greeting resolution across supported locales.
- **W3-05** Implement calling overlay state machine (`idle -> ringing -> connected/error`).
- **W3-06** Add accessibility adaptations (`prefers-reduced-motion`, auditory profile behavior).
- **W3-07** Add `X-CSRF-Token` (+ lowercase variant) to CORS allowed headers.
- **W3-08** Preserve query params in admin locale redirect path.
- **W3-09** Finalize voice assignment redistribution only after W1/W2/W3 stability.
- **W3-10** Validate no UX dead time and no new navigation errors.

Validation for W3:

- `npm run test:unit -- csp-validation`
- `npm run test:e2e:smoke`
- `./scripts/ci-summary.sh --quick`

## W4 — Conversation platform unification (P1)

**Primary findings**: `DUP-A1..A8`, `DUP-F1`  
**Exit gate**: one shared conversation foundation with feature parity.

- **W4-01** Define `UnifiedChatView` contract (character type, voice, handoff, feature toggles).
- **W4-02** Extract shared conversation shell from maestro/coach-buddy flows.
- **W4-03** Create shared `MessageBubble` supporting TTS, voice badge, attachments via props.
- **W4-04** Move maestro session onto shared primitives.
- **W4-05** Move coach/buddy chat onto shared primitives.
- **W4-06** Integrate handoff behavior into all character paths (including maestro).
- **W4-07** Rationalize header variants into configurable strategy instead of siloed implementations.
- **W4-08** Unify character card components into single reusable primitive.
- **W4-09** Align education conversation path with shared primitives or adapter.
- **W4-10** Consolidate conversation stores to one source of truth and remove dual-write risk.
- **W4-11** Add parity tests for TTS/voice/handoff across all character types.
- **W4-12** Document and enforce static-vs-dynamic prompt contract (maestri/coaches static, buddies dynamic) to prevent accidental regressions.
- **W4-13** Document and codify knowledge-base scope by character class (maestri RAG-backed; coach/buddy prompt-led) with explicit product behavior notes.

Validation for W4:

- `npm run test:unit -- src/components/conversation/`
- `npm run test:e2e:smoke`

## W5 — i18n, consent, and policy-safe persistence (P0/P1)

**Primary findings**: `DUP-C1..C4`, `DUP-F2`, `DUP-F3`  
**Exit gate**: i18n and consent are single-source and GDPR-safe.

- **W5-01** Remove dead root `i18n/config.ts` and keep only canonical config path.
- **W5-02** Resolve `messages/` vs `src/i18n/messages/` strategy (remove or regenerate with one authoritative flow).
- **W5-03** Add missing runtime namespaces (`voice`, `analytics`) to loader.
- **W5-04** Decide fate of unused namespaces (`session`, `onboarding`, `email`, `research`): remove or wire.
- **W5-05** Migrate hardcoded Italian strings to i18n keys (prioritize exported content + user-facing errors).
- **W5-06** Run namespace sync and locale propagation workflow.
- **W5-07** Unify consent model and storage APIs under single domain contract.
- **W5-08** Implement migration path from legacy consent keys to unified consent key.
- **W5-09** Remove policy-violating user-data `localStorage` usages; keep only allowed categories.
- **W5-10** Add tests for consent revocation consistency and cross-flow behavior.
- **W5-11** Run compliance verification script and document evidence.

Validation for W5:

- `npm run i18n:check`
- `npx tsx scripts/compliance-check.ts`
- `./scripts/ci-summary.sh --unit`

## W6 — API consistency, performance dedup, utility DRY (P1/P2)

**Primary findings**: `DUP-B1..B3`, `DUP-D1..D5`, `DUP-E1..E4`, `DUP-F4`  
**Exit gate**: API contracts and shared utilities are standardized.

- **W6-01** Inventory manual auth routes; split streaming vs non-streaming migration plan.
- **W6-02** Migrate non-streaming manual-auth routes to `pipe()` middleware chain.
- **W6-03** Introduce streaming-safe auth helper for SSE/stream routes.
- **W6-04** Define shared `ApiErrorResponse` type and helper builders.
- **W6-05** Refactor repeated conversation ownership checks into shared utility/middleware.
- **W6-06** Standardize rate-limit API usage strategy (sync/async policy by route class).
- **W6-07** Implement request dedup/shared caching for hot endpoints (`/api/realtime/token`, `/api/user/usage`, etc.).
- **W6-08** Consolidate duplicated auto-save wrappers into single implementation.
- **W6-09** Introduce shared `Spinner` UI primitive and start replacing ad-hoc loaders.
- **W6-10** Consolidate `sanitizeFilename()` into single utility module.
- **W6-11** Consolidate level calculators into explicit, domain-named calculators.
- **W6-12** Consolidate date/time formatting into shared locale-aware formatting module.
- **W6-13** Remove dead typing duplication file and other validated dead artifacts.
- **W6-14** Define base app error hierarchy strategy to reduce scattered custom error handling.
- **W6-15** Migrate TOS modal to shared dialog wrapper (`@/components/ui/dialog`) to close remaining modal-pattern inconsistency.

Validation for W6:

- `./scripts/ci-summary.sh --quick`
- `./scripts/ci-summary.sh --unit`
- route-focused unit tests for migrated API handlers

## W7 — Hardening, release readiness, and closure

**Exit gate**: release gates pass and monitoring baseline is clean.

- **W7-01** Run full project checks (`./scripts/ci-summary.sh --full`).
- **W7-02** Run `npm run release:fast`.
- **W7-03** Run `npm run release:gate`.
- **W7-04** Update ADRs/docs for GA migration, safety model, and unified architecture decisions.
- **W7-05** Confirm CSP, proxy, i18n, consent, and voice observability dashboards are healthy.
- **W7-06** Final bug bash on critical journeys (voice session, chat handoff, admin navigation, i18n switching).
- **W7-07** Prepare rollback notes and feature-flag fallback matrix.
- **W7-08** Mark program complete only after user acceptance of all wave outcomes.
- **W7-09** Update voice ops docs (`SETUP.md`, `SETUP-PRODUCTION.md`, `docs/technical/AZURE_REALTIME_API.md`, ADR update) and verify no stale Preview/secret guidance remains.

---

## 5) Traceability map (findings -> execution)

- `VA-01..VA-14` -> W1 (core), W2 (event/session safety specifics).
- `VOX-01..VOX-02` -> W2.
- `VOX-03..VOX-07` -> W3 (+ W1 for token-cache dependency).
- `DUP-A1..A8` -> W4.
- `DUP-B1..B3` -> W6.
- `DUP-C1..C4` -> W5.
- `DUP-D1..D5` -> W6.
- `DUP-E1..E4` -> W6.
- `DUP-F1` -> W4.
- `DUP-F2..F3` -> W5.
- `DUP-F4` -> W6.
- `DUP-A7/A8` are explicitly handled by W4-12/W4-13; `DUP-B2` is explicitly handled by W6-15.

No finding is left unmapped.

---

## 6) Mandatory quality gates per wave

Minimum every wave:

```bash
./scripts/ci-summary.sh --quick
./scripts/ci-summary.sh --unit
```

Conditional gates:

- Voice changes: `npm run test:unit -- src/lib/hooks/voice-session/`
- Proxy/CSP changes: `npm run test:unit -- csp-validation`
- i18n changes: `npm run i18n:check`
- Compliance-sensitive changes: `npx tsx scripts/compliance-check.ts`
- Pre-release: `npm run release:fast` and `npm run release:gate`

---

## 7) First sprint start queue (immediate next actions)

1. Execute `W0-01` to `W0-07`.
2. Execute `W1-01` to `W1-15`.
3. Execute `W2-01` to `W2-11`.
4. Execute `W3-01` to `W3-10`.
5. Reassess metrics, then start W4/W5.

This document is the authoritative operational plan for implementation order, task granularity, dependencies, and validation.
