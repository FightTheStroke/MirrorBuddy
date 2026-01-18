# ADR 0055: Internal Auth System for Beta Access

## Status
Accepted

## Date
2026-01-18

## Context

MirrorBuddy is transitioning from cookie-only session IDs to authenticated username/password access. Beta phase requires:
- Internal authentication without external OAuth (Google, Microsoft)
- Admin panel to manage beta user access
- Secure password handling
- Session management with configurable duration

Current system uses unsigned sessions; security requires upgrade.

## Decision

**Implement internal username/password authentication with bcrypt hashing and HMAC-signed cookies.**

### Authentication Strategy

- **Password Hashing**: bcrypt (12 rounds)
  - Reason: Ecosystem maturity, proven security, resistant to GPU attacks, intentionally slow
- **Session Storage**: Signed cookies (HMAC-SHA256)
  - Reason: Stateless, no server DB overhead, simpler than JWT for session invalidation
- **Session Duration**: 7 days with sliding window
  - Reason: Balance security (7d acceptable for beta) with UX (refresh on activity)
- **Admin Panel**: Restricted `/admin` route to manage beta access
  - Reason: Non-technical admins need UI to enable/disable users

### Implementation

```typescript
// Password hashing
const hash = await bcrypt.hash(password, 12)
const valid = await bcrypt.compare(password, hash)

// Session signing
const sessionToken = HMAC_SHA256(userId + timestamp, SESSION_SECRET)
res.cookie('session', sessionToken, {
  httpOnly: true,
  secure: true,   // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
})

// Sliding window: refresh on request if session < 1 day old
if (sessionAge > 6 * 24 * 60 * 60 * 1000) {
  // Reissue session cookie
}
```

### Admin Panel

- List all beta users (username, email, status, created_at)
- Enable/disable user access
- Reset passwords (send reset link)
- Audit log of access changes

## Alternatives Considered

### OAuth (Google, Microsoft)
- **Pros**: Offload auth, user familiarity
- **Cons**: Complexity for beta, external dependency, requires TLS/HTTPS, slower onboarding

### Argon2 or Scrypt
- **Pros**: Stronger against GPU attacks
- **Cons**: Newer, smaller ecosystem, slower implementations

### JWT with server-side blocklist
- **Pros**: Distributed, no session storage
- **Cons**: Logout requires blocklist DB, token revocation complexity

## Consequences

### Positive
- **No external dependencies**: Auth fully under control
- **Simple deployment**: No OAuth secrets to manage
- **Faster beta onboarding**: Admin creates users directly
- **Full audit trail**: Track all access changes
- **Reversible**: Easy to upgrade to OAuth later

### Negative
- **Password management**: Users must remember credentials (mitigate with reset flow)
- **Server-side state**: Session cookies require validation on each request
- **No federation**: Can't use existing social logins
- **Manual user provisioning**: Admin overhead (acceptable for beta scale)

### Mitigations
- Session validation is fast (HMAC check)
- Sliding window prevents frequent re-auth
- Admin UI simplifies user management
- Upgrade to OAuth when scale demands

## Related

- ADR 0052: Vercel Deployment Configuration (environment variables for SESSION_SECRET)
- ADR 0001: Session auth implementation (`src/lib/session-auth.ts`)
- Wave 6: Beta access control implementation
