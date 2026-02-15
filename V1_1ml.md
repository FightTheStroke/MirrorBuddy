# MirrorBuddy V1.1 — Consolidated Technical Debt & Architecture Remediation Plan

**Date**: 14 February 2026
**Sources**: DUPLICATION-ANALYSIS.md, Voice Architecture Audit, Voice26.md
**Scope**: Full codebase — voice, UI, i18n, state, API, services, dead code
**Method**: Static analysis verified on source code + Azure GA docs

---

## TABLE OF CONTENTS

1. [Overview & Statistics](#overview)
2. [AREA 1 — Voice System (GA Migration + Safety + UX)](#area-1)
3. [AREA 2 — UI Unification (Chat Views, Bubbles, Cards)](#area-2)
4. [AREA 3 — i18n & Localization](#area-3)
5. [AREA 4 — State Management](#area-4)
6. [AREA 5 — API Routes & Services](#area-5)
7. [AREA 6 — Dead Code & Cleanup](#area-6)
8. [Design Notes (Correct by Design)](#design-notes)
9. [Risk Assessment](#risk-assessment)
10. [ADR 0038-v2 (Proposed)](#adr-0038-v2)
11. [Dependency Graph](#dependency-graph)
12. [Execution Waves](#execution-waves)
13. [Fix Code Reference](#fix-code-reference)
14. [Acceptance Criteria](#acceptance-criteria)

---

<a id="overview"></a>

## OVERVIEW & STATISTICS

| Category            | Items  | Critical (P0) | High (P1) | Medium (P2) | Low (P3) |
| ------------------- | ------ | ------------- | --------- | ----------- | -------- |
| Voice System        | 15     | 4             | 6         | 3           | 2        |
| UI Unification      | 8      | 2             | 3         | 2           | 1        |
| i18n & Localization | 5      | 2             | 2         | 1           | 0        |
| State Management    | 5      | 2             | 2         | 1           | 0        |
| API & Services      | 9      | 1             | 3         | 3           | 2        |
| Dead Code & Cleanup | 7      | 0             | 0         | 3           | 4        |
| **TOTAL**           | **49** | **11**        | **16**    | **13**      | **9**    |

> **Note on item count**: 4 dead code items (D-05, D-06, D-08) are aliases of i18n items (I-02, I-03, I-05) and I-06 is an alias of V-10. They are listed under Dead Code for cleanup tracking but NOT double-counted in totals.

**Hard deadline**: Azure Preview API deprecated **30 April 2026** (2.5 months).

---

<a id="area-1"></a>

## AREA 1 — VOICE SYSTEM

The voice system has two categories of problems: (A) the GA protocol migration required before the April 2026 deadline, and (B) functional defects in the current implementation that must ship regardless of protocol.

### V-01 🔴 P0 — No Safety Guardrails in Voice Sessions

**Source**: Voice26 P1

`injectSafetyGuardrails()` is never called for voice sessions. Chat has 5 safety layers (ADR 0004); voice has ZERO. Content blocked in chat (violence, self-harm, jailbreaks, STEM dangerous knowledge) can pass through voice unchecked.

| Safety Layer         | Chat | Voice                  |
| -------------------- | ---- | ---------------------- |
| Safety system prompt | ✅   | ❌ MISSING             |
| Input content filter | ✅   | ❌ IMPOSSIBLE (WebRTC) |
| Output sanitization  | ✅   | ❌ IMPOSSIBLE (WebRTC) |
| STEM safety          | ✅   | ❌ MISSING             |
| Bias detection       | ✅   | ❌ MISSING             |
| Crisis detection     | ✅   | ❌ MISSING             |
| Jailbreak detection  | ✅   | ❌ MISSING             |

**Fix — 3-Level Safety Net**:

- **Level 1 (Instructions)**: Inject `SAFETY_CORE_PROMPT` (pure text, no server deps) into voice instructions. Prevents ~95% of issues.
- **Level 2 (Transcript)**: Hook into data channel transcript events in `event-handlers.ts` for real-time safety checks on user and AI speech.
- **Level 3 (Monitoring)**: Log all safety events via `compliance-audit-service` for EU AI Act / GDPR / L.132/2025.

**Files**: `session-config.ts`, `event-handlers.ts`, new `voice-safety.test.ts`
**Decision**: On violation → log + redirect AI to safe response + show visual warning. Do NOT terminate session.

---

### V-02 🔴 P0 — Voice SystemPrompt Truncated to 2000 chars

**Source**: Voice26 P2

`buildVoicePrompt()` extracts only ~2000 chars from the full systemPrompt (5000-8000+ chars). It keeps only: header (~50 chars), CHARACTER INTENSITY DIAL (~500-800 chars), Core Identity (~200-400 chars). It DROPS: personality details, pedagogical approach, formality rules, communication style, values, behavioral guidelines.

**Critical discovery**: Knowledge base is NOT in the systemPrompt — it's in separate `*-knowledge.ts` files loaded by RAG. The systemPrompt is 100% personality/pedagogy/safety, and 75% is being cut.

Azure Realtime API supports ~12k chars of instructions. A typical systemPrompt + safety is ~9000 chars. **There is NO technical reason for the 2000 char limit.**

**Impact**: All 38 characters (26 maestri + 6 coaches + 6 buddies) sound like generic AI assistants in voice mode.

**Fix**: Remove `MAX_VOICE_PROMPT_CHARS = 2000` in `voice-prompt-builder.ts`. Send full `systemPrompt` with safety guardrails.

**Files**: `voice-prompt-builder.ts`, `session-config.ts`, `voice-prompt-builder.test.ts`

---

### V-03 🔴 P0 — GA Endpoint Migration (Deadline: 30 April 2026)

**Source**: Voice Architecture Audit §1

Preview API (`api-version=2025-04-01-preview`) is deprecated. GA protocol introduces breaking changes:

| Component       | PREVIEW (current)                                                       | GA (required)                                                       |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Ephemeral token | `POST .../realtimeapi/sessions?api-version=2025-04-01-preview`          | `POST .../openai/v1/realtime/client_secrets`                        |
| WebRTC SDP      | `POST https://{region}.realtimeapi-preview.ai.azure.com/v1/realtimertc` | `POST https://{resource}.openai.azure.com/openai/v1/realtime/calls` |
| api-version     | Required in URL                                                         | **None** — URL contains `/openai/v1/`                               |

**Key change**: GA uses the resource endpoint directly — no regional domain. Eliminates `AZURE_OPENAI_REALTIME_REGION` env var.

**Files**: `api/realtime/ephemeral-token/route.ts`, `api/realtime/token/route.ts`, `webrtc-connection.ts`, `webrtc-types.ts`

---

### V-04 🔴 P0 — GA Session Configuration in Token Request

**Source**: Voice Architecture Audit §1.3

In GA, session configuration (instructions, voice, model) is sent WITH the `client_secrets` request, not as a separate `session.update` after connection. This merges steps 1+5 of the current flow.

Also: `session.update` now requires a `type: "realtime"` field (§1.5).

**Impact**: Major latency improvement (~400-600ms saved) and architectural simplification.

**Files**: `ephemeral-token/route.ts`, `session-config.ts`

---

### V-05 🟠 P1 — GA Event Name Changes

**Source**: Voice Architecture Audit §1.4

| PREVIEW (current)                 | GA (required)                            |
| --------------------------------- | ---------------------------------------- |
| `response.text.delta`             | `response.output_text.delta`             |
| `response.audio.delta`            | `response.output_audio.delta`            |
| `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

`event-handlers.ts` already handles both `response.audio.delta` AND `response.output_audio.delta` (partial compatibility).

**Files**: `event-handlers.ts`

---

### V-06 🟠 P1 — Remove ICE Servers + Gathering Wait

**Source**: Voice Architecture Audit §2.1, §2.2

GA sample code uses `new RTCPeerConnection()` with no ICE servers at all. MirrorBuddy uses Google STUN servers adding 100-500ms to ICE gathering, with zero benefit for client-to-Azure connections.

Additionally, `webrtc-connection.ts:293-306` waits for ICE gathering to complete before sending the SDP offer. GA docs show the offer should be sent immediately after `setLocalDescription()`.

**Savings**: ~300-500ms

**Files**: `webrtc-connection.ts`, `webrtc-types.ts`

---

### V-07 🟠 P1 — Remove Double Fetch in SDP Exchange

**Source**: Voice Architecture Audit §2.3

Current flow: (1) `GET /api/realtime/token` to get `webrtcEndpoint`, (2) `POST webrtcEndpoint` for SDP. The GA WebRTC URL is deterministic and can be returned with the ephemeral token or hardcoded.

**Savings**: ~100-300ms

**Files**: `webrtc-connection.ts`

---

### V-08 🟠 P1 — Parallelize Memory + Adaptive Context Fetches

**Source**: Voice Architecture Audit §2.4

`session-config.ts:101-124` fetches conversation memory and adaptive context **sequentially**. These should use `Promise.all()` or pre-fetch during connection setup.

**Savings**: ~200-400ms

**Files**: `session-config.ts`, `connection.ts`

---

### V-09 🟠 P1 — Greetings Always Italian

**Source**: Voice26 P3

`getGreeting(ctx)` supports all 5 languages but is NEVER called for maestri/coaches. Code uses static `.greeting` field (hardcoded Italian).

```
createActiveCharacter(character, type, profile)  ← NO language param
  → helpers.ts:31 createActiveCharacterImpl(..., language = "it")  ← defaults "it"
    → line 39: buddy.getGreeting({language})     ← buddies: OK but always "it"
    → line 44: coach.greeting                     ← coaches: static Italian ALWAYS
    → line 49: maestro.greeting                   ← maestri: static Italian ALWAYS
```

**Impact**: A German user sees "Ciao! Sono Galileo..." instead of "Guten Tag! Ich bin Galileo..."

**Fix**: Pass `locale` from `useLocale()` through `createActiveCharacter()` → `helpers.ts` → `getGreeting({language})`. Keep static `.greeting` as fallback only.

**Files**: `character-slice.ts`, `session-slice.ts`, `helpers.ts`

---

### V-10 🟠 P1 — Formal Professors Use Informal Greetings

**Source**: Voice26 P4

16 formal professors have informal "Ciao! Sono X. Come posso aiutarti oggi?" instead of formal "Lei" form required by ADR 0064. Partially fixed (static greetings updated to formal Italian), but real fix is V-09 — use `getGreeting()` which already handles formality correctly per language.

**Depends on**: V-09

---

### V-11 🟡 P2 — Phone Ring UX Pattern

**Source**: Voice Architecture Audit §3

Connection time is ~2-3.5s (desktop), well into "conversation failure zone" (>2s → 40%+ abandonment). A phone ring pattern masks 100% of wait time.

**Research data**:

- **300ms**: Human conversation response threshold (AssemblyAI)
- **500ms-1000ms**: Smooth zone. Audio cues make 1000ms feel like 500ms (Twilio)
- **>2000ms**: Conversation failure zone. 40%+ abandonment (Trillet AI Benchmarks 2026)

```
t=0ms      Click → RING STARTS immediately
t=0-800ms  Ring 1 — Background: getUserMedia + token
t=800-1600ms Ring 2 — Background: SDP exchange
t=1600-2400ms Ring 3 — Background: connection + config
t=~800ms   Connection ready → RING STOPS → Maestro speaks
```

**Accessibility**: `prefers-reduced-motion` → static text; screen reader → "Calling [Maestro]"; auditory impairment → visual-only.

**Edge cases**:

- **Fast connection** (<1s): Play at least 1 full ring before answering. Abrupt transitions feel jarring.
- **Permission dialog**: If browser shows mic permission dialog, pause ring and show "Waiting for microphone permission..."
- **Connection failure**: Ring stops, show error with retry button.
- **Reconnection**: On auto-reconnect, show "Reconnecting..." with shorter sound cue, not the full ring.
- **Timeout**: >8s (>4 rings) → "Still connecting..."; 15s desktop / 60s mobile → error.

**Files**: new `calling-overlay.tsx`, new `use-calling-state.ts`, new `ring-tone.mp3`, `voice-session.tsx`

---

### V-12 🟡 P2 — CSP Simplification After GA Migration

**Source**: Voice Architecture Audit §5

After GA migration, remove `*.realtimeapi-preview.ai.azure.com` from CSP connect-src.

**Files**: `src/proxy.ts`
**Depends on**: V-03

---

### V-13 🟡 P2 — Voice Model Tier-Based Selection

**Source**: Voice26 §9, Decision 1

Trial/Base = `gpt-realtime-mini`, Pro = `gpt-realtime` (premium). Configured via `tierService.getModelForUserFeature(userId, 'voice')`.

**GA models available**:

| Model                          | Version    | Notes                   |
| ------------------------------ | ---------- | ----------------------- |
| `gpt-4o-realtime-preview`      | 2024-12-17 | Preview only            |
| `gpt-4o-mini-realtime-preview` | 2024-12-17 | Preview only            |
| `gpt-realtime`                 | 2025-08-28 | **GA — recommended**    |
| `gpt-realtime-mini`            | 2025-10-06 | **GA — cost-optimized** |
| `gpt-realtime-mini-2025-12-15` | 2025-12-15 | **GA — latest mini**    |

Regions: East US 2, Sweden Central (global deployments).

**Files**: `ephemeral-token/route.ts`, tier configuration

---

### V-14 🟢 P3 — Voice Assignments Rebalancing

**Source**: Voice26 §6

**Current distribution** (heavily skewed):

| Voice    | Count | Characters                                                                                                                          |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| echo     | 14    | alex-pina, cassese, cervantes, cicerone, erodoto, euclide, feynman, galileo, goethe, humboldt, ippocrate, manzoni, moliere, socrate |
| alloy    | 6     | chris, darwin, leonardo, mozart, shakespeare, smith                                                                                 |
| shimmer  | 3     | curie, levi-montalcini, lovelace                                                                                                    |
| ash      | 1     | mascetti                                                                                                                            |
| verse    | 1     | omero                                                                                                                               |
| (unused) | —     | marin, cedar, ballad, coral, sage                                                                                                   |

**Proposed distribution** (diversified across 8 voices):

| Voice   | Gender/Tone       | Characters                           |
| ------- | ----------------- | ------------------------------------ |
| echo    | M, warm           | manzoni, cicerone, cassese, socrate  |
| alloy   | N, balanced       | shakespeare, smith, darwin, euclide  |
| marin   | M, professional   | galileo, humboldt, goethe, cervantes |
| cedar   | M, conversational | feynman, alex-pina, moliere, erodoto |
| ash     | M, expressive     | chris, mascetti, ippocrate, mozart   |
| shimmer | F, energetic      | curie, lovelace                      |
| coral   | F, warm           | levi-montalcini                      |
| verse   | M, narrative      | omero, leonardo                      |

**Files**: 26 maestri definition files in `src/data/maestri/`

---

### V-15 🟢 P3 — Accessibility Voice Override

**Source**: Voice26 §9, Decision 2

Add voice preference field to DSA profiles. Users can override character voice in accessibility settings.

**Files**: `accessibility-store`, `session-config.ts`, settings UI

---

### CONNECTION TIMELINE (CURRENT vs OPTIMIZED)

```
CURRENT (Preview): ~3.0-3.5s desktop, ~4-6s mobile
├── getUserMedia + token (parallel)      ~400ms
├── STUN + ICE gathering wait            ~300ms  ← V-06 removes
├── GET /api/realtime/token              ~200ms  ← V-07 removes
├── POST regional SDP                    ~300ms
├── Sequential memory + context          ~400ms  ← V-08 parallelizes
├── session.update round-trip            ~300ms  ← V-04 eliminates
├── 300ms greeting delay                 ~300ms  ← removed
└── Maestro starts speaking              ~200ms

OPTIMIZED (GA + ring): ~1.0-1.2s desktop, ~1.5-2.5s mobile
├── RING STARTS immediately                      ← V-11
├── getUserMedia + token + memory + context (ALL PARALLEL) ~400ms
├── createOffer (no ICE wait)            ~30ms
├── POST resource SDP                    ~260ms
├── connection ready → RING STOPS
└── Maestro starts speaking              ~250ms

SAVINGS: ~1350-2200ms + 100% perceived wait masked by ring
```

---

### GA NEW FEATURES (For Future Consideration)

**Source**: Voice Architecture Audit §1.6-1.9

These features are available in GA but NOT needed for migration. Evaluate post-migration.

#### WebRTC Filter (`?webrtcfilter=on`)

Limits data channel messages to the browser, keeping prompt instructions private. **Decision**: Do NOT enable — MirrorBuddy sends tool calls via data channel. Only enable if tool handling moves server-side.

#### WebSocket Observer (Server-Side Sideband)

Server can connect via WebSocket to observe/control a WebRTC call using the call ID from SDP response. **Potential uses**: Session recording for compliance, real-time monitoring, server-side tool execution. Requires privacy review before enabling.

#### OpenAI-Beta Header

GA: Do NOT include `OpenAI-Beta:` header. Current code does not appear to send it — verify during V-03.

#### SDK Requirements

GA requires `openai-node` TypeScript SDK (not Azure-specific). Microsoft Preview SDKs do NOT support GA. Verify during V-03.

---

<a id="area-2"></a>

## AREA 2 — UI UNIFICATION

### U-01 🔴 P0 — Three Separate Chat View Components

**Source**: DUPLICATION-ANALYSIS A1

Three implementations of the same chat experience:

| Component                | For               | File                                   | Lines | TTS | Voice | Handoff |
| ------------------------ | ----------------- | -------------------------------------- | ----- | --- | ----- | ------- |
| `MaestroSession`         | 26 Maestri        | `maestros/maestro-session.tsx`         | 271   | ✅  | ✅    | ❌      |
| `CharacterChatView`      | 6 Coach + 6 Buddy | `conversation/character-chat-view.tsx` | 216   | ❌  | ✅    | ✅      |
| `materiali-conversation` | Education         | `education/materiali-conversation/`    | 633   | ❌  | ❌    | ❌      |

Features added to one never reach the others. `maestro-session.tsx` comments say "Unified conversation layout matching Coach/Buddy pattern" — the intent existed, unification was never completed.

**Fix**: Create `<UnifiedChatView characterType={type}>` with data-driven variations.

**Impact**: Feature parity (TTS, voice, handoff) across all character types.
**Effort**: 3-5 days

---

### U-02 🔴 P0 — Three Message Bubble Components

**Source**: DUPLICATION-ANALYSIS A2

| Bubble      | File                                                             | Lines | TTS | Voice Badge |
| ----------- | ---------------------------------------------------------------- | ----- | --- | ----------- |
| Maestro     | `maestros/message-bubble.tsx`                                    | 84    | ✅  | ✅          |
| Coach/Buddy | `conversation/components/message-bubble.tsx`                     | 74    | ❌  | ❌          |
| Education   | `education/materiali-conversation/components/message-bubble.tsx` | 103   | ❌  | ❌          |

A user with Leonardo gets TTS on messages, switches to Coach Melissa → TTS disappears. Same platform, inconsistent experience.

**Fix**: Single `<MessageBubble>` with optional props `ttsEnabled`, `showVoiceBadge`, `showAttachments`.

---

### U-03 🟠 P1 — Handoff Absent from MaestroSession

**Source**: DUPLICATION-ANALYSIS A5

`grep -rn "handoff\|Handoff" src/components/maestros/` → **ZERO results**. The handoff system (suggesting a coach/buddy transition) exists ONLY in `conversation-flow.tsx`. If a student in session with Leonardo needs emotional support, the system cannot suggest a buddy.

**Fix**: Integrate handoff in MaestroSession or resolve via U-01 unification.
**Depends on**: U-01 (if unified) or standalone

---

### U-04 🟠 P1 — Three Character Card Components

**Source**: DUPLICATION-ANALYSIS A3

| Component             | File                                                         |
| --------------------- | ------------------------------------------------------------ |
| `MaestroCard`         | `maestros/maestro-card.tsx`                                  |
| `CharacterCard`       | `conversation/components/character-card.tsx`                 |
| `CharacterCard` (edu) | `education/character-switcher/components/character-card.tsx` |

Three different designs for showing a character. Style updates don't propagate. Accessibility inconsistencies possible.

---

### U-05 🟠 P1 — Voice Feature Parity Across Character Types

**Source**: DUPLICATION-ANALYSIS A4

Backend: ALL characters have `voice` and `voiceInstructions` fields. Frontend: Maestri have `CharacterVoicePanel` as sibling component; Coach/Buddy have voice call button but different UI. Voice is configured for all in data, but frontend handles it differently per type.

**Depends on**: U-01

---

### U-06 🟡 P2 — 220+ Inline Spinner/Loading Implementations

**Source**: DUPLICATION-ANALYSIS B1

220 references to `Loader2` + 29 custom `animate-spin` divs. No shared `<Spinner>` component.

**Fix**: Create `src/components/ui/spinner.tsx` with `size` prop (`sm|md|lg`). Gradual migration.

---

### U-07 🟡 P2 — Header Variants Only for Maestri

**Source**: DUPLICATION-ANALYSIS A6

`maestros/header-variants/` has 5 header variants (A-E). Coach/Buddy have a single header. Possible forgotten A/B test or design inconsistency.

**Fix**: Evaluate which variant is active. If only one is used, remove the rest. If A/B testing, document it.

---

### U-08 🟢 P3 — Dialog/Modal Inconsistency

**Source**: DUPLICATION-ANALYSIS B2

One file (`tos-acceptance-modal.tsx`) imports directly from `@radix-ui/react-dialog` instead of the project wrapper `@/components/ui/dialog`. Low risk but inconsistent.

---

<a id="area-3"></a>

## AREA 3 — i18n & LOCALIZATION

### I-01 🔴 P0 — `voice` Namespace Not Loaded (8 Components Broken)

**Source**: DUPLICATION-ANALYSIS C3

`src/i18n/request.ts` NAMESPACES array has 17 entries. `messages/it/` has 23 files. The `voice` namespace is NOT in NAMESPACES, but **8 components** call `useTranslations('voice')` → next-intl returns empty keys → UI shows raw keys or blank strings.

Similarly, `analytics` namespace used by 2 components is not loaded.

**Fix**: Add `'voice'` and `'analytics'` to NAMESPACES in `src/i18n/request.ts`.

**Effort**: 5 minutes. **Impact**: Fixes broken voice UI text.

---

### I-02 🔴 P0 — Two i18n Config Files With Different Locale Orders

**Source**: DUPLICATION-ANALYSIS C1

| File                    | Locales                          | localeFlags |
| ----------------------- | -------------------------------- | ----------- |
| `src/i18n/config.ts`    | `["it", "en", "fr", "de", "es"]` | ✅ Present  |
| `i18n/config.ts` (root) | `["it", "en", "es", "fr", "de"]` | ❌ Absent   |

The root file is NOT imported by any source file (dead code). But could cause confusion.

**Fix**: Delete `i18n/config.ts` (root). 1 minute.
**Alias**: D-05 (same action, tracked in Wave 0)

---

### I-03 🟠 P1 — Aggregated i18n Messages Out of Sync

**Source**: DUPLICATION-ANALYSIS C2

`src/i18n/messages/` contains 5 aggregated JSON files (~585KB it.json) not imported by runtime. They have 20 namespaces not in `messages/` and are missing 9 that exist in `messages/`. Confuses dev tooling and translators.

**Fix**: Delete `src/i18n/messages/` directory. Or regenerate from `messages/` with a build script.
**Alias**: D-06 (same action, tracked in Wave 0)

---

### I-04 🟠 P1 — Hardcoded Italian Strings in Code

**Source**: DUPLICATION-ANALYSIS C4

Found in:

- `export-helpers.ts` — tool type labels ("Mappa Mentale", "Riassunto")
- `scheduler/formatting.ts` — day names ("Lunedì", "Martedì"...)
- `settings-page-mobile.tsx` — "Salva modifiche"
- `voice-call-panel.tsx` — "Errore di connessione vocale"
- `enterprise-form.tsx` — "Errore durante l'invio"
- `tool-canvas.tsx` — "Errore"
- `StudyKitUpload.tsx` — "Errore durante la generazione"

**Impact**: Non-Italian users see Italian strings for these labels/errors.

**Fix**: Systematic audit + migration to i18n keys. Priority: tool type labels (exported content users download).

---

### I-05 🟡 P2 — Unused i18n Namespace Files

**Source**: DUPLICATION-ANALYSIS C3

4 namespace files exist on disk with 0 code references: `session.json`, `onboarding.json`, `email.json`, `research.json`.

**Fix**: Delete or add to NAMESPACES if planned features need them.
**Alias**: D-08 (same action, tracked in Wave 0)

---

<a id="area-4"></a>

## AREA 4 — STATE MANAGEMENT

### S-01 🔴 P0 — Two Overlapping Conversation Stores

**Source**: DUPLICATION-ANALYSIS F1

| Store                      | File                               | Consumers |
| -------------------------- | ---------------------------------- | --------- |
| `useConversationStore`     | `conversation-store.ts`            | 8 files   |
| `useConversationFlowStore` | `conversation-flow-store/store.ts` | 10 files  |

Both manage conversations and messages. `use-character-chat/index.ts` imports `useConversationStore` for persistence; `conversation-flow.tsx` uses `useConversationFlowStore` for flow. Both write messages → they can diverge.

**Fix**: Merge into `useConversationFlowStore` as primary store, adding persistence capabilities.
**Effort**: 2-3 days

---

### S-02 🔴 P0 — Four Consent Systems (GDPR Risk)

**Source**: DUPLICATION-ANALYSIS F2

| System          | Key                           | File                         |
| --------------- | ----------------------------- | ---------------------------- |
| Unified Consent | `mirrorbuddy-unified-consent` | `unified-consent-storage.ts` |
| Cookie Consent  | `mirrorbuddy-consent`         | `consent-storage.ts`         |
| Trial Consent   | via variable                  | `trial-consent.ts`           |
| Zustand Store   | in-memory                     | `consent-store.ts`           |

All in `src/lib/consent/`. `unified-consent-storage.ts` migrates from `mirrorbuddy-consent`, but `consent-storage.ts` still exists and is used. **If a user revokes consent in one system, the other 3 don't know.**

**Fix**: Consolidate into single Zustand store with server sync.
**Effort**: 1 day
**Risk**: GDPR non-compliance if left unfixed.

---

### S-03 🟠 P1 — 23+ Direct localStorage Calls (Policy Violation)

**Source**: DUPLICATION-ANALYSIS F3

Project policy: "NO localStorage for user data — Zustand + REST only."

Violations found:

- `use-permissions.ts` — user permissions cached
- `transport-cache.ts` — connection probe results
- `email-capture-prompt.tsx` — session ID + dismissal
- `ios-install-banner.tsx` — banner dismissal timestamp

**Fix**: Migrate to Zustand stores or server-side storage. Consent-related localStorage is legitimate.

---

### S-04 🟠 P1 — API Calls Without Deduplication/Caching

**Source**: DUPLICATION-ANALYSIS F4

| Endpoint               | Distinct Callers                              |
| ---------------------- | --------------------------------------------- |
| `/api/realtime/token`  | 12 files                                      |
| `/api/user/usage`      | 8 files                                       |
| `/api/azure/costs`     | 3+ files (2 parallel calls in same component) |
| `/api/provider/status` | 3+ files                                      |

N identical requests to server, possible inconsistent responses, UI flickering.

**Fix**: Shared hooks with dedup (React Query, SWR, or custom `useCachedFetch`).
**Effort**: 2-3 days

---

### S-05 🟡 P2 — Duplicate Auto-Save Wrappers

**Source**: DUPLICATION-ANALYSIS B3

| File                                               | Lines |
| -------------------------------------------------- | ----- |
| `tools/auto-save-wrappers.tsx`                     | 282   |
| `tools/tool-result-display/auto-save-wrappers.tsx` | 300   |

Different files (not symlinks). The second has more features (debounce, retry).

**Fix**: Eliminate the first, use only `tool-result-display/auto-save-wrappers.tsx`.

---

<a id="area-5"></a>

## AREA 5 — API ROUTES & SERVICES

### A-01 🔴 P0 — Four `calculateLevel()` With Different Algorithms

**Source**: DUPLICATION-ANALYSIS D1

| File                          | Algorithm                                             |
| ----------------------------- | ----------------------------------------------------- |
| `utils.ts:22`                 | Thresholds array [0,100,250,500,1000,...64000]        |
| `gamification-helpers.ts:18`  | `Math.floor(points / 1000) + 1`, max 100              |
| `xp-rewards.ts:139`           | XP_PER_LEVEL array lookup (reverse)                   |
| `method-progress-utils.ts:19` | Returns `'novice'\|'learning'\|'competent'\|'expert'` |

**Impact**: XP=500 → `utils.ts` says level 4, `gamification-helpers.ts` says level 1. Inconsistent levels across UI.

**Fix**: Consolidate into `src/lib/gamification/level-calculator.ts` with explicit functions: `calculateXPLevel()`, `calculateGamificationLevel()`, `calculateSkillLevel()`.

---

### A-02 🟠 P1 — 25 Routes With Manual Auth vs 383 With pipe()

**Source**: DUPLICATION-ANALYSIS E1

25 routes use `validateAuth()` directly in handler body instead of `withAuth` in pipe chain. Some have technical reasons (SSE/streaming), but `user/route.ts`, `onboarding/handlers.ts`, `scheduler/helpers.ts` do NOT.

**Risk**: Manual routes can forget Sentry wrapping, CSRF check, rate limiting.

**Fix**: Migrate non-streaming routes to `pipe()`. For streaming, create `withAuthStreaming` middleware.

---

### A-03 🟠 P1 — Three `sanitizeFilename()` Identical Functions

**Source**: DUPLICATION-ANALYSIS D3

Same `replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)` in:

- `export-helpers.ts:16`
- `accessible-print/helpers.ts:14`
- `mindmap-export/helpers.ts:8`

**Fix**: Single export from `src/lib/utils.ts` or `src/lib/sanitize.ts`.

---

### A-04 🟠 P1 — Three `formatDate()` + Two `formatTime()` Variants

**Source**: DUPLICATION-ANALYSIS D2

Different date/time formatting across `utils.ts`, `scheduler/formatting.ts`, `export-helpers.ts`. Similar but not identical output.

**Fix**: `src/lib/formatting/dates.ts` with explicit named variants.

---

### A-05 🟡 P2 — CORS Missing X-CSRF-Token

**Source**: Voice26 P6

`cors-config.ts:62` allows only `Content-Type, Authorization`. `csrfFetch` sends `X-CSRF-Token` → browser blocks preflight for cross-origin requests.

**Impact**: Console error on telemetry. Data loss for www vs non-www.

**Fix**: One line — add `X-CSRF-Token, x-csrf-token` to allowed headers.

---

### A-06 🟡 P2 — Ownership Check Duplicated in 4 Conversation Routes

**Source**: DUPLICATION-ANALYSIS E3

Same `prisma.conversation.findFirst({ where: { id, userId } })` + 404 pattern in 4+ routes.

**Fix**: `requireConversationOwnership()` utility or `withConversation(id)` middleware.

---

### A-07 🟡 P2 — Non-Standardized API Error Response Format

**Source**: DUPLICATION-ANALYSIS E4

```json
{ "error": "Forbidden" }                    // 12 routes
{ "error": "msg", "details": "..." }        // some routes
{ "error": "msg", "required": [...] }       // materials POST
{ "error": "msg", "validation": [...] }     // other routes
```

No `ApiErrorResponse` type. Clients must handle multiple formats.

**Fix**: Define `ApiErrorResponse` type + utility `apiError(status, message, details?)`.

---

### A-08 🟢 P3 — Rate Limit Sync vs Async Inconsistency

**Source**: DUPLICATION-ANALYSIS E2

`checkRateLimit()` (sync, in-memory) and `checkRateLimitAsync()` used without clear criteria.

---

### A-09 🟢 P3 — Admin Redirect Drops Query Params

**Source**: Voice26 P7

`proxy.ts:303` constructs redirect URL without preserving `?_rsc=...` query params. Next.js RSC prefetch fails with 404.

**Fix**: `adminUrl.search = new URL(request.url).search;`

---

<a id="area-6"></a>

## AREA 6 — DEAD CODE & CLEANUP

### D-01 🟡 P2 — WebSocket Proxy (Entire Directory)

**Source**: Voice Architecture Audit §6.4

`src/server/realtime-proxy/` — deprecated WebSocket proxy, replaced by WebRTC. Remove entire directory.

---

### D-02 🟡 P2 — Transport Probe/Selector/Switcher/Cache

**Source**: Voice Architecture Audit §6.4

No WebSocket fallback in GA. Remove:

- `transport-probe.ts`
- `transport-selector.ts`
- `transport-switcher.ts`
- `transport-cache.ts`

---

### D-03 🟡 P2 — Audio Playback Queue (Dead Code in WebRTC)

**Source**: Voice Architecture Audit §6.4

WebRTC audio goes via `ontrack` → `<Audio>` element. The entire queue/scheduler system is unused:

- `audio-playback.ts`
- `audio-playback-types.ts`
- `ring-buffer.ts`
- `audio-polling-helpers.ts` — **verify**: may still be used for input level metering. Keep if used, remove if only referenced by playback.

---

### D-04 🟢 P3 — Token Cache Dead Code

**Source**: Voice26 P5

`token-cache.ts` exports `useTokenCache()` but is never imported. Either integrate it (V-03 GA migration) or remove.

---

### D-05 — `i18n/config.ts` (Root, Dead Code)

**Alias of I-02**. Tracked in Wave 0.

---

### D-06 — `src/i18n/messages/` (Aggregated, Dead Code)

**Alias of I-03**. Tracked in Wave 0.

---

### D-07 🟢 P3 — `typing-data-types.ts` (Duplicate, Not Imported)

**Source**: DUPLICATION-ANALYSIS D4

`src/types/tools/typing-data-types.ts` contains types identical to `tool-data-types-educational.ts`. Zero imports found.

---

### D-08 — Unused i18n Namespace Files

**Alias of I-05**. Tracked in Wave 0.

---

### D-09 🟢 P3 — PCM16 Config (Harmless Dead Config)

**Source**: Voice Architecture Audit §2.5

`session.update` sets `pcm16` format, but WebRTC audio uses media tracks (Opus). The config has no effect. Remove for clarity.

---

### D-10 🟢 P3 — 13 Error Classes Without Shared Base

**Source**: DUPLICATION-ANALYSIS D5

13 custom Error classes with no hierarchy. OIDC has a good sub-hierarchy; others are independent. Low priority — document rather than refactor.

---

<a id="design-notes"></a>

## DESIGN NOTES (Correct by Design — Document, Don't Fix)

**Source**: DUPLICATION-ANALYSIS A7, A8

These are architectural decisions that look like inconsistencies but are intentional. They need documentation, not code changes.

### System Prompt: Static vs Dynamic

| Type    | System Prompt                            | Source                              |
| ------- | ---------------------------------------- | ----------------------------------- |
| Maestri | **Static** (hardcoded)                   | `src/data/maestri/{id}.ts`          |
| Coach   | **Static**                               | `src/data/support-teachers/{id}.ts` |
| Buddy   | **Dynamic** (`getSystemPrompt(student)`) | `src/data/buddy-profiles/{id}.ts`   |

Routing in `src/lib/ai/character-router/convenience.ts:77-102` via single switch. This is **correct by design** (buddies adapt to the student), but should be documented for developers who might expect uniform behavior.

### Knowledge Base: Only for Maestri

Only maestri have `*-knowledge.ts` files indexed in RAG with tag `maestro:{id}`. Coach and Buddy rely solely on system prompts. This is **consistent with design**: coach = pedagogical method, buddy = emotional support. However, a coach cannot answer subject-specific questions even if the student asks.

**Action**: Document both decisions in an ADR or in the developer guide.

---

<a id="risk-assessment"></a>

## RISK ASSESSMENT (Consolidated)

**Source**: Voice Architecture Audit §9, Voice26 §7

| Risk                                       | Severity     | Affects | Mitigation                                                       |
| ------------------------------------------ | ------------ | ------- | ---------------------------------------------------------------- |
| Preview API deprecated (30 Apr 2026)       | **CRITICAL** | Wave 4  | Start migration now, 2.5 months runway                           |
| Large instructions may slow first response | HIGH         | V-02    | Monitor via Sentry; fall back to truncation if >3s               |
| Transcript safety has ~1-2s delay          | HIGH         | V-01    | Level 1 (instructions) prevents 95%; Level 2 is audit + redirect |
| GA model behavior differs from preview     | MEDIUM       | Wave 4  | Test all 26 maestri with GA models                               |
| CSP change breaks production               | MEDIUM       | V-12    | Support both domains during transition period                    |
| `injectSafetyGuardrails` has server deps   | MEDIUM       | V-01    | Use `SAFETY_CORE_PROMPT` constant (pure text, no Prisma)         |
| Greeting language detection wrong          | LOW          | V-09    | Use `useLocale()` hook → same as rest of UI                      |
| Ring tone UX feels unprofessional          | LOW          | V-11    | A/B test with users, make configurable                           |
| Token cache stale                          | LOW          | D-04    | 30s refresh buffer already in token-cache.ts                     |
| WebSocket observer data leak               | LOW          | Future  | Don't enable until privacy review                                |
| Session config in token = larger request   | LOW          | V-04    | ~2KB extra, negligible                                           |

---

<a id="adr-0038-v2"></a>

## ADR 0038-v2 (Proposed — GA Protocol Migration)

**Source**: Voice Architecture Audit §8

A full ADR 0038-v2 document was drafted in the Voice Architecture Audit. It should be created as `docs/adr/0038-v2-ga-protocol-migration.md` during Wave 4 (GA migration). Key decisions:

1. Migrate all endpoints from Preview to GA protocol
2. Session configuration moves into `client_secrets` request
3. Simplified WebRTC (no ICE servers, no regional endpoint)
4. Event names updated to GA format
5. WebSocket fallback removed entirely
6. Phone ring UX masks connection latency
7. CSP simplified (remove preview domain)

**Related ADRs**: 0038 (original, superseded), 0069 (Adaptive VAD), 0122 (Realtime Video Vision), 0050 (Voice Cost Guards)

---

<a id="dependency-graph"></a>

## DEPENDENCY GRAPH

> **Wave 1→Wave 4 is recommended sequencing**, not a hard dependency. V-01/V-02 (what goes into voice instructions) should ideally be done before V-04 (which embeds instructions in `client_secrets`), but V-03/V-05/V-06/V-07 can proceed independently.
>
> **Waves 1, 2, 3 can run in parallel** after Wave 0 since they touch different areas.

```
                    ┌─────────────────────────────────────────────────┐
                    │           WAVE 0 — Quick Wins (< 1 day)         │
                    │  I-01, I-02, I-03, I-05, D-07, A-05, A-09, A-03│
                    └─────────────────┬───────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌─────────────────────┐ ┌────────────────────┐  ┌──────────────────┐
   │ WAVE 1 — Voice       │ │ WAVE 2 — State &   │  │ WAVE 3 — UI      │
   │ Safety + Personality  │ │ Consent            │  │ Unification      │
   │ (3-4 days)           │ │ (3-4 days)         │  │ (5-8 days)       │
   │                      │ │                    │  │                  │
   │ V-01 (safety)        │ │ S-02 (consent)     │  │ U-02 (bubble)    │
   │ V-02 (full prompt)   │ │ S-01 (stores)      │  │ U-04 (cards)     │
   │ V-09 (greetings)     │ │ S-03 (localStorage) │  │ U-06 (spinner)   │
   │ V-10 (formality)     │ │ A-01 (levels)      │  │ U-01 (chat view) │
   │  V-10 depends: V-09  │ │ A-04 (dates)       │  │ U-03 (handoff)   │
   └──────────┬───────────┘ └────────┬───────────┘  │ U-05 (voice UX)  │
              │ recommended          │               └────────┬─────────┘
              ▼                      │                        │
   ┌─────────────────────┐          │                        │
   │ WAVE 4 — GA Protocol │          │                        │
   │ Migration (5-7 days) │          │                        │
   │                      │          │                        │
   │ V-03 (endpoints)     │          │                        │
   │ V-04 (client_secrets)│          │                        │
   │ V-05 (event names)   │          │                        │
   │ V-06 (ICE removal)   │          │                        │
   │ V-07 (double fetch)  │          │                        │
   │ V-08 (parallel fetch)│          │                        │
   │ V-12 (CSP cleanup)   │          │                        │
   └──────────┬───────────┘          │                        │
              │                      │                        │
              ▼                      ▼                        ▼
   ┌──────────────────────────────────────────────────────────────┐
   │              WAVE 5 — Polish & Performance (3-5 days)        │
   │                                                              │
   │  V-11 (phone ring)       S-04 (API dedup)     I-04 (i18n)  │
   │  V-13 (tier models)      A-02 (pipe migration) A-08 (rate) │
   │  S-05 (auto-save)        A-06 (ownership util)              │
   │                           A-07 (error format)               │
   └──────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │              WAVE 6 — Dead Code & Polish (1-2 days)          │
   │                                                              │
   │  D-01 (WS proxy)    D-02 (transport files)  D-03 (audio)   │
   │  D-04 (token cache)  D-09 (pcm16)           D-10 (errors)  │
   │  V-14 (voice rebalance)  V-15 (a11y voice)                 │
   │  U-07 (header variants)  U-08 (dialog)                     │
   │   depends: Wave 4 complete (GA dead code safe to remove)    │
   └──────────────────────────────────────────────────────────────┘
```

**Critical path (GA deadline)**: Wave 0 (1d) → Wave 1 (4d) → Wave 4 (7d) = **~12 days**.
With 2.5 months runway, this is comfortable. Waves 2+3 run in parallel.

---

<a id="execution-waves"></a>

## EXECUTION WAVES — DETAILED

### WAVE 0 — Quick Wins (< 1 day)

| ID   | Action                                                               | Effort | Files                  |
| ---- | -------------------------------------------------------------------- | ------ | ---------------------- |
| I-01 | Add `'voice'`, `'analytics'` to NAMESPACES                           | 5 min  | `src/i18n/request.ts`  |
| I-02 | Delete root `i18n/config.ts` (dead code)                             | 1 min  | `i18n/config.ts`       |
| I-03 | Delete `src/i18n/messages/` (stale aggregated, not imported)         | 1 min  | 5 files                |
| I-05 | Delete unused namespace files (session, onboarding, email, research) | 2 min  | 20 files (4×5 locales) |
| D-07 | Delete `src/types/tools/typing-data-types.ts` (dead code)            | 1 min  | 1 file                 |
| A-05 | Add `X-CSRF-Token` to CORS allowed headers                           | 1 min  | `cors-config.ts`       |
| A-09 | Preserve query params in admin redirect                              | 2 min  | `proxy.ts`             |
| A-03 | Consolidate 3× `sanitizeFilename()`                                  | 10 min | 3 files                |

---

### WAVE 1 — Voice Safety + Personality (3-4 days)

| ID   | Action                                            | Files                                                      |
| ---- | ------------------------------------------------- | ---------------------------------------------------------- |
| V-01 | Inject safety guardrails in voice instructions    | `session-config.ts`                                        |
| V-01 | Add transcript safety net (Level 2)               | `event-handlers.ts`                                        |
| V-02 | Remove 2000 char limit, send full systemPrompt    | `voice-prompt-builder.ts`                                  |
| V-09 | Thread locale through greeting flow               | `character-slice.ts`, `helpers.ts`, `session-slice.ts`     |
| V-10 | Formal greetings (automatic via V-09 getGreeting) | All 26 maestri files (verify)                              |
| —    | Tests                                             | `voice-prompt-builder.test.ts`, new `voice-safety.test.ts` |

---

### WAVE 2 — State & Consent (3-4 days)

| ID   | Action                                                  | Files                                               |
| ---- | ------------------------------------------------------- | --------------------------------------------------- |
| S-02 | Consolidate 4 consent systems into single Zustand store | `src/lib/consent/` (4 files → 1)                    |
| S-01 | Merge conversation stores                               | `conversation-store.ts`, `conversation-flow-store/` |
| S-03 | Migrate localStorage violations to Zustand              | 4+ files                                            |
| A-01 | Consolidate 4× calculateLevel()                         | 4 files → 1 `level-calculator.ts`                   |
| A-04 | Unify formatDate/formatTime                             | 3 files → 1 `formatting/dates.ts`                   |

---

### WAVE 3 — UI Unification (5-8 days)

| ID   | Action                                                          | Files                                                 | Effort |
| ---- | --------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| U-02 | Unified `<MessageBubble>` with TTS/voice badge/attachment props | 3 files → 1                                           | 1d     |
| U-04 | Unified `<CharacterCard>`                                       | 3 files → 1                                           | 1d     |
| U-06 | Create `<Spinner size>` component + gradual migration           | New file + ~100 files                                 | 0.5d   |
| U-01 | Unified `<UnifiedChatView characterType={type}>`                | `maestro-session.tsx` + `character-chat-view.tsx` → 1 | 3-5d   |
| U-03 | Handoff in unified chat view                                    | Integrated with U-01                                  | —      |
| U-05 | Voice feature parity across types                               | Integrated with U-01                                  | —      |

> **Note**: U-02 and U-04 should be done BEFORE U-01, since U-01 will reference the unified bubble and card components.

---

### WAVE 4 — GA Protocol Migration (5-7 days)

| ID   | Action                                   | Files                                           |
| ---- | ---------------------------------------- | ----------------------------------------------- |
| V-03 | Update endpoints to GA URLs              | `ephemeral-token/route.ts`, `token/route.ts`    |
| V-04 | Session config in client_secrets request | `ephemeral-token/route.ts`, `session-config.ts` |
| V-05 | Update event names for GA                | `event-handlers.ts`                             |
| V-06 | Remove ICE servers + gathering wait      | `webrtc-connection.ts`, `webrtc-types.ts`       |
| V-07 | Remove double fetch in SDP exchange      | `webrtc-connection.ts`                          |
| V-08 | Parallelize memory + adaptive context    | `session-config.ts`, `connection.ts`            |
| V-12 | Remove preview domain from CSP           | `proxy.ts`                                      |

---

### WAVE 5 — Polish & Performance (3-5 days)

| ID   | Action                                          |
| ---- | ----------------------------------------------- |
| V-11 | Phone ring UX pattern                           |
| V-13 | Voice model tier-based selection                |
| S-04 | API call deduplication (SWR/React Query/custom) |
| A-02 | Migrate non-streaming routes to pipe()          |
| I-04 | Systematic hardcoded Italian strings audit      |
| S-05 | Consolidate auto-save wrappers                  |
| A-06 | `requireConversationOwnership()` utility        |
| A-07 | Standardized `ApiErrorResponse` type            |
| A-08 | Standardize rate limit approach (sync vs async) |

---

### WAVE 6 — Dead Code & Polish (1-2 days)

| ID   | Action                                                                          |
| ---- | ------------------------------------------------------------------------------- |
| D-01 | Remove `src/server/realtime-proxy/` directory                                   |
| D-02 | Remove transport-probe/selector/switcher/cache                                  |
| D-03 | Remove audio-playback/types/ring-buffer (verify audio-polling-helpers.ts first) |
| D-04 | Remove or integrate token-cache                                                 |
| D-09 | Remove PCM16 config from session.update                                         |
| D-10 | Document error class hierarchy (no code change)                                 |
| V-14 | Voice assignment rebalancing (26 maestri files)                                 |
| V-15 | Accessibility voice override (a11y store + settings UI)                         |
| U-07 | Header variants cleanup (evaluate active variant, remove rest)                  |
| U-08 | TOS modal — migrate to `@/components/ui/dialog` wrapper                         |

> **Note**: D-01, D-02, D-03 depend on Wave 4 (GA migration) being complete — transport/proxy dead code is only safe to remove after the new protocol is working.
> S-03 (localStorage migration) in Wave 2 should coordinate with D-02 regarding `transport-cache.ts`.

---

<a id="fix-code-reference"></a>

## FIX CODE REFERENCE

Concrete before/after code for the most complex fixes. Provided as guidance for implementation.

**Source**: Voice26 §4

### V-01 Fix: Safety in Voice Instructions

```typescript
// session-config.ts — BEFORE (broken):
const voicePrompt = buildVoicePrompt(maestro); // only 2000 chars, no safety

const fullInstructions =
  languageInstruction +
  characterInstruction +
  memoryContext +
  adaptiveInstruction +
  voicePrompt + // amputated personality
  voicePersonality +
  TOOL_USAGE_INSTRUCTIONS;

// AFTER (fixed):
// Import pure text constant (no server deps — safe for 'use client')
import { SAFETY_CORE_PROMPT } from '@/lib/safety/safety-prompts-core';

const safePrompt = SAFETY_CORE_PROMPT + '\n\n' + maestro.systemPrompt;

const fullInstructions =
  languageInstruction +
  characterInstruction +
  safePrompt + // FULL personality + safety
  memoryContext +
  adaptiveInstruction +
  voicePersonality +
  TOOL_USAGE_INSTRUCTIONS;
```

**Note**: `injectSafetyGuardrails` has server dependencies (Prisma). Since `session-config.ts` is `'use client'`, we import `SAFETY_CORE_PROMPT` (pure text constant) directly instead.

### V-01 Fix: Transcript Safety Net (Level 2)

```typescript
// event-handlers.ts — On USER transcript:
case 'conversation.item.input_audio_transcription.completed':
  if (event.transcript) {
    deps.addTranscript('user', event.transcript);
    // Safety check on user speech
    const filterResult = filterInput(event.transcript);
    if (filterResult.action === 'block') {
      deps.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
      deps.dataChannel.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user',
          content: [{ type: 'input_text', text: filterResult.safeResponse }] }
      }));
      deps.dataChannel.send(JSON.stringify({ type: 'response.create' }));
    }
  }

// On AI transcript:
case 'response.audio_transcript.done':
  if (event.transcript) {
    deps.addTranscript('assistant', event.transcript);
    // Post-hoc safety check
    const biasResult = detectBias(event.transcript);
    if (!biasResult.safeForEducation) logSafetyEvent('bias_in_voice', { ... });
    if (containsCrisisKeywords(event.transcript)) logCrisisDetected({ ... });
  }
```

### V-09 Fix: Multilingual Greetings

```typescript
// helpers.ts — BEFORE:
greeting = coach.greeting; // always Italian

// AFTER:
greeting = coach.getGreeting ? coach.getGreeting({ language }) : coach.greeting; // fallback only
```

---

<a id="acceptance-criteria"></a>

## ACCEPTANCE CRITERIA (END STATE)

### Voice System

- [ ] Voice characters speak with their actual personality (not generic AI)
- [ ] Voice has safety guardrails matching chat level (3-layer net)
- [ ] Greetings appear in user's selected language (5 locales)
- [ ] Formal professors use Lei/Sie/Vous in greetings
- [ ] GA protocol endpoints active, preview code removed
- [ ] Connection latency ≤1.5s desktop, ≤2.5s mobile
- [ ] Phone ring UX masks 100% of connection wait time
- [ ] Voice model selection follows tier system

### UI

- [ ] Single unified chat view for all 38 characters
- [ ] TTS, voice, handoff available to all character types
- [ ] Single `<MessageBubble>` component used everywhere
- [ ] Single `<CharacterCard>` component
- [ ] `<Spinner>` component replaces inline Loader2 usage

### i18n

- [ ] All namespaces in code are loaded (NAMESPACES array complete)
- [ ] No dead i18n config files or aggregated messages
- [ ] Tool type labels, day names, error messages use i18n keys

### State

- [ ] Single conversation store (source of truth)
- [ ] Single consent system (GDPR compliant)
- [ ] No user data in localStorage (policy enforced)
- [ ] API calls deduplicated via shared hooks

### API

- [ ] Single `calculateLevel()` source of truth
- [ ] Single `sanitizeFilename()` export
- [ ] Standardized error response format
- [ ] All non-streaming routes use pipe() middleware
- [ ] No CORS errors on CSRF-protected endpoints

### Cleanup

- [ ] WebSocket proxy removed
- [ ] Transport probe/selector/switcher removed
- [ ] Audio playback queue removed
- [ ] All dead type files removed
- [ ] CSP simplified (no preview domain)

---

## REFERENCES

| Document                 | Content                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| DUPLICATION-ANALYSIS.md  | 33 duplications/inconsistencies across UI, i18n, services, API, state |
| Voice Architecture Audit | GA protocol migration, connection optimizations, phone ring UX        |
| Voice26.md               | 7 voice system defects, 3-level safety net, multilingual greetings    |
| ADR 0004                 | Safety guardrails                                                     |
| ADR 0038                 | WebRTC migration (to be superseded by v2)                             |
| ADR 0064                 | Formal address for historical figures                                 |
| ADR 0069                 | Adaptive VAD                                                          |
| Azure GA Migration Guide | Updated 28 Jan 2026                                                   |
