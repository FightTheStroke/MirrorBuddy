# Voice26 — Audit & Fix Plan for MirrorBuddy Voice System

**Date**: 14 February 2026
**Author**: Copilot + Roberto
**Status**: Ready for review

---

## 1. Executive Summary

Full audit of MirrorBuddy's voice system revealed **7 problems**, 2 critical.
The characters sound like generic AI assistants instead of their actual personas
because the voice pipeline amputates the system prompt and omits safety
guardrails entirely. Greetings are always Italian regardless of user language.

---

## 2. Architecture Overview

```
User speaks → Browser mic → WebRTC PeerConnection → Azure Realtime API
                                                          ↓
                                                    gpt-realtime model
                                                    (instructions + VAD)
                                                          ↓
Azure Realtime API → WebRTC audio stream → Browser speaker
                   → Data channel: transcriptions, tool calls, events
```

**Key constraint**: Audio goes browser ↔ Azure directly via WebRTC.
The MirrorBuddy server is NOT in the audio path.
We CAN control: instructions (system prompt), session config, data channel events.
We CANNOT do: server-side input filtering or output sanitization on audio.

---

## 3. Findings

### 🔴 P1 — CRITICAL: No Safety Guardrails in Voice

**What**: `injectSafetyGuardrails()` is never called for voice sessions.
Chat has 5 safety layers (ADR 0004); voice has ZERO.

**Where**: `src/lib/hooks/voice-session/session-config.ts:140`

**Evidence**:

```
grep -r "injectSafetyGuardrails" src/lib/hooks/voice-session/
→ 0 results
```

**Impact**: Content blocked in chat (violence, self-harm, jailbreaks, STEM
dangerous knowledge) can pass through voice unchecked.

**Comparison**:

| Safety Layer         | Chat (text)          | Voice (realtime) |
| -------------------- | -------------------- | ---------------- |
| Safety system prompt | ✅ injected          | ❌ MISSING       |
| Input content filter | ✅ filterInput()     | ❌ IMPOSSIBLE\*  |
| Output sanitization  | ✅ sanitizeOutput()  | ❌ IMPOSSIBLE\*  |
| STEM safety          | ✅ checkSTEMSafety() | ❌ MISSING       |
| Bias detection       | ✅ detectBias()      | ❌ MISSING       |
| Crisis detection     | ✅ escalation        | ❌ MISSING       |
| Jailbreak detection  | ✅ detectJailbreak() | ❌ MISSING       |

\*Cannot filter raw audio in WebRTC peer-to-peer connection.
BUT: transcriptions ARE available via data channel (see fix proposal).

---

### 🔴 P2 — CRITICAL: Voice SystemPrompt Amputated

**What**: `buildVoicePrompt()` extracts only ~2000 chars from the full
systemPrompt (which is 5000-8000+ chars). It keeps ONLY:

- Character header (name, subject, style) ~50 chars
- CHARACTER INTENSITY DIAL ~500-800 chars
- Core Identity ~200-400 chars

It DROPS: personality details, pedagogical approach, formality rules,
communication style, values, behavioral guidelines.

**Where**: `src/lib/hooks/voice-session/voice-prompt-builder.ts:11`

```typescript
const MAX_VOICE_PROMPT_CHARS = 2000;
```

**Critical discovery**: The KNOWLEDGE BASE is NOT in the systemPrompt.
It's in separate `*-knowledge.ts` files loaded by RAG. So the
systemPrompt is 100% personality/pedagogy/safety — and we're cutting
75% of it for no reason.

**Measurements**:

| Maestro  | systemPrompt size | KB in prompt? | Usable for voice |
| -------- | ----------------- | ------------- | ---------------- |
| Cicerone | 8321 chars        | NO (58 chars) | 8263 chars       |
| Galileo  | ~8000 chars       | NO            | ~8000 chars      |
| Feynman  | ~8000 chars       | NO            | ~8000 chars      |

Azure Realtime API supports ~12k chars of instructions (verified).
There is NO technical reason for the 2000 char limit.

**Impact**: All 26 maestri, 6 coaches, 6 buddies sound like generic
AI assistants in voice mode. Their entire personality is lost.

---

### 🟠 P3 — HIGH: Greetings Always Italian

**What**: The `getGreeting(ctx)` function supports all 5 languages
(it, en, fr, de, es) but is NEVER called for maestri/coaches.
Code uses static `.greeting` field (hardcoded Italian).

**Where**:

