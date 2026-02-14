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

| Wave | Issue                           | Root Cause                                    | Resolution                                          | Preventive Rule                                 |
| ---- | ------------------------------- | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| W1   | .slice(0,800) prompt truncation | Arbitrary char limit ignores prompt structure | voice-prompt-builder.ts extracts sections by header | TF-03: ESLint rule to block .slice() on prompts |
| W1   | Silent memory fetch errors      | Bare catch {} swallows errors                 | Added clientLogger.warn with error details          | Always log caught errors with context           |
