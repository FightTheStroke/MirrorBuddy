# ADR 0016: Component Modularization & Infrastructure Hardening

## Status

Accepted

## Date

2026-01-01

## Context

### The Problem

After rapid feature development in late 2025, several React components had grown to unmanageable sizes:

| Component | Lines | Symptoms |
|-----------|-------|----------|
| `settings-view.tsx` | 3,649 | 9 unrelated settings sections in one file |
| `archive-view.tsx` | 1,096 | 6 view modes + viewer + utilities mixed |
| `conversation-flow.tsx` | 1,281 | 7 distinct UI elements interleaved |

**Pain points experienced:**
- Finding code took minutes, not seconds
- Fear of making changes ("what if I break something else?")
- Git conflicts on every PR touching settings
- Hot reload took 3-4 seconds instead of <1s
- Impossible to unit test specific sections
- New team members overwhelmed by file size

**Infrastructure gaps discovered:**
- No health check endpoint (ops team couldn't monitor)
- `console.log` in production (logs not aggregatable)
- Missing rate limiting on public endpoints
- Critical hook (`use-saved-materials.ts`) had zero tests

### Why This Happened

1. **Speed over structure**: Shipped features fast without refactoring
2. **No size limits**: No lint rule for max file size
3. **Copy-paste growth**: Easier to add to existing file than create new one
4. **Missing guidelines**: No documented component structure pattern

## Decision

### 1. Component Splitting Strategy

Split monolithic components using **barrel export pattern**:

```
src/components/settings/
├── settings-view.tsx          # Orchestrator only (267 lines)
├── constants.ts               # Shared constants
└── sections/
    ├── index.ts               # Barrel export
    ├── profile-settings.tsx   # ~80 lines each
    ├── appearance-settings.tsx
    ├── audio-settings.tsx
    └── ...
```

**Principles:**
- **Single Responsibility**: One file = one concern
- **Max 300 lines**: Soft limit, refactor if exceeded
- **Barrel Exports**: Clean imports via `index.ts`
- **Colocation**: Related files in same directory

### 2. Infrastructure Hardening

| Gap | Solution |
|-----|----------|
| No health check | `/api/health` with DB + AI + memory checks |
| Console logging | Replaced 20+ `console.log` with `logger` module |
| Rate limiting | Added to `/api/tts`, `/api/push/subscribe` |
| Missing tests | Added 18 tests for `use-saved-materials.ts` |
| CI gaps | Added `test:unit` step (910 tests) |

## Consequences

### Quantified Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| `settings-view.tsx` | 3,649 lines | 267 lines | **93% smaller** |
| `archive-view.tsx` | 1,096 lines | 414 lines | **62% smaller** |
| `conversation-flow.tsx` | 1,281 lines | 586 lines | **54% smaller** |
| Unit tests | 892 | 910 | +18 tests |
| Health monitoring | None | Full | Production ready |
| Logging | Scattered | Centralized | Aggregatable |

### Developer Experience Improvements

1. **Finding code**: Ctrl+P → `audio-settings` → done (vs scrolling 3600 lines)
2. **Safe changes**: Edit 80 lines knowing you can't break profile settings
3. **Faster builds**: Hot reload <1s for small files
4. **Easier reviews**: PRs touch specific modules, not monoliths
5. **Onboarding**: "Look at `audio-settings.tsx`" vs "Look at line 2847"

### Production Operations

1. **Monitoring**: `/api/health` returns DB, AI, memory status
2. **Debugging**: Structured logs with `logger.error({ context })`
3. **Protection**: Rate limiting prevents API abuse
4. **Confidence**: 910 tests catch regressions

### Trade-offs Accepted

| Downside | Mitigation |
|----------|------------|
| More files (45 vs 3) | Barrel exports keep imports clean |
| Initial refactoring cost | One-time investment, done |
| Need to maintain index.ts | Simple, rarely changes |

## Lessons Learned

### What We'll Do Differently

1. **Set file size limits early**: Add ESLint rule for max 400 lines
2. **Refactor continuously**: Don't let files grow past 500 lines
3. **Document patterns**: This ADR serves as template for future splits
4. **Test infrastructure**: Health checks and logging from day 1

### Warning Signs to Watch

- File over 500 lines → schedule refactoring
- Multiple unrelated functions in one file → split
- "I'm afraid to touch this file" → definitely split
- Hot reload >2s → too much in one module

### What Worked Well

- Barrel exports made migration seamless (no import changes needed)
- Splitting by feature (not by type) kept related code together
- Adding tests during refactoring caught bugs early
- Running full verification after each phase prevented regressions

## Implementation Details

### Files Created

**Settings (9 modules):**
- `sections/profile-settings.tsx`
- `sections/appearance-settings.tsx`
- `sections/audio-settings.tsx`
- `sections/character-settings.tsx`
- `sections/notification-settings.tsx`
- `sections/privacy-settings.tsx`
- `sections/ai-provider-settings.tsx`
- `sections/accessibility-tab.tsx`
- `sections/diagnostics-tab.tsx`

**Archive (6 modules):**
- `archive/grid-view.tsx`
- `archive/list-view.tsx`
- `archive/material-viewer.tsx`
- `archive/thumbnail-preview.tsx`
- `archive/star-rating.tsx`
- `archive/empty-state.tsx`

**Conversation (7 modules):**
- `components/character-avatar.tsx`
- `components/character-card.tsx`
- `components/character-role-badge.tsx`
- `components/conversation-header.tsx`
- `components/handoff-banner.tsx`
- `components/message-bubble.tsx`
- `components/voice-call-overlay.tsx`

**Infrastructure:**
- `src/app/api/health/route.ts`
- `src/lib/hooks/__tests__/use-saved-materials.test.ts`

### Verification Performed

```bash
npm run lint        # 0 errors
npm run typecheck   # 0 errors
npm run test:unit   # 910/910 passing
npm run build       # Success
```

## Related

- **Issue**: #68 - Architecture Review Jan 2026
- **PR**: #67 - Implementation
- **ADR 0015**: Database-first architecture (related infrastructure work)

## References

- [React Component Patterns](https://reactpatterns.com/)
- [Barrel Exports in TypeScript](https://basarat.gitbook.io/typescript/main-1/barrel)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [ISE Engineering Fundamentals - Code Organization](https://microsoft.github.io/code-with-engineering-playbook/)
