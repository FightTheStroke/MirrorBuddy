# ADR 0161: Login Route CSRF Bypass Threat Model

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-02-28 |
| Context | Login route (`/api/auth/login`) exempted from CSRF |

## Decision

CSRF protection is disabled on the login endpoint because no session exists before authentication.

## Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| Login CSRF (force victim into attacker session) | Medium | SameSite=Lax cookies prevent cross-origin POST |
| Credential stuffing | High | Rate limiting (10 req/min/IP), CAPTCHA on 3rd failure |
| Session fixation | Medium | New session ID generated on successful login |

## Mitigations

1. **SameSite=Lax cookies** — browser won't send cookies on cross-origin POST
2. **Rate limiting** — `RATE_LIMITS.AUTH` (10/min) via `checkRateLimitAsync`
3. **Session regeneration** — fresh session on every login
4. **HTTPS only** — `Secure` flag on all auth cookies in production
5. **Input validation** — Zod schema on email/password fields

## References

- ADR 0075 (auth architecture)
- OWASP Login CSRF: https://owasp.org/www-community/attacks/csrf
