# Plan 007 — Character Voice DeepFix Notes

Running learnings log for Plan 145 (Character-Voice-DeepFix).

## W1 — Personality & Memory (14 Feb 2026)

### Voice Prompt Builder Pattern

**Problem**: `session-config.ts` used `.slice(0, 800)` to truncate systemPrompts for voice sessions. This arbitrary truncation cut through the middle of sections, losing CHARACTER INTENSITY DIAL and Core Identity data critical for character fidelity.

**Solution**: Created `voice-prompt-builder.ts` that extracts specific sections by markdown headers:

- Character header (name, subject, specialty, style) — always included
- CHARACTER INTENSITY DIAL (ADR 0031) — priority extraction
- Core Identity (personality, catchphrases) — trimmed if needed

**Key insight**: Voice prompts benefit from _structured extraction_ over _truncation_. The intensity dial alone carries more behavioral information than 800 chars of raw systemPrompt.

### Memory Error Handling

**Problem**: `fetchConversationMemory` had a bare `catch {}` that silently swallowed all errors, making it impossible to diagnose memory loading failures in production.

**Fix**: Added `clientLogger.warn()` with maestro ID and error message. Also added logging in the session-config.ts caller. Both non-blocking (still returns null on failure).

### enableMemory Verification

**Finding**: Both `route.ts` and `stream/route.ts` default `enableMemory = true`. Chain is correct for authenticated users. No fix needed.

### voiceInstructions Coverage

**Finding**: All 38 characters (26 maestri + 6 coaches + 6 buddies) have `voiceInstructions` populated. Field is required in type definitions. No gaps found.

---

## W2 — Voice Performance & Models (14 Feb 2026)

### Persistent WebRTC Pattern

**Problem**: Switching characters tore down the entire WebRTC connection (RTCPeerConnection, audio contexts, data channel) and rebuilt from scratch. This caused a 2-3 second gap with audio glitches.

**Solution**: Added `switchCharacter()` that sends `session.update` via the existing data channel with new instructions, voice, and tools. The RTCPeerConnection stays alive, audio contexts persist, only the session config changes.

**Key insight**: Azure Realtime API's `session.update` message is designed exactly for this — it updates voice, instructions, and tools on a live session. No need for a full reconnect.

### Token Pre-fetch Pattern

**Problem**: Token fetch added ~500ms to connection time, serialized with microphone permission.

**Solution**: `useTokenCache` hook pre-fetches tokens with TTL awareness. Schedules refresh 30s before expiry. `getCachedToken()` returns instantly when cache is valid.

### Model Deprecation Audit

**Finding**: GPT-4o family officially RETIRED Feb 13-16, 2026 (today!). Code already migrated to GPT-5 family for chat models. Realtime models (`gpt-4o-realtime`) are preview — 3-6 month lifecycle. Embeddings (`text-embedding-3-small`) and `whisper-1` stable, no scheduled retirement.

**Action**: Updated `deployment-mapping.ts` comments with accurate dates. Legacy GPT-4 entries kept for backward compatibility with existing Azure deployments.

---

| Wave | Issue                                   | Root Cause                                    | Resolution                                          | Preventive Rule                                       |
| ---- | --------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| W1   | .slice(0,800) prompt truncation         | Arbitrary char limit ignores prompt structure | voice-prompt-builder.ts extracts sections by header | TF-03: ESLint rule to block .slice() on prompts       |
| W1   | Silent memory fetch errors              | Bare catch {} swallows errors                 | Added clientLogger.warn with error details          | Always log caught errors with context                 |
| W2   | Connection teardown on character switch | No session.update support                     | switch-character.ts reuses WebRTC connection        | Document in ADR: prefer session.update over reconnect |
| W2   | Token fetch latency on connect          | Serialized token request                      | token-cache.ts pre-fetches with TTL                 | Pre-fetch tokens when voice UI is visible             |
| W2   | Outdated deprecation dates in comments  | Manual tracking                               | Updated deployment-mapping.ts with Feb 2026 dates   | Monitor Azure Health Alerts quarterly                 |
