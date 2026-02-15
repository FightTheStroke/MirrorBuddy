# ADR 0151: Anonymous User Auto-Creation Guard

Status: Accepted | Date: 15 Feb 2026

## Context

### The Vulnerability

`GET /api/user` (in `src/app/api/user/route.ts`) was designed for "local/dev mode" where every visitor automatically gets a User record created in the database. The flow was:

1. App loads → `initializeStores()` calls `fetch("/api/user")`
2. No auth cookie → endpoint creates a new User + Profile + Settings + Progress
3. Sets auth cookies (1-year expiry) → visitor is now a "user"

**In production, this meant every bot, crawler, health check, and anonymous visitor created a permanent database record.** During testing we discovered 308 "users" in the admin dashboard — of which only 3 had actual emails. The remaining 305 were phantom records with no username, no email, all created by automated traffic.

### Security Impact

- **Database pollution**: Hundreds of empty User records from bots/crawlers
- **Misleading metrics**: Admin dashboard showed 308 users and 174 "active" — all fake
- **Resource waste**: Each phantom user gets Profile, Settings, Progress records + Base tier subscription
- **No rate limiting**: Any IP could create unlimited User records via simple GET requests

## Decision

### Production Guard

In production (`NODE_ENV === 'production'`), `GET /api/user` returns `401 { error: "Authentication required", guest: true }` for unauthenticated requests. User creation only happens through legitimate auth flows (SSO, login).

In development/test mode, the auto-creation behavior is preserved for local development convenience.

### Client-Side Handling

`initializeStores()` in `src/lib/stores/use-store-sync.ts` now handles the 401 response gracefully — stores use their defaults and skip server sync. The trial flow continues working through `/api/trial/session` which manages visitor sessions separately.

### Files Changed

- `src/app/api/user/route.ts` — Added production guard before auto-creation
- `src/lib/stores/use-store-sync.ts` — Handle 401 from `/api/user` gracefully
- `src/app/api/user/__tests__/route.test.ts` — Added production guard tests

## Consequences

- Production database only contains legitimate users (SSO/login authenticated)
- Admin dashboard metrics are accurate (real users only)
- Dev mode still auto-creates users for convenience
- Trial/anonymous visitors use the trial session system (no User record needed)
- Existing phantom records should be cleaned up manually via admin panel
