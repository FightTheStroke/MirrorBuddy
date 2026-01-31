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

## Auth Flow (Session-Based)

```typescript
// Server: validate authenticated user
import { validateAuth, validateAdminAuth } from "@/lib/auth/session-auth";

const auth = await validateAuth();
if (!auth.authenticated)
  return NextResponse.json({ error: auth.error }, { status: 401 });
const userId = auth.userId; // NEVER trust userId from request body

// Admin-only endpoints
const admin = await validateAdminAuth();
if (!admin.isAdmin)
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// Convenience helper (returns errorResponse if not authenticated)
const { userId, errorResponse } = await requireAuthenticatedUser();
if (errorResponse) return errorResponse;
```

## Cookie Signing (HMAC-SHA256)

Auth cookies are cryptographically signed using SESSION_SECRET. Unsigned cookies are rejected.
Format: `{value}.{signature}` where signature = HMAC-SHA256(value, SESSION_SECRET).

## CSRF Double-Submit Pattern

```typescript
// Server: validate on POST/PUT/PATCH/DELETE (BEFORE auth check)
import { requireCSRF } from "@/lib/security/csrf";
if (!requireCSRF(request)) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}

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
