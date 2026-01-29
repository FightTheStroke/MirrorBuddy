# Cookie Handling - Full Reference

ADR 0075: `docs/adr/0075-cookie-handling-standards.md`

## Cookie Constants

```typescript
import {
  AUTH_COOKIE_NAME, // "mirrorbuddy-user-id"
  AUTH_COOKIE_CLIENT, // "mirrorbuddy-user-id-client"
  VISITOR_COOKIE_NAME, // "mirrorbuddy-visitor-id"
  CSRF_TOKEN_COOKIE, // "csrf-token"
  CSRF_TOKEN_HEADER, // "x-csrf-token"
} from "@/lib/auth/cookie-constants";
```

## Auth Patterns

### User Auth

```typescript
import { validateAuth } from "@/lib/auth/session-auth";
const auth = await validateAuth();
if (!auth.authenticated) {
  return NextResponse.json({ error: auth.error }, { status: 401 });
}
const userId = auth.userId;
```

### Admin Auth

```typescript
import { validateAdminAuth } from "@/lib/auth/session-auth";
const auth = await validateAdminAuth();
if (!auth.authenticated || !auth.isAdmin) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Visitor/Trial

```typescript
import { validateVisitorId } from "@/lib/auth/cookie-constants";
const cookieStore = await cookies();
const visitorId = validateVisitorId(
  cookieStore.get(VISITOR_COOKIE_NAME)?.value,
);
```

## CSRF Protection

Authenticated endpoints: `requireCSRF()` BEFORE `validateAuth()`.
Public endpoints: rate limiting (no CSRF needed).
Client: `csrfFetch()` for mutations.

```typescript
import { requireCSRF } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }
  const auth = await validateAuth();
  // ...
}
```

## Common Mistakes

1. Reading cookies directly instead of using validateAuth()
2. Accepting unvalidated visitor IDs (use validateVisitorId for UUID v4)
3. Missing CSRF on authenticated mutations (check BEFORE auth)

## Verification

```bash
grep -r "mirrorbuddy-user-id" src --include="*.ts" | grep -v "cookie-constants"
grep -r "cookieStore.get.*mirrorbuddy-user-id" src --include="*.ts"
```
