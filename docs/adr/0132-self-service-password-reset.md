# ADR-0132: Self-Service Password Reset Flow

**Status:** Accepted
**Date:** 2026-02-07
**Context:** Plan 125 WF-Documentation

## Decision

Implement a self-service password reset flow with time-limited reset tokens, secure token generation, and email delivery via Resend. Rate limiting applied to prevent abuse.

## Rationale

- Users cannot recover accounts without password reset capability
- Time-limited tokens (1 hour expiry) reduce security window for compromised tokens
- Single-use tokens prevent token reuse attacks
- Hashed token storage in database prevents unauthorized reset even if DB is compromised
- Resend email service ensures reliable delivery with tracking
- Rate limiting (3 requests per email per hour) prevents abuse and brute-force attempts

## Implementation

### Token Flow

1. User submits email via forgot-password form
2. Backend generates secure random token (256-bit using `crypto.randomBytes`)
3. Hash token using bcrypt (same as password hashing)
4. Store `{ hashedToken, email, expiresAt: now + 1h, used: false }` in ResetToken table
5. Email reset link: `https://app.com/reset?token={plainToken}` via Resend
6. User clicks link, submits new password with token
7. Backend verifies token: hash provided token, lookup match, check expiry and `used` flag
8. On success: clear token by setting `used = true`

### Database Schema

```sql
ResetToken {
  id: String @id @default(cuid())
  email: String @index
  hashedToken: String @unique
  expiresAt: DateTime
  used: Boolean @default(false)
  createdAt: DateTime @default(now())
}
```

### Rate Limiting

- Redis-backed counter: `rate:password-reset:{email}`
- Max 3 requests per email per hour
- Return 429 with friendly message if limit exceeded
- Counter auto-expires after 1 hour

### Email Template

Subject: Reset your MirrorBuddy password

- Plain text reset link (no click tracking required)
- Direct plain token in URL (no encoding tricks)
- 1-hour expiry notice
- Support contact link

## Key Patterns

- Tokens never logged or exposed in error messages
- Token hash immediately upon generation (never stored plaintext)
- Single-use flag prevents replay attacks
- Resend handles bounce/complaint feedback automatically
- Email validation not required for reset request (public knowledge)
- No "forgot password" enumeration (always say "check your email")

## Consequences

- Improved user experience (self-service recovery vs support tickets)
- Security risk mitigated by time/hash/single-use triple lock
- Email delivery dependency (Resend reliability critical)
- Support burden reduced but user must have email access
