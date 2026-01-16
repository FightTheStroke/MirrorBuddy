# ADR 0044: Performance Optimizations

## Status

Accepted

## Context

MirrorBuddy's performance analysis identified several issues across the stack:

1. **Bundle Size**: Large dependencies (KaTeX, Recharts) loaded synchronously
2. **Image Assets**: PNG avatars causing unnecessary bandwidth
3. **Database**: N+1 queries, missing pagination, missing composite indexes
4. **React Re-renders**: Inline handlers causing unnecessary component re-renders
5. **Voice Session**: Linear reconnection backoff, excessive audio level updates

These issues impact load time, runtime performance, and user experience.

## Decision

Implement targeted optimizations across 6 waves:

### W1-W2: Security & Memory (Deferred)
Security issues and memory leaks handled in separate ADRs.

### W3: Bundle Optimization

| Change | Impact |
|--------|--------|
| Convert avatars to WebP | ~60% size reduction |
| Lazy load KaTeX | Remove 200KB from initial bundle |
| Lazy load Recharts | Remove 150KB from initial bundle |
| `optimizePackageImports` for Radix/Lucide | Tree-shaking improvement |
| Image optimization in next.config | AVIF/WebP with caching |

### W4: Database Optimization

| Change | Files | Impact |
|--------|-------|--------|
| Batch upserts with `$transaction` | sync-materials.ts | N+1 → 2 queries |
| Batch achievement unlocks | gamification/db.ts | N+1 → 2 queries |
| Add pagination | learnings, concepts APIs | Unbounded → max 200 |
| Composite indexes | FlashcardProgress, TelemetryEvent, Material | Query performance |

### W5: React Re-render Prevention

| Component | Change |
|-----------|--------|
| grid-view.tsx | Extract memoized GridCard with useCallback |
| list-view.tsx | Extract memoized ListRow with useCallback |
| session-tools.tsx | Memoize 5 tool trigger handlers |
| session-controls.tsx | Memoize text input handlers |
| tool-canvas.tsx | Memoize toggle/event handlers with refs |

### W6: Voice Session Optimization

| Change | File | Impact |
|--------|------|--------|
| Exponential backoff with jitter | use-tool-stream.ts | Better reconnection (2s → 4s → 8s + jitter, cap 30s) |
| Throttle output level to 30fps | audio-playback.ts | 50% fewer state updates |

## Implementation

### Lazy Loading Pattern
```typescript
const FormulaRenderer = dynamic(
  () => import('@/components/tools/formula-renderer'),
  { ssr: false, loading: () => <Skeleton /> }
);
```

### Memoization Pattern
```typescript
const GridCard = memo(function GridCard({ item, onView, ... }) {
  const handleClick = useCallback(() => onView(item), [onView, item]);
  return <Card onClick={handleClick}>...</Card>;
});
```

### Exponential Backoff Pattern
```typescript
const exponentialDelay = baseDelay * Math.pow(2, attempts - 1);
const jitter = Math.random() * 500;
const delay = Math.min(exponentialDelay + jitter, 30000);
```

### Prisma Batch Pattern
```typescript
await prisma.$transaction(
  items.map(item => prisma.model.upsert({
    where: { id: item.id },
    create: item,
    update: { ...item, updatedAt: new Date() },
  }))
);
```

## Consequences

### Positive
- Faster initial page load (reduced bundle)
- Better perceived performance (lazy loading)
- Reduced database load (batching, indexes)
- Smoother UI (fewer re-renders)
- More resilient connections (exponential backoff)

### Negative
- Slight delay on first use of lazy-loaded components
- Increased code complexity with memoization
- Need to maintain composite indexes

## Verification

```bash
npm run lint      # No errors
npm run typecheck # No errors
npm run build     # Successful
```

## Related Commits

- `447d33b` perf(bundle): convert avatar images to WebP
- `cf57aa6` perf(bundle): convert maestri avatars to WebP
- `966eabb` perf(formula): lazy load KaTeX library
- `0c1aa45` perf(charts): lazy load Recharts library
- `771e092` perf(config): add bundle optimizations
- `ced34a7` perf(db): fix N+1 query patterns
- `153e37b` perf(api): add pagination
- `d9d70ae` perf(db): add composite indexes
- `17f8134` perf(react): add memoization for inline handlers
- `d4ab7d9` perf(voice): optimize reconnection and audio level updates
