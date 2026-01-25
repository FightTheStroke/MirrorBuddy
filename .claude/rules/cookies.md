# Cookie Handling Rules - MirrorBuddy

## ADR Reference

Full details: `docs/adr/0075-cookie-handling-standards.md`

## Cookie Constants (MANDATORY)

**ALWAYS** import from `src/lib/auth/cookie-constants.ts`:

```typescript
import {
  AUTH_COOKIE_NAME, // "mirrorbuddy-user-id"
  AUTH_COOKIE_CLIENT, // "mirrorbuddy-user-id-client"
  VISITOR_COOKIE_NAME, // "mirrorbuddy-visitor-id"
  CSRF_TOKEN_COOKIE, // "csrf-token"
  CSRF_TOKEN_HEADER, // "x-csrf-token"
} from "@/lib/auth/cookie-constants";
```

**NEVER** hardcode cookie names as strings.

## Authentication Pattern

### For User Auth (Protected Routes)

```typescript
// CORRECT - Always use validateAuth()
import { validateAuth } from "@/lib/auth/session-auth";

const auth = await validateAuth();
if (!auth.authenticated) {
  return NextResponse.json({ error: auth.error }, { status: 401 });
}
const userId = auth.userId;

// WRONG - Never read auth cookies directly
const cookieStore = await cookies();
const userId = cookieStore.get("mirrorbuddy-user-id")?.value; // NO!
```

### For Admin Auth

```typescript
import { validateAdminAuth } from "@/lib/auth/session-auth";

const auth = await validateAdminAuth();
if (!auth.authenticated || !auth.isAdmin) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### For Visitor/Trial Sessions

```typescript
import { validateVisitorId } from "@/lib/auth/cookie-constants";

const cookieStore = await cookies();
const visitorId = validateVisitorId(
  cookieStore.get(VISITOR_COOKIE_NAME)?.value,
);

if (!visitorId) {
  return NextResponse.json({ error: "Invalid visitor" }, { status: 401 });
}
```

## CSRF Protection (POST/PUT/PATCH/DELETE)

### Server-Side

```typescript
import { requireCSRF } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // ... handler
}
```

### Client-Side

```typescript
import { csrfFetch } from "@/lib/auth/csrf-client";

// All mutations MUST use csrfFetch
await csrfFetch("/api/resource", {
  method: "POST",
  body: JSON.stringify(data),
});
```

## Cookie Security Matrix

| Cookie                     | httpOnly | Signed | Where Used      |
| -------------------------- | -------- | ------ | --------------- |
| mirrorbuddy-user-id        | YES      | YES    | Server auth     |
| mirrorbuddy-user-id-client | NO       | NO     | Client display  |
| mirrorbuddy-visitor-id     | YES      | NO     | Trial tracking  |
| csrf-token                 | YES      | NO     | CSRF protection |
| mirrorbuddy-consent        | NO       | NO     | Client consent  |
| mirrorbuddy-a11y           | NO       | NO     | Accessibility   |

## Common Mistakes

### 1. Missing Import After Refactor

```typescript
// WRONG - cookies() not imported after removing for validateAuth
export async function GET() {
  const cookieStore = await cookies(); // ReferenceError!
}

// CORRECT - Use validateAuth which handles cookies internally
const auth = await validateAuth();
```

### 2. Accepting Invalid Visitor ID

```typescript
// WRONG - Accepts any string
const visitorId = cookie?.value;

// CORRECT - Validates UUID v4 format
const visitorId = validateVisitorId(cookie?.value);
```

### 3. Missing CSRF on Mutations

```typescript
// WRONG - No CSRF check
export async function POST(request: NextRequest) {
  const data = await request.json();
  // ...
}

// CORRECT - CSRF check first
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }
  const data = await request.json();
  // ...
}
```

## Verification

```bash
# Check for hardcoded cookie names
grep -r "mirrorbuddy-user-id" src --include="*.ts" | grep -v "cookie-constants"

# Check for direct cookie reads without validateAuth
grep -r "cookieStore.get.*mirrorbuddy-user-id" src --include="*.ts"
```
