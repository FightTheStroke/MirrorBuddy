# ADR-0132: Self-Service Password Reset

## Status

Accepted

## Context

Users need a self-service way to reset forgotten passwords without admin intervention.
The system uses internal auth (username/password via Plan 052) with PII-encrypted email storage.

## Decision

Implement a token-based password reset flow:

- **Token**: Cryptographically random, stored hashed, single-use, 1-hour expiry
- **Rate limiting**: Max 3 reset requests per email per hour (429 if exceeded)
- **Security**: Always return 200 on forgot-password (prevent email enumeration)
- **Email delivery**: Via Resend, using localized templates (5 locales)
- **Storage**: `PasswordResetToken` Prisma model with indexes on token, userId, expiresAt
- **Pages**: `/forgot-password` (email form) and `/reset-password?token=` (new password form)
- **Password validation**: Minimum 8 chars, uppercase, lowercase, number

## Consequences

- Users can self-recover without admin support
- Token expiry and single-use prevent replay attacks
- Rate limiting prevents abuse
- Consistent 200 response prevents email enumeration
- Additional Prisma model and two new API routes to maintain
