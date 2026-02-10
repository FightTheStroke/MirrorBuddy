# ADR 0143: SSO OIDC Security Hardening

Status: Accepted | Date: 10 Feb 2026 | Plan: 143

## Context

Security audit of SSO/OIDC integration revealed: ID tokens decoded without signature verification, role determination based on email substrings allowing privilege escalation, and production secrets falling back to hardcoded dev values.

## Decision

1. **JWKS verification** (jose): `verifyIdToken()` validates signature, issuer, audience, nonce via `createRemoteJWKSet` + `jwtVerify`. Replaces unsafe `decodeJWT()`.
2. **emailHash lookup**: SSO callback uses `findFirst` with `OR: [emailHash, email]` matching login route pattern (ADR 0129 PII encryption).
3. **Role hardening**: Removed `determineRole()`; new SSO users always get `USER`. Only DB-stored roles are trusted (ADR 0075).
4. **Dev-secret fail-fast**: `getStateSecret()` throws in production if `OAUTH_STATE_SECRET`/`COOKIE_SECRET` missing.

## Consequences

- Positive: Tokens cryptographically verified; no privilege escalation via email; PII-encrypted users found via SSO
- Negative: `jose` added as dependency (~30KB); JWKS endpoint latency on first verification (cached by jose)

## Enforcement

- Rule: `grep -q 'verifyIdToken' src/lib/auth/sso/google-workspace.ts`
- Check: `npx vitest run src/lib/auth/sso/`