- `src/lib/stores/conversation-flow-store/helpers.ts:44` → `coach.greeting`
- `src/lib/stores/conversation-flow-store/helpers.ts:49` → `maestro.greeting`
- `src/lib/stores/conversation-flow-store/slices/character-slice.ts:141`
  → `createActiveCharacter()` never passes language param

**Flow analysis**:

```
createActiveCharacter(character, type, profile)  ← NO language param
  → helpers.ts:31 createActiveCharacterImpl(..., language = "it")  ← defaults "it"
    → line 39: buddy.getGreeting({language})  ← buddies: OK (but always "it")
    → line 44: coach.greeting  ← coaches: static Italian, NEVER calls getGreeting
    → line 49: maestro.greeting  ← maestri: static Italian, NEVER calls getGreeting
```

**Impact**: A German user sees "Ciao! Sono Galileo..." instead of
"Guten Tag! Ich bin Galileo..."

---

### 🟠 P4 — HIGH: Formal Professors Use Informal Greetings

**What**: 16 formal professors have `greeting: "Ciao! Sono X. Come posso
aiutarti oggi?"` — using informal "tu" (aiutarti) instead of formal "Lei"
(esserLe utile). ADR 0064 requires formal address for historical figures.

**Already partially fixed**: Static greetings updated to formal Italian.
But the real fix is P3 — use `getGreeting()` which already handles
formality correctly per language.

---

### 🟡 P5 — MEDIUM: Token Cache Dead Code

**What**: `token-cache.ts` exports `useTokenCache()` with pre-fetch
and caching logic, but it's NEVER imported by any other file.

**Where**: `src/lib/hooks/voice-session/webrtc-connection.ts:120`

```typescript
const response = await csrfFetch('/api/realtime/ephemeral-token', {...});
```

Always fetches fresh. `token-cache.ts` is dead code.

**Impact**: ~200-500ms extra latency per voice connection.
Token fetch runs parallel with mic permission, so real impact
is ~200ms when mic is already granted.

---

### 🟡 P6 — MEDIUM: CORS Missing X-CSRF-Token

**What**: `cors-config.ts:62` allows only `Content-Type, Authorization`.
`csrfFetch` sends `X-CSRF-Token` → browser blocks preflight for
cross-origin requests.

**Where**: `src/lib/security/cors-config.ts:62`

**Impact**: Console error on `/api/telemetry/events`. Telemetry
data loss for cross-origin scenarios (www vs non-www).

---

### 🟢 P7 — LOW: Admin Redirect Drops Query Params

**What**: `proxy.ts:303` constructs redirect URL without preserving
`?_rsc=...` query params. Next.js RSC prefetch fails with 404.

**Where**: `src/proxy.ts:303`

```typescript
const adminUrl = new URL(pathWithoutLocale, request.url);
// Missing: adminUrl.search = new URL(request.url).search;
```

---

## 4. Fix Proposals

### Fix P1+P2: Voice Safety + Full Personality

**Approach: 3-Level Safety Net**

Voice is WebRTC (browser ↔ Azure). We cannot intercept audio.
But we CAN use the data channel for transcript-based safety.

#### Level 1 — Instructions (prevents 95% of issues)

Inject `injectSafetyGuardrails()` into the voice instructions AND
send the FULL systemPrompt (not the 2000-char amputated version).

**File**: `src/lib/hooks/voice-session/session-config.ts`

```typescript
// BEFORE (broken):
const voicePrompt = buildVoicePrompt(maestro); // only 2000 chars

const fullInstructions =
  languageInstruction +
  characterInstruction +
  memoryContext +
  adaptiveInstruction +
  voicePrompt + // amputated personality
  voicePersonality +
  TOOL_USAGE_INSTRUCTIONS;

// AFTER (fixed):
import { injectSafetyGuardrails } from '@/lib/safety';

// Full systemPrompt with safety guardrails — no truncation
const safePrompt = injectSafetyGuardrails(maestro.systemPrompt, {
  role: 'maestro',
  characterId: maestro.id,
});

const fullInstructions =
  languageInstruction +
  characterInstruction +
  safePrompt + // FULL personality + safety
  memoryContext +
  adaptiveInstruction +
  voicePersonality +
  TOOL_USAGE_INSTRUCTIONS;
```

**Why this works**: The Realtime API supports ~12k chars of instructions.
A typical systemPrompt + safety is ~9000 chars. Well within limits.

