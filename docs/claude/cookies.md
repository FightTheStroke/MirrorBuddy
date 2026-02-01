# Cookie Handling

> Centralized cookie management with HMAC-signed auth and CSRF double-submit pattern

## Quick Reference

| Key         | Value                              |
| ----------- | ---------------------------------- |
| Constants   | `src/lib/auth/cookie-constants.ts` |
| Auth        | `src/lib/auth/session-auth.ts`     |
| Signing     | `src/lib/auth/cookie-signing.ts`   |
| CSRF server | `src/lib/security/csrf.ts`         |
| CSRF client | `src/lib/auth/csrf-client.ts`      |
| ADR         | 0075                               |

## Cookie Inventory

| Cookie                     | httpOnly | Signed | MaxAge  | Purpose           |
| -------------------------- | -------- | ------ | ------- | ----------------- |
| mirrorbuddy-user-id        | Yes      | HMAC   | 7 days  | Server auth       |
| mirrorbuddy-user-id-client | No       | No     | 7 days  | Client display    |
| mirrorbuddy-visitor-id     | Yes      | No     | 30 days | Trial tracking    |
| mirrorbuddy-simulated-tier | Yes      | HMAC   | session | Admin tier sim    |
| mirrorbuddy-admin          | Yes      | No     | session | Admin flag        |
| csrf-token                 | Yes      | No     | 30 min  | CSRF protection   |
| mirrorbuddy-consent        | No       | No     | 1 year  | Cookie consent UI |
| mirrorbuddy-a11y           | No       | No     | 90 days | A11y preferences  |
| mirrorbuddy-theme          | No       | No     | 1 year  | Theme preference  |

## Auth Flow (pipe middleware)

```typescript
// Authenticated endpoint — withAuth adds ctx.userId
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/resource"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!; // Set by withAuth middleware
  // ...business logic...
});

// Admin-only endpoint — withAdmin adds ctx.userId + ctx.isAdmin
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";

export const POST = pipe(
  withSentry("/api/admin/resource"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // ctx.userId and ctx.isAdmin guaranteed by withAdmin
});
```

## Cookie Signing (HMAC-SHA256)

Auth cookies are cryptographically signed using SESSION_SECRET. Unsigned cookies are rejected.
Format: `{value}.{signature}` where signature = HMAC-SHA256(value, SESSION_SECRET).

## CSRF Double-Submit Pattern

```typescript
// Server: withCSRF middleware validates CSRF before auth
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";

export const POST = pipe(
  withSentry("/api/resource"),
  withCSRF, // Validates CSRF token automatically
  withAuth,
)(async (ctx) => {
  // CSRF already validated by middleware
});

// Client: use csrfFetch for all mutations
import { csrfFetch } from "@/lib/auth/csrf-client";
const res = await csrfFetch("/api/resource", {
  method: "POST",
  body: JSON.stringify(data),
});
// Auto-fetches token from /api/session, caches in memory, retries on 403
```

## Visitor/Trial Tracking

```typescript
import {
  validateVisitorId,
  VISITOR_COOKIE_NAME,
} from "@/lib/auth/cookie-constants";
const visitorId = validateVisitorId(cookieValue); // Returns UUID or null
```

Visitor IDs are validated as UUID v4 format to prevent trivial forgery.

## NEVER Do

- Hardcode cookie names (always import from `cookie-constants.ts`)
- Read auth cookies directly with `cookieStore.get()` (use `validateAuth()`)
- Trust userId from query params or request body
- Skip CSRF on authenticated mutation endpoints

## See Also

- `src/lib/auth/cookie-constants.ts` - All cookie names and config
- ADR 0075 - Cookie handling standards
- `docs/security/csrf-protection.md` - CSRF implementation details
