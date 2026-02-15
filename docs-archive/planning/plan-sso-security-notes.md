# Plan 143 — SSO OIDC Security Hardening Notes

## Wave 1: Quick Fixes

### emailHash lookup (F-01)

- SSO callback was using `findUnique({ where: { email } })` which misses PII-encrypted users
- Fixed to `findFirst({ where: { OR: [{ emailHash }, { email }] } })` matching login route pattern
- Import `hashPII` from `@/lib/security`

### Role determination removal (F-03)

- `determineRole()` granted ADMIN based on email substrings (`admin`, `dirigente`) — privilege escalation risk
- Removed entirely; new SSO users always get `USER` role
- Existing users preserve their DB role on re-login

### OAuth dev-secret (F-05)

- `STATE_SECRET` fell back to `'dev-secret-change-in-production'` if env vars missing
- Now throws in `NODE_ENV === 'production'`; fallback only in development

## Wave 2: OIDC Verification

### JWKS token verification (F-02)

- Added `verifyIdToken()` using jose's `createRemoteJWKSet` + `jwtVerify`
- Replaces unsafe `decodeJWT()` (now marked @deprecated) in both providers
- Validates signature, issuer, audience, and optional nonce

### Nonce validation (F-04)

- Added `nonce` to `CallbackParams` interface
- Both callback routes now pass `session.nonce` to provider
- Nonce mismatch throws `TokenValidationError`
