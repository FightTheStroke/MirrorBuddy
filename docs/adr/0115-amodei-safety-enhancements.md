# ADR 0115: Amodei Safety Enhancements

**Status**: Accepted
**Date**: 4 February 2026
**Context**: Implementing safety principles from Dario Amodei's "The Adolescence of Technology" (2026)

## Context

Dario Amodei's essay outlines key risks and responsibilities for AI systems, especially
those interacting with children and students. MirrorBuddy, as an educational AI platform
serving students with learning differences, must implement robust safeguards against:

1. **Emotional dependency** on AI instead of human relationships
2. **Dangerous knowledge transfer** (STEM safety - chemistry, physics, biology)
3. **Influence and manipulation** by AI on developing minds
4. **Replacement of human educators** rather than augmentation

## Decision

Implement a comprehensive safety framework based on Amodei's principles:

### 1. Professors' Constitution

Created `docs/compliance/PROFESSORS-CONSTITUTION.md` with 6 articles:

- **Article I**: Wisdom, not answers - teach methodology
- **Article II**: Never replace human teachers, always supplement
- **Article III**: Detect and prevent emotional dependency
- **Article IV**: Safe handling of dangerous knowledge
- **Article V**: No influence on politics, religion, life decisions
- **Article VI**: Celebrate human relationships over AI relationships

### 2. Anti-Influence Guardrails (Active)

Added to `src/lib/safety/safety-prompts-core.ts`:

- Section 8: Anti-influence directives
- Section 9: Human-first reminders
- Applied to all 26 Professors, 6 Coaches, and Buddies via `injectSafetyGuardrails()`

### 3. Dependency Detection System (Active)

New module: `src/lib/safety/dependency/`

- Tracks session starts and message counts per user
- Detects emotional venting patterns (regex-based)
- Detects AI preference statements
- Analyzes usage with N-sigma deviation from baseline
- Generates alerts at warning/concern/critical thresholds
- Parent notification queue for concern+ alerts

**Integration**: Chat API calls `recordSessionStart()` and `recordMessage()` on every interaction.

Database: New Prisma models `UsagePattern` and `DependencyAlert`.

### 4. STEM Safety Blocklists (Active)

New module: `src/lib/safety/stem-safety/`

- Chemistry: explosives, drugs, poisons, chemical weapons
- Physics: nuclear weapons, EMP devices, radiation weapons
- Biology: pathogens, toxins, bioweapons, CRISPR misuse

**Integration**: Chat API calls `checkSTEMSafety()` before processing STEM-related queries.

Returns safe educational alternatives when dangerous content detected.

### 5. Independence Gamification (Active)

New tracker: `src/lib/gamification/independence-tracker.ts`

Detects when students mention:

- Getting help from parents/teachers (+15 XP)
- Studying with classmates (+10 XP)
- Solving problems independently (+20 XP)

**Integration**: Chat API calls `analyzeIndependence()` and awards XP via `awardPoints()`.

New achievements: independent_thinker, human_helper, study_buddy, balanced_learner.

### 6. Transparency Page Update

Added philosophy section to `/ai-transparency` explaining our AI principles.

## Integration Points

All safety modules are integrated in `src/app/api/chat/route.ts`:

```typescript
// STEM Safety Check
const stemResult = checkSTEMSafety(message, maestroId);
if (stemResult.blocked) return safeResponse;

// Dependency Detection
recordMessage(userId, message);

// Independence Gamification
const independence = analyzeIndependence(message);
if (independence.xpToAward > 0) awardPoints(userId, independence.xpToAward, ...);
```

## Consequences

### Positive

- Proactive protection against AI dependency
- Dangerous STEM knowledge never reaches students
- Gamification encourages human relationships
- Full audit trail for parent/admin review
- Compliance with emerging AI child safety regulations

### Negative

- Additional latency (~5ms per message for pattern matching)
- Storage overhead for usage tracking
- Potential false positives in emotional pattern detection
- Requires periodic threshold tuning

## Thresholds

| Metric                 | Warning | Concern | Critical |
| ---------------------- | ------- | ------- | -------- |
| Daily minutes          | 120     | 180     | 240      |
| Daily sessions         | 8       | 12      | 20       |
| Night usage %          | 30%     | 50%     | 70%      |
| Weekly emotional vents | 5       | -       | 10       |
| Weekly AI preferences  | 3       | -       | 7        |
| Sigma deviation        | 2.0     | -       | -        |

## References

- Amodei, D. (2026). "The Adolescence of Technology"
- EU AI Act 2024/1689 - Child Protection Requirements
- COPPA - Children's Online Privacy Protection
- MirrorBuddy PROFESSORS-CONSTITUTION.md
