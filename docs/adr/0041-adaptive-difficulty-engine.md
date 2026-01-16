# ADR 0041: Adaptive Difficulty Engine

## Status

Accepted

## Context

MirrorBuddy serves students with learning differences (DSA) who need personalized
difficulty adjustment. A fixed difficulty level fails these students because:

1. **Frustration spiral**: Too-hard content causes frustration and abandonment
2. **Boredom plateau**: Too-easy content fails to challenge and engage
3. **Variable capacity**: DSA students have significant day-to-day variation
4. **Individual needs**: Each student's optimal difficulty differs

We need an engine that detects student state through multiple signals and adjusts
difficulty in real-time while avoiding jarring transitions.

## Decision

Implement a multi-signal adaptive difficulty engine with:

1. **Signal detection** from text/voice input (frustration, repeat requests, questions)
2. **EMA smoothing** to prevent oscillation from momentary signals
3. **Four control modes** (manual → automatic) for different user preferences
4. **Mastery-based constraints** to cap difficulty based on demonstrated competence

## Architecture

### Module Structure

```
src/lib/education/
├── adaptive-difficulty.ts          # Main module, DB operations, re-exports
├── adaptive-difficulty-core.ts     # Pure calculation functions
├── adaptive-difficulty-profile.ts  # Profile management, Zod validation
├── adaptive-difficulty-client.ts   # Browser-side signal detection
└── __tests__/                      # 49 unit tests
```

### Signal Types

| Signal | Source | Detection Method |
|--------|--------|------------------|
| `frustration` | chat, voice | Italian phrases ("non ce la faccio", "è troppo difficile") |
| `repeat_request` | chat, voice | Phrases ("non ho capito", "ripeti", "di nuovo") |
| `question` | chat, voice | Question mark, interrogative words |
| `response_time_ms` | system | Time between prompt and response |
| `quiz_result` | quiz | Score 0-100 |
| `flashcard_rating` | flashcard | again/hard/good/easy |

### EMA Smoothing

All signals use Exponential Moving Average to prevent oscillation:

```typescript
// α = 0.3 (30% new value, 70% historical)
newValue = α * signal + (1 - α) * oldValue

// Decay factor 0.9 applied before each update
// Prevents stale high values from persisting
```

### Difficulty Adjustment Algorithm

```
Input: profile signals, mode, baseline difficulty, subject mastery

1. Apply decay to existing signals (factor 0.9)
2. Calculate adjustment from signals:
   - High frustration (>0.6): reduce difficulty
   - High repeat rate (>0.5): reduce difficulty
   - High question rate with low frustration: increase difficulty
   - Slow response time (>20s): reduce difficulty
3. Apply mode limits (manual=0, guided=±0.5, balanced=±1.0, automatic=±1.5)
4. Apply mastery constraints (low mastery caps max difficulty)
5. Round to nearest 0.5
6. Clamp to range [1, 5]

Output: targetDifficulty, apply flag, reason (Italian)
```

### Control Modes

| Mode | Max Adjustment | Behavior |
|------|---------------|----------|
| `manual` | 0 | Suggestions only, asks confirmation |
| `guided` | ±0.5 | Small adjustments with clear notifications |
| `balanced` | ±1.0 | Adapts while maintaining stability |
| `automatic` | ±1.5 | Full real-time adaptation |

### Data Flow

```
User Input → Signal Detection (client) → API → Profile Update (server)
                                                      ↓
AI Prompt ← buildAdaptiveInstruction() ← calculateAdaptiveContext()
```

## Tuning Parameters

These values may need adjustment based on real user data:

| Parameter | Value | Location | Purpose |
|-----------|-------|----------|---------|
| `EMA_ALPHA` | 0.3 | core | Signal smoothing factor |
| `DECAY_FACTOR` | 0.9 | profile | Signal decay per update |
| `FRUSTRATION_THRESHOLD` | 0.6 | core | Triggers difficulty reduction |
| `REPEAT_THRESHOLD` | 0.5 | core | Triggers difficulty reduction |
| `SLOW_RESPONSE_MS` | 20000 | core | Response time threshold |
| `DEFAULT_RESPONSE_MS` | 12000 | profile | Initial average response time |
| `TEXT_FRUSTRATION_VALUE` | 0.8 | client | Signal strength from text patterns |
| `RETRY_DELAY_MS` | 1000 | client | API retry base delay |
| `MAX_RETRIES` | 2 | client | API retry attempts |

## Consequences

### Positive

- Students get personalized difficulty without manual adjustment
- Multiple signals reduce false positives from single indicators
- EMA prevents jarring transitions
- Mode selection respects parent/teacher preferences
- Zod validation prevents corrupted profiles from crashing

### Negative

- Text-based frustration detection has limited accuracy
- Italian-only phrase patterns (needs i18n for other languages)
- No vocal prosody analysis (tone, pitch, pace)
- Tuning parameters are theoretical, need empirical validation

## Technical Debt

### Resolved in PR #149

- [x] File exceeded 250 lines → split into 3 modules
- [x] No input validation → added Zod schema
- [x] Silent API failures → added retry with exponential backoff
- [x] Missing unit tests → added 49 tests
- [x] Italian accent typos → fixed UI strings

### Remaining (Low Priority)

1. **Magic numbers**: Tuning parameters are inline constants, not configurable
2. **Italian-only**: Phrase patterns need i18n for multilingual support
3. **No A/B testing**: No infrastructure to compare algorithm variants

## Future Enhancement

See [ADR 0042: Vocal Prosody Frustration Detection](./0042-vocal-prosody-frustration.md) for
proposed enhancement to detect frustration from voice tone, pitch, and pace.

## References

- [ADR 0042: Vocal Prosody Frustration Detection](./0042-vocal-prosody-frustration.md)
