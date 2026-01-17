# CSRF Protection

CSRF (Cross-Site Request Forgery) protection utilities for MirrorBuddy API endpoints.

## Implementation

Located in `src/lib/security/csrf.ts`, implements the **double-submit cookie pattern** for CSRF protection.

## How It Works

1. Server generates a CSRF token using `generateCSRFToken()`
2. Token is sent to client in response (e.g., on page load or session start)
3. Client stores token in both:
   - Cookie: `csrf-token`
   - JavaScript variable (for header)
4. On mutating requests (POST/PUT/DELETE), client includes token in:
   - Cookie: `csrf-token` (sent automatically)
   - Header: `x-csrf-token` (set explicitly)
5. Server validates both match using `requireCSRF(request)`

## Quick Usage

### Basic Protection (Recommended)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireCSRF } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  // Validate CSRF token
  if (!requireCSRF(request)) {
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }

  // Process request...
  return NextResponse.json({ success: true });
}
```

### Token Generation (for initial setup)

```typescript
import { generateCSRFToken, CSRF_TOKEN_COOKIE } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

export async function GET() {
  const token = generateCSRFToken();

  const response = NextResponse.json({ csrfToken: token });

  // Set cookie
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
```

### Client-Side Integration

```typescript
// Get token from initial response
const { csrfToken } = await fetch("/api/session").then((r) => r.json());

// Include in mutating requests
await fetch("/api/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
  },
  body: JSON.stringify(data),
});
```

## API Reference

### `generateCSRFToken(): string`

Generates a cryptographically secure CSRF token (32 bytes, base64url encoded).

```typescript
const token = generateCSRFToken();
// Returns: "rQj8k9x2LmP4wNvZ6YtA3bCdE5fGhI7jKlMnOpQrS8u"
```

### `requireCSRF(request: NextRequest): boolean`

Validates CSRF token using double-submit cookie pattern. Use this in API routes.

```typescript
if (!requireCSRF(request)) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

### `validateCSRFToken(request: NextRequest, expectedToken: string): boolean`

Validates token from header against expected value. For custom validation logic.

```typescript
const isValid = validateCSRFToken(request, storedToken);
```

### `validateCSRFTokenFromCookie(request: NextRequest): boolean`

Validates token from header matches token in cookie (double-submit pattern).

```typescript
const isValid = validateCSRFTokenFromCookie(request);
```

### `getCSRFTokenFromCookie(request: NextRequest): string | null`

Extracts CSRF token from cookie.

```typescript
const token = getCSRFTokenFromCookie(request);
```

## Constants

- `CSRF_TOKEN_HEADER = "x-csrf-token"` - HTTP header name
- `CSRF_TOKEN_COOKIE = "csrf-token"` - Cookie name

## Security Features

### Cryptographic Strength

- Uses Node.js `crypto.randomBytes(32)` for token generation
- 32 bytes (256 bits) of entropy
- Base64url encoding (URL-safe, no padding)

### Timing Attack Protection

- Uses `crypto.timingSafeEqual()` for token comparison
- Prevents timing-based side-channel attacks

### Double-Submit Pattern

- Token required in both cookie AND header
- Prevents CSRF attacks because:
  - Attacker can set cookie but can't read it (SameSite)
  - Attacker can't forge header without knowing token value

## When to Apply

Apply CSRF protection to ALL mutating endpoints:

- ✅ POST requests (create)
- ✅ PUT requests (update)
- ✅ PATCH requests (partial update)
- ✅ DELETE requests (remove)
- ❌ GET requests (read-only, no protection needed)

## Integration Examples

### Session Initialization

```typescript
// src/app/api/session/route.ts
export async function GET() {
  const token = generateCSRFToken();
  const response = NextResponse.json({ csrfToken: token });

  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
```

### Protected API Route

```typescript
// src/app/api/data/route.ts
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const data = await request.json();
  // Process...
  return NextResponse.json({ success: true });
}
```

## Testing

Comprehensive test suite in `src/lib/security/__tests__/csrf.test.ts`:

- Token generation (uniqueness, format, length)
- Validation (matching, mismatched, missing)
- Cookie extraction
- Double-submit pattern
- Integration scenarios
- Security properties (timing-safe, attack prevention)

Run tests:

```bash
npm run test:unit -- src/lib/security/__tests__/csrf.test.ts
```

## Roadmap

Current implementation provides utilities only. Future integration tasks:

1. Add CSRF middleware for automatic protection
2. Integrate with session management
3. Add CSRF token to all mutating API routes
4. Update client-side fetch utilities to include token
5. Add token refresh mechanism for long-lived sessions

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
