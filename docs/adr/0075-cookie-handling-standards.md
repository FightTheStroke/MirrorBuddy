# ADR 0075: Cookie Handling Standards

## Status

Accepted

## Date

2026-01-25

## Context

MirrorBuddy experienced production 401/403/500 errors due to inconsistent cookie handling across the codebase:

1. **Visitor ID validation mismatch**: Proxy validated UUID v4 format, but API routes accepted ANY value
2. **Signed cookie verification inconsistent**: Some routes verified signatures, others didn't
3. **Duplicate constants**: Cookie names defined in multiple files
4. **Mixed patterns**: Some routes used `validateAuth()`, others read cookies directly

This caused:

- 401 on `/api/auth/login` - CSRF or cookie issues
- 403 on `/api/onboarding` and `/api/tos` - CSRF validation failures
- 500 on `/api/user/consent` - Missing import after refactor (cookies() not imported)

## Decision

### 1. Centralized Cookie Constants

All cookie names MUST be defined in `src/lib/auth/cookie-constants.ts`:

```typescript
// Authentication (httpOnly, signed)
export const AUTH_COOKIE_NAME = "mirrorbuddy-user-id";
export const AUTH_COOKIE_CLIENT = "mirrorbuddy-user-id-client";
export const LEGACY_AUTH_COOKIE = "convergio-user-id";

// Trial (httpOnly)
export const VISITOR_COOKIE_NAME = "mirrorbuddy-visitor-id";

// Admin (httpOnly, signed)
export const SIMULATED_TIER_COOKIE = "mirrorbuddy-simulated-tier";
export const ADMIN_COOKIE_NAME = "mirrorbuddy-admin";

// CSRF (httpOnly)
export const CSRF_TOKEN_COOKIE = "csrf-token";
export const CSRF_TOKEN_HEADER = "x-csrf-token";
```

### 2. Mandatory Validation

#### User Authentication

**ALWAYS** use `validateAuth()` from `src/lib/auth/session-auth.ts`:

```typescript
// CORRECT
const auth = await validateAuth();
if (!auth.authenticated) {
  return NextResponse.json({ error: auth.error }, { status: 401 });
}
const userId = auth.userId;

// WRONG - Never read cookies directly for auth
const cookieStore = await cookies();
const userId = cookieStore.get("mirrorbuddy-user-id")?.value;
```

#### Visitor ID

**ALWAYS** validate as UUID v4 using helpers:

```typescript
import { validateVisitorId } from "@/lib/auth/cookie-constants";

// CORRECT
const visitorId = validateVisitorId(cookie?.value);
if (!visitorId) {
  return NextResponse.json({ error: "Invalid visitor" }, { status: 401 });
}

// WRONG - Accepts any value
const visitorId = cookie?.value;
```

### 3. Cookie Security Properties

| Cookie                     | httpOnly | Signed            | Validation                 |
| -------------------------- | -------- | ----------------- | -------------------------- |
| mirrorbuddy-user-id        | YES      | YES (HMAC-SHA256) | verifyCookieValue()        |
| mirrorbuddy-user-id-client | NO       | NO                | None (client display only) |
| mirrorbuddy-visitor-id     | YES      | NO                | UUID v4 format             |
| csrf-token                 | YES      | NO                | Double-submit pattern      |
| mirrorbuddy-consent        | NO       | NO                | None (client-side)         |
| mirrorbuddy-a11y           | NO       | NO                | JSON parse validation      |

### 4. CSRF Protection Pattern

#### When CSRF Protection is Required

Per [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), CSRF exploits **authenticated sessions**. Protection requirements depend on endpoint type:

| Endpoint Type                              | Server `requireCSRF()` | Client `csrfFetch()` | Rationale                                        |
| ------------------------------------------ | ---------------------- | -------------------- | ------------------------------------------------ |
| **Authenticated** (user session)           | ✓ Required             | ✓ Required           | Session cookie can be exploited                  |
| **Public** (no session, e.g. contact form) | ✗ Not needed           | Optional             | No session to exploit; use rate limiting instead |
| **Cron jobs**                              | ✗ Not needed           | N/A                  | Use `CRON_SECRET` header validation              |
| **Login/Logout**                           | ✗ Not needed           | Optional             | Pre-session; use rate limiting                   |

#### Authenticated Endpoints (Session-Based)

```typescript
import { requireCSRF } from "@/lib/security/csrf";
import { validateAuth } from "@/lib/auth/session-auth";

export async function POST(request: NextRequest) {
  // CSRF check first (before reading body)
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // Then auth check
  const auth = await validateAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // ... rest of handler
}
```

#### Public Endpoints (No Authentication)

For endpoints like contact forms that don't create or use sessions:

```typescript
// Server: NO requireCSRF() needed - no session to protect
export async function POST(request: NextRequest) {
  // Rate limiting is the primary protection
  const rateLimitResult = await checkRateLimitAsync(...);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // Input validation, enum checks, length limits
  // ... rest of handler
}
```

```typescript
// Client: csrfFetch() optional but harmless for consistency
import { csrfFetch } from "@/lib/auth/csrf-client";

await csrfFetch("/api/contact", {
  method: "POST",
  body: JSON.stringify(data),
});
```

#### Cron Job Endpoints

```typescript
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
}
```

### 5. Cookie Writing Pattern

Use consistent options for security:

```typescript
import {
  AUTH_COOKIE_NAME,
  SECURE_COOKIE_OPTIONS,
  SESSION_MAX_AGE,
} from "@/lib/auth/cookie-constants";
import { signCookieValue } from "@/lib/auth/cookie-signing";

// Sign the value
const signed = signCookieValue(userId);

// Set with secure options
response.cookies.set(AUTH_COOKIE_NAME, signed.signed, {
  ...SECURE_COOKIE_OPTIONS,
  maxAge: SESSION_MAX_AGE,
});
```

## ESLint Enforcement

Cookie name hardcoding is blocked by ESLint rule in `eslint.config.mjs`:

```javascript
// ADR 0075: Block hardcoded cookie names
{
  files: ["src/**/*.ts", "src/**/*.tsx"],
  ignores: [
    "src/lib/auth/cookie-constants.ts", // Source of truth
    "src/lib/storage/migrate-session-key.ts", // sessionStorage migration
    "src/app/cookies/content.tsx", // Documentation page
    "**/*.test.ts", "**/*.test.tsx", "**/__tests__/**",
  ],
  rules: {
    "no-restricted-syntax": ["error",
      { selector: "Literal[value='mirrorbuddy-user-id']", message: "Use AUTH_COOKIE_NAME..." },
      { selector: "Literal[value='mirrorbuddy-visitor-id']", message: "Use VISITOR_COOKIE_NAME..." },
      // ... all cookie names
    ]
  }
}
```

**CI blocks** any PR with hardcoded cookie names.

## Consequences

### Positive

- Single source of truth for cookie names
- Consistent validation across all routes
- Type safety via exported constants
- Clear security boundaries
- **ESLint prevents regression** - CI blocks hardcoded names

### Negative

- Existing code needs migration to use constants
- Additional import required in each file

### Migration

Routes that need updating to use `validateAuth()` instead of direct cookie access:

- ✅ `/api/user/consent` - Fixed
- `/api/telemetry/activity` - Uses visitor ID only, OK
- All trial routes - Now use validated visitor ID

## Related

- ADR 0013: Cryptographically Signed Session Cookies
- ADR 0056: Trial Mode Implementation
- Issue #83-#86: Session authentication fixes