**Note**: `injectSafetyGuardrails` is a server import. Since
`session-config.ts` is `'use client'`, we need to either:
(a) Extract the safety prompt text into a shared constant, or
(b) Fetch the safety-enhanced prompt from a server endpoint, or
(c) Import only the safety prompt text (no Prisma dependency).

Option (c) is best: `safety-prompts-core.ts` exports `SAFETY_CORE_PROMPT`
which is pure text with no server deps. Use that directly.

#### Level 2 — Transcript Safety Net (catches remaining 5%)

Hook into existing transcript events in `event-handlers.ts` to
detect safety violations in real-time.

**File**: `src/lib/hooks/voice-session/event-handlers.ts`

On USER transcript (line 168-173):

```typescript
case 'conversation.item.input_audio_transcription.completed':
  if (event.transcript) {
    deps.addTranscript('user', event.transcript);

    // NEW: Safety check on user speech
    const filterResult = filterInput(event.transcript);
    if (filterResult.action === 'block') {
      // Send response.cancel + session.update with redirect message
      deps.dataChannel.send(JSON.stringify({
        type: 'response.cancel'
      }));
      deps.dataChannel.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: filterResult.safeResponse }]
        }
      }));
      deps.dataChannel.send(JSON.stringify({ type: 'response.create' }));
    }
  }
```

On AI transcript (line 199-206):

```typescript
case 'response.audio_transcript.done':
  if (event.transcript) {
    deps.addTranscript('assistant', event.transcript);

    // NEW: Post-hoc safety check on AI response
    const biasResult = detectBias(event.transcript);
    if (!biasResult.safeForEducation) {
      logSafetyEvent('bias_in_voice', { ... });
    }
    if (containsCrisisKeywords(event.transcript)) {
      logCrisisDetected({ ... });
    }
  }
```

**Limitation**: This reacts AFTER the audio plays (~1-2 seconds delay).
It cannot prevent the audio from being heard. But it CAN:

- Log the violation for compliance
- Redirect the next AI response
- Terminate the session if critical
- Notify the parent dashboard

#### Level 3 — Monitoring & Compliance

All safety events logged via `compliance-audit-service` for:

- EU AI Act Art. 10 bias monitoring
- GDPR Article 35 DPIA audit trail
- Italian L.132/2025 reporting

---

### Fix P3+P4: Multilingual Greetings

**Approach**: Thread user locale through the greeting flow.

1. `character-slice.ts:141` — pass `locale` to `createActiveCharacter()`
2. `helpers.ts:31` — accept `language` param (already has it!)
3. `helpers.ts:44,49` — call `getGreeting({language})` instead of `.greeting`
4. Keep static `.greeting` as fallback only

```typescript
// helpers.ts BEFORE:
greeting = coach.greeting; // always Italian

// AFTER:
greeting = coach.getGreeting ? coach.getGreeting({ language }) : coach.greeting; // fallback only
```

---

### Fix P5: Token Cache Integration

Wire `useTokenCache` into the voice session hook:

```typescript
// use-voice-session.ts
import { useTokenCache } from './token-cache';

const { getCachedToken, preloadToken } = useTokenCache();

// On mount: preload token
useEffect(() => {
  preloadToken();
}, []);

// In connection: use cached token
const token = await getCachedToken(); // instant if cached
```

---

### Fix P6: CORS

One-line fix in `cors-config.ts:62`:

```typescript
"Access-Control-Allow-Headers":
  "Content-Type, Authorization, X-CSRF-Token, x-csrf-token",
```

---

### Fix P7: Admin Redirect

```typescript
// proxy.ts:303
const adminUrl = new URL(pathWithoutLocale, request.url);
adminUrl.search = new URL(request.url).search;
```

---

## 5. Execution Waves

### Wave 1 — Safety + Personality (CRITICAL) — Ship first

| Task | File                         | Change                                    |
| ---- | ---------------------------- | ----------------------------------------- |
| W1.1 | voice-prompt-builder.ts      | Remove 2000 char limit, strip only KB     |
| W1.2 | session-config.ts            | Include safety prompt + full systemPrompt |
| W1.3 | event-handlers.ts            | Add transcript safety net (Level 2)       |
| W1.4 | voice-prompt-builder.test.ts | Update tests for new behavior             |
| W1.5 | New: voice-safety.test.ts    | Test transcript safety integration        |

### Wave 2 — Multilingual Greetings (HIGH)

