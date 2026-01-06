# MirrorBuddy v2.0 - Triangle of Support

> Architecture from ManifestoEdu.md - Three layers of support for students with learning differences.

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIANGLE OF SUPPORT                       │
├─────────────────────────────────────────────────────────────┤
│                      MAESTRI (17)                           │
│                    Subject Experts                          │
│              "Vertical" - Content Teaching                  │
│         ┌───────────────┬───────────────┐                   │
│         ▼               ▼               ▼                   │
│      COACH            COACH          BUDDY                  │
│    (Melissa)         (Davide)    (Mario/Maria)              │
│   Learning Method   Learning Method  Peer Support           │
│   Autonomy-focused  Calm/Reassuring  Emotional Connection   │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/data/support-teachers/` | 5 coach profiles (modular structure) |
| `src/data/buddy-profiles/` | Mario & Maria profiles (modular structure) |
| `src/data/app-knowledge-base.ts` | Platform docs for coaches |
| `src/lib/ai/character-router.ts` | Routes to appropriate character |
| `src/lib/ai/handoff-manager.ts` | Transitions between characters |
| `src/lib/ai/intent-detection.ts` | Detects student intent |
| `src/components/conversation/` | Conversation UI |

## Character Types

```typescript
type CharacterType = 'maestro' | 'coach' | 'buddy';
```

## Character Routing

| Student Intent | Routed To | Reason |
|----------------|-----------|--------|
| "Spiegami le frazioni" | Maestro (Archimede) | Academic content |
| "Non riesco a concentrarmi" | Coach (Melissa) | Study method |
| "Mi sento solo" | Buddy (Mario) | Emotional support |
| "Come funzionano le flashcard?" | Coach | Platform support |

## Buddy Mirroring

Buddies dynamically mirror student's profile:
- **Age**: Always 1 year older (`ageOffset: 1`)
- **Learning Differences**: Same as student
- **Gender**: Student chooses Mario/Maria

## Handoff Protocol

- Maestro → Coach: "Per organizzarti meglio, prova Melissa"
- Coach → Buddy: "Vuoi parlare con Mario? Lui capisce"
- Buddy → Maestro: "Per matematica, chiedi ad Archimede!"

## Safety Guardrails

All characters have safety guardrails in `src/lib/safety/`:
- `guardrails.ts` - `injectSafetyGuardrails()`
- `content-filter.ts` - `filterInput()`, `sanitizeOutput()`
- `age-gating.ts` - Age-appropriate validation
