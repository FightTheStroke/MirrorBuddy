# CSRF Protection

MirrorBuddy implements CSRF protection through multiple layers.

## Implementation

### 1. Double-Submit Cookie Pattern (Primary)

All mutating endpoints (POST/PUT/PATCH/DELETE) require CSRF token validation:

```typescript
// Token endpoint: GET /api/session
import { generateCSRFToken, CSRF_TOKEN_COOKIE } from "@/lib/security/csrf";

export async function GET() {
  const csrfToken = generateCSRFToken();
  const response = NextResponse.json({ csrfToken });
  response.cookies.set(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 60, // 30 minutes
  });
  return response;
}
```

**Client usage:**

```typescript
// 1. Fetch token before mutations
const { csrfToken } = await fetch("/api/session").then((r) => r.json());

// 2. Include in mutation requests
fetch("/api/resource", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  },
  body: JSON.stringify(data),
});
```

### 2. Endpoint Enforcement

All API routes validate CSRF tokens:

```typescript
// Pattern used in all protected endpoints
import { requireCSRF } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // Process request...
}
```

**Protected endpoints:**

- `/api/chat/*` - Chat and streaming
- `/api/conversations/*` - Conversation management
- `/api/profile/*` - User profile
- `/api/materials/*` - Learning materials
- `/api/tools/*` - Educational tools
- `/api/push/*` - Push notifications
- `/api/gamification/*` - XP and achievements
- All other mutating endpoints

### 3. SameSite Cookie Attribute (Defense in Depth)

Authentication cookies use `SameSite=lax`:

```typescript
cookieStore.set("mirrorbuddy-user-id", signedCookie.signed, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
});
```

### 4. Signed Cookies

Session cookies are cryptographically signed using HMAC-SHA256:

```typescript
// src/lib/auth/cookie-signing.ts
export function signCookieValue(value: string): { signed: string } {
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(value)
    .digest("base64url");
  return { signed: `${value}.${signature}` };
}
```

## Token Flow

```
1. Page Load
   Client ──GET /api/session──> Server
   Client <──{ csrfToken }──── Server (also sets httpOnly cookie)

2. Mutation Request
   Client ──POST /api/resource──> Server
           Headers: X-CSRF-Token: {token}

3. Server Validation
   Server compares header token with cookie token
   Match → Process request
   Mismatch → 403 Forbidden
```

## OAuth CSRF Protection

Google OAuth flow uses state parameter for CSRF:

```typescript
// src/lib/google/oauth.ts
export function generateAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(32).toString("base64url");
  // State is verified on callback
}
```

## Security Considerations

### Token Timing

- Tokens expire after 30 minutes
- Client should refresh on 403 response

### Why Double-Submit Cookie?

- Stateless: No server-side token storage needed
- Simple: No session infrastructure required
- Secure: httpOnly cookie + header comparison

## Verification

To verify CSRF protection:

1. **Token generation**: `GET /api/session` returns token + sets cookie
2. **Enforcement**: POST without token returns 403
3. **Cookie attributes**: Check browser DevTools > Application > Cookies
4. **Cross-origin test**: Attempt POST from different origin (should fail)

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
- [ADR-0047](../adr/0047-security-hardening-plan17.md)