| Task | File                 | Change                                              |
| ---- | -------------------- | --------------------------------------------------- |
| W2.1 | helpers.ts           | Call getGreeting with language                      |
| W2.2 | character-slice.ts   | Pass locale to createActiveCharacter                |
| W2.3 | session-slice.ts     | Same                                                |
| W2.4 | All 26 maestri .ts   | Ensure static greeting is formal Italian (fallback) |
| W2.5 | buddy-profiles/\*.ts | Bruno/Mario/Noemi use buddy greeting                |

### Wave 3 — Performance + Polish (MEDIUM/LOW)

| Task | File                            | Change                                                     |
| ---- | ------------------------------- | ---------------------------------------------------------- |
| W3.1 | use-voice-session.ts            | Integrate token cache                                      |
| W3.2 | cors-config.ts                  | Add X-CSRF-Token                                           |
| W3.3 | proxy.ts                        | Preserve query params in admin redirect                    |
| W3.4 | maestri voice assignments       | Diversify with marin/cedar                                 |
| W3.5 | accessibility-store profiles.ts | Add voicePreference field to DSA profiles                  |
| W3.6 | session-config.ts               | Read a11y voice override, use instead of character default |
| W3.7 | settings UI (a11y section)      | Add voice selector dropdown in accessibility settings      |

---

## 6. Voice Assignments (Current → Proposed)

### Current Distribution (26 maestri)

| Voice    | Count | Characters                                                                                                                          |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| echo     | 14    | alex-pina, cassese, cervantes, cicerone, erodoto, euclide, feynman, galileo, goethe, humboldt, ippocrate, manzoni, moliere, socrate |
| alloy    | 6     | chris, darwin, leonardo, mozart, shakespeare, smith                                                                                 |
| shimmer  | 3     | curie, levi-montalcini, lovelace                                                                                                    |
| ash      | 1     | mascetti                                                                                                                            |
| verse    | 1     | omero                                                                                                                               |
| (unused) | -     | marin, cedar, ballad, coral, sage                                                                                                   |

### Proposed Distribution

| Voice   | Gender/Tone       | Proposed Characters                  |
| ------- | ----------------- | ------------------------------------ |
| echo    | M, warm           | manzoni, cicerone, cassese, socrate  |
| alloy   | N, balanced       | shakespeare, smith, darwin, euclide  |
| marin   | M, professional   | galileo, humboldt, goethe, cervantes |
| cedar   | M, conversational | feynman, alex-pina, moliere, erodoto |
| ash     | M, expressive     | chris, mascetti, ippocrate, mozart   |
| shimmer | F, energetic      | curie, lovelace                      |
| coral   | F, warm           | levi-montalcini                      |
| verse   | M, narrative      | omero, leonardo                      |

---

## 7. Risks & Mitigations

| Risk                                       | Mitigation                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Large instructions may slow first response | Monitor via Sentry latency traces; fall back to current truncation if >3s |
| Transcript safety has ~1-2s delay          | Level 1 (instructions) prevents 95%; Level 2 is audit + redirect          |
| `injectSafetyGuardrails` has server deps   | Use `SAFETY_CORE_PROMPT` constant (pure text, no Prisma)                  |
| Greeting language detection wrong          | Use `useLocale()` hook → same as rest of UI                               |
| Token cache stale                          | 30s refresh buffer already built into token-cache.ts                      |

---

## 8. Acceptance Criteria

- [ ] Voice characters speak with their actual personality (not generic)
- [ ] Voice has safety guardrails matching chat level
- [ ] Greetings appear in user's selected language (5 locales)
- [ ] Formal professors use Lei/Sie/Vous in greetings
- [ ] Voice connection latency ≤500ms (with token cache)
- [ ] No console CORS errors on telemetry
- [ ] No 404 on admin RSC navigation
- [ ] All 10847 existing tests still pass
- [ ] release:fast gate passes

---

## 9. Decisions (Approved 14 Feb 2026)

1. **Voice model**: Tier-based selection.
   Trial=gpt-realtime-mini, Base=gpt-realtime-mini, Pro=gpt-realtime (premium).
   Configured via `tierService.getModelForUserFeature(userId, 'voice')`.

2. **Voice override**: Yes, in accessibility settings.
   Users can select a preferred voice that overrides the character default.
   Useful for auditory impairment profiles. Available to all tiers.

3. **Transcript safety reaction**: Log + redirect + UI warning.
   When safety net detects a violation in voice transcript:
   - Log the event via compliance-audit-service
   - Send `response.cancel` + redirect the AI to a safe response
   - Show a visual warning in the voice call UI
   - Do NOT terminate the session (keep the student engaged safely)
