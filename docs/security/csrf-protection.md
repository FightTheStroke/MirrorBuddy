# CSRF Protection

MirrorBuddy implements CSRF protection through multiple layers.

## Implementation

### 1. SameSite Cookie Attribute

All authentication cookies use `SameSite=lax`:

```typescript
// src/app/api/user/route.ts
cookieStore.set('mirrorbuddy-user-id', signedCookie.signed, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',  // Blocks cross-origin POST/PUT/DELETE with cookies
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
});
```

**What SameSite=lax provides:**
- Blocks cookies on cross-origin POST/PUT/DELETE requests
- Allows cookies on top-level navigations (GET requests from links)
- Effectively prevents CSRF for state-changing operations

### 2. Authentication Requirement

All state-changing API endpoints require authentication:

```typescript
// Pattern used in all protected endpoints
const auth = await validateAuth();
if (!auth.authenticated) {
  return NextResponse.json({ error: auth.error }, { status: 401 });
}
```

### 3. Signed Cookies

Session cookies are cryptographically signed using HMAC-SHA256:

```typescript
// src/lib/auth/cookie-signing.ts
export function signCookieValue(value: string): { signed: string } {
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(value)
    .digest('base64url');
  return { signed: `${value}.${signature}` };
}
```

## OAuth CSRF Protection

Google OAuth flow uses state parameter for CSRF:

```typescript
// src/lib/google/oauth.ts
export function generateAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(32).toString('base64url');
  // State is verified on callback
}
```

## Security Considerations

### Why Not SameSite=strict?

`SameSite=strict` would break legitimate flows:
- Links from emails to app would require re-authentication
- Bookmarks would lose session on first click

### Why No CSRF Tokens?

For MirrorBuddy's use case (single-user educational app):
- `SameSite=lax` provides sufficient protection
- Token management adds complexity without significant security benefit
- Modern browsers enforce SameSite by default

## Verification

To verify CSRF protection:

1. **Cookie attributes**: Check browser DevTools > Application > Cookies
2. **Cross-origin test**: Attempt POST from different origin (should fail)
3. **OAuth state**: Check state parameter is verified on callback

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
