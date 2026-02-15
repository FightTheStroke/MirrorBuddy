# ADR 0153: Centralized Redis Environment Variable Resolution

## Status

Accepted

## Date

2026-02-15

## Context

MirrorBuddy uses Upstash Redis (via `@upstash/redis`) for rate limiting, SSE client tracking, admin pub/sub, and trial budget caps. Redis credentials were read directly from `process.env` in 6+ files, each with its own `isRedisConfigured()` function.

Two naming conventions co-exist:

| Convention                     | Source                                       | Variables |
| ------------------------------ | -------------------------------------------- | --------- |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Upstash SDK default, used in `.env` and docs | Primary   |
| `KV_REST_API_URL/TOKEN`        | Vercel Marketplace auto-provisioned          | Fallback  |

When Vercel provisions an Upstash database via its Storage integration, it injects `KV_REST_API_*` variables. The codebase historically used `UPSTASH_REDIS_REST_*`. This mismatch caused the admin Infrastructure panel to show "Not Configured" for Redis despite valid credentials being present.

### Problems

1. **Naming mismatch**: `health-checks.ts` and `infra-panel-redis.ts` checked `KV_REST_API_*` while other files checked `UPSTASH_REDIS_REST_*`
2. **Duplicated logic**: 6 files had independent `isRedisConfigured()` functions
3. **Fragile**: Adding a new Redis consumer required knowing which env var names to check
4. **No fallback**: Each file checked only one naming convention

## Decision

**Centralize all Redis env var resolution in `src/lib/redis/index.ts`.**

### Resolver

```typescript
export function getRedisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

export function getRedisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export function isRedisConfigured(): boolean {
  return !!(getRedisUrl() && getRedisToken());
}
```

**Priority**: `UPSTASH_REDIS_REST_*` first (explicit), `KV_REST_API_*` second (Vercel auto-provisioned).

### Import Pattern

All Redis consumers import from the centralized module:

```typescript
import { isRedisConfigured, getRedisUrl, getRedisToken } from '@/lib/redis';
```

No file should read `process.env.UPSTASH_REDIS_REST_*` or `process.env.KV_REST_API_*` directly.

## Alternatives Considered

### Vercel KV SDK (`@vercel/kv`)

Vercel deprecated `@vercel/kv` in favor of direct `@upstash/redis`. No benefit to switching.

### Environment variable aliasing at deploy time

Could set `UPSTASH_REDIS_REST_URL = $KV_REST_API_URL` in Vercel config. Fragile — breaks if either convention changes and creates invisible coupling.

### Keep distributed `isRedisConfigured()`

Status quo. Each file checks its own env vars, leading to the exact naming mismatch bug this ADR fixes.

## Consequences

### Positive

- **Single source of truth**: One place to update if naming changes again
- **Both conventions work**: Vercel-provisioned or manually set credentials both resolve
- **Less code**: Removed ~40 lines of duplicated logic across 6 files
- **Fail-fast error message** lists both conventions when neither is set

### Negative

- **Import dependency**: All Redis consumers depend on `@/lib/redis`
- **Proxy export**: The convenience `redis` Proxy export requires `getRedisClient()` to not throw

## Files Changed

- `src/lib/redis/index.ts` — Added `getRedisUrl()`, `getRedisToken()`, exported `isRedisConfigured()`
- `src/lib/rate-limit.ts` — Imports from `@/lib/redis`
- `src/lib/trial/budget-cap.ts` — Imports from `@/lib/redis`
- `src/lib/helpers/admin-counts-pubsub.ts` — Imports from `@/lib/redis`
- `src/lib/realtime/redis-sse-store.ts` — Imports from `@/lib/redis`
- `src/lib/admin/health-checks.ts` — Imports from `@/lib/redis`
- `src/lib/admin/infra-panel-redis.ts` — Imports from `@/lib/redis`

## References

- ADR 0054: Upstash Redis for Distributed Rate Limiting
- ADR 0052: Vercel Deployment Configuration
- ADR 0138: Vercel Environment Variable Sync
