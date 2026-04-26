# API Routes — MirrorBuddy

Route handlers under `src/app/api/`. See root `CLAUDE.md` + `.claude/rules/auth-api.md` for context.

## Mutation Template (POST/PUT/PATCH/DELETE)

```ts
import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';

export const POST = pipe(
  withSentry('/api/path'),
  withCSRF, // BEFORE auth on authenticated endpoints
  withAuth, // or withAdmin for /api/admin/*
)(async (ctx) => {
  // ctx.userId (auth) / ctx.isAdmin (admin)
  return NextResponse.json(data);
});
```

## Hard Rules

- CSRF on ALL mutating routes (POST/PUT/PATCH/DELETE). `withCSRF` BEFORE `withAuth`.
- Admin routes: `withAdmin` + `auditService.log({ action: "VERB_ENTITY", entityType, entityId, adminId })` after mutation.
- Cron routes: `CRON_SECRET` header check, no CSRF/auth.
- Public routes: no CSRF required; still validate input.
- NEVER read auth cookies directly. Use `validateAuth()` / `validateAdminAuth()` / `validateVisitorId()`.
- Input validation at boundary. Zod schemas preferred.
- Prisma parameterized queries only — no raw SQL with interpolation.
- Never log PII (email, name, birthdate) to console/Sentry.
- Error response shape: `{ error: string }`, proper HTTP status.

## Standard Status Codes

200 ok | 201 created | 204 no-content | 400 validation | 401 unauth | 403 forbidden | 404 missing | 409 conflict | 429 rate-limit | 500 server

## Rate limiting

See `src/lib/api/rate-limit.ts`. Apply on anonymous/trial endpoints.

## Tier gating

```ts
import { tierService } from '@/lib/tier/tier-service';
const hasFeature = await tierService.hasFeature(ctx.userId, 'voice');
```

## Tests: unit in `__tests__/`, E2E in project `e2e/` (see `e2e/CLAUDE.md`).
