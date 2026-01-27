# ADR 0082: Tier-Specific Memory System

## Status

Accepted

## Date

2026-01-26

## Context

MirrorBuddy's conversation memory system previously used hardcoded limits for all users:

```typescript
// Old hardcoded values in memory-loader.ts
const MAX_CONVERSATIONS = 3;
const MAX_KEY_FACTS = 10;
const MAX_TOPICS = 15;
```

This approach had several problems:

1. **No tier differentiation**: Trial, Base, and Pro users all had identical memory capabilities
2. **No value proposition for Pro**: Premium users paying €9.99/month got the same memory as free users
3. **No revenue incentive**: Memory is a key feature that should incentivize upgrades
4. **Inflexible**: Changing limits required code changes, not configuration

## Decision

Implement a tier-specific memory configuration system with the following architecture:

### Configuration Layer (`tier-memory-config.ts`)

```typescript
export interface TierMemoryLimits {
  recentConversations: number; // How many past conversations to consider
  timeWindowDays: number | null; // Retention period (null = unlimited)
  maxKeyFacts: number; // Key facts to inject in prompts
  maxTopics: number; // Topics to inject in prompts
  semanticEnabled: boolean; // RAG-based retrieval (future)
  crossMaestroEnabled: boolean; // Share memory across maestri (future)
}

export const TIER_MEMORY_CONFIG: Record<TierName, TierMemoryLimits> = {
  trial: {
    recentConversations: 0, // No memory
    timeWindowDays: 0,
    maxKeyFacts: 0,
    maxTopics: 0,
    semanticEnabled: false,
    crossMaestroEnabled: false,
  },
  base: {
    recentConversations: 3, // Limited memory
    timeWindowDays: 15, // 15-day retention
    maxKeyFacts: 10,
    maxTopics: 15,
    semanticEnabled: false,
    crossMaestroEnabled: false,
  },
  pro: {
    recentConversations: 5, // Enhanced memory
    timeWindowDays: null, // Unlimited retention
    maxKeyFacts: 50,
    maxTopics: 30,
    semanticEnabled: true, // RAG retrieval enabled
    crossMaestroEnabled: true, // Cross-maestro memory
  },
};
```

### Service Layer (`tier-service.ts`)

New method `getTierMemoryConfig(userId)` that:

- Gets user's effective tier
- Returns memory configuration with caching
- Falls back to Trial tier on errors
- Invalidates cache when tiers change

### Consumer Layer (`memory-loader.ts`, `prompt-enhancer.ts`)

- `memory-loader.ts`: Uses tier config instead of hardcoded constants
- `prompt-enhancer.ts`: Respects tier limits when building prompts
- Trial tier users get no memory injection (performance optimization)

## Consequences

### Positive

1. **Clear value proposition**: Pro users get 5x the facts, unlimited retention, and advanced features
2. **Revenue driver**: Memory capabilities create upgrade incentive
3. **Performance**: Trial users skip memory loading entirely
4. **Configurability**: Limits can be adjusted without code changes (future DB migration)
5. **Future-ready**: `semanticEnabled` and `crossMaestroEnabled` flags for Phase 2

### Negative

1. **Complexity**: Three-layer architecture (config → service → consumers)
2. **Testing burden**: Each tier needs test coverage
3. **Migration needed**: Existing conversations need tier association (deferred)

## Learnings from Implementation

### L1: structuredClone for Deep Copies

**Issue**: Initial implementation returned config object reference, allowing accidental mutation.

**Root cause**: `return TIER_MEMORY_CONFIG[tierName]` returns a reference, not a copy.

**Resolution**: Use `structuredClone()` for guaranteed deep copy.

**Preventive rule**: When returning configuration objects, always use `structuredClone()` to prevent mutation:

```typescript
// WRONG - returns mutable reference
return TIER_MEMORY_CONFIG[tierName];

// CORRECT - returns immutable copy
return structuredClone(TIER_MEMORY_CONFIG[tierName]);
```

### L2: Cache Key Strategy for Tier Configs

**Issue**: Initially considered caching by `userId`, but tier configs are shared across users.

**Root cause**: Overcomplicating the cache key.

**Resolution**: Cache by `tierName` (trial/base/pro), not by userId. Only 3 possible values.

**Preventive rule**: Choose cache keys based on what varies:

- User-specific data → cache by userId
- Tier-specific config → cache by tierName (3 values)
- Global config → no cache key needed

### L3: Unused Imports Block Pre-commit

**Issue**: Pre-commit hook failed with ESLint warnings for unused imports.

**Root cause**: Test file imported types for documentation but didn't use them.

**Resolution**: Remove unused imports, only import what's actively used.

**Preventive rule**: Configure ESLint `--max-warnings 0` to catch this early:

```json
// .lintstagedrc.json
{
  "*.{ts,tsx}": ["eslint --fix --max-warnings 0"]
}
```

### L4: Optional Parameters with Sensible Defaults

**Issue**: `loadPreviousContext(userId, maestroId)` needed tier info but had many existing callers.

**Root cause**: Adding required parameters breaks backward compatibility.

**Resolution**: Add optional `tierName` parameter with `'base'` default:

```typescript
export async function loadPreviousContext(
  userId: string,
  maestroId: string,
  tierName: TierName = "base", // Optional with default
): Promise<ConversationMemory>;
```

**Preventive rule**: When extending function signatures, prefer optional parameters with sensible defaults over required parameters that break callers.

### L5: Early Return for Disabled Features

**Issue**: Trial tier still executed full memory loading logic before returning empty results.

**Root cause**: Check for disabled feature was at the end of the function.

**Resolution**: Check tier limits at function entry and return immediately:

```typescript
// Early return for trial tier (no memory)
if (limits.recentConversations === 0) {
  return {
    recentSummary: null,
    keyFacts: [],
    topics: [],
    lastSessionDate: null,
  };
}
```

**Preventive rule**: Check feature flags/tier limits at function entry to avoid unnecessary work.

## Test Coverage

| Component                | Tests  | Coverage                               |
| ------------------------ | ------ | -------------------------------------- |
| tier-memory-config.ts    | 30     | Interface, config values, copy safety  |
| tier-service.ts (memory) | 11     | getTierMemoryConfig, caching, fallback |
| memory-loader.ts         | 21     | Tier-specific behavior, timeWindowDays |
| prompt-enhancer.ts       | 17     | Tier limits, trial skip                |
| **Total**                | **79** | All acceptance criteria                |

## Files Changed

```
src/lib/conversation/tier-memory-config.ts        (NEW)  90 lines
src/lib/conversation/__tests__/tier-memory-config.test.ts  (NEW)
src/lib/tier/tier-service.ts                      (+44 lines)
src/lib/tier/__tests__/tier-service-memory.test.ts  (NEW)
src/lib/conversation/memory-loader.ts             (MODIFIED)
src/lib/conversation/__tests__/memory-loader.test.ts  (MODIFIED)
src/lib/conversation/prompt-enhancer.ts           (MODIFIED)
src/lib/conversation/__tests__/prompt-enhancer.test.ts  (MODIFIED)
```

## Future Work (Out of Scope)

- **Phase 2**: Implement `semanticEnabled` RAG retrieval
- **Phase 3**: Implement `crossMaestroEnabled` memory sharing
- **Database**: Move config to TierDefinition table for admin UI editing

## References

- Plan 086: Total Memory System
- ADR 0021: Conversational Memory Injection
- ADR 0065: Three-Tier Subscription Model
