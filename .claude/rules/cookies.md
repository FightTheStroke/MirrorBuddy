# Cookie Rules - MirrorBuddy

## Cookie Constants (MANDATORY)

ALWAYS import from `src/lib/auth/cookie-constants.ts`. NEVER hardcode cookie names.

## Auth Patterns

- **User auth**: `validateAuth()` from `@/lib/auth/session-auth` (handles cookies internally)
- **Admin auth**: `validateAdminAuth()` from same module
- **Visitor/Trial**: `validateVisitorId()` from `@/lib/auth/cookie-constants`
- **NEVER** read auth cookies directly with `cookieStore.get()`

## CSRF (POST/PUT/PATCH/DELETE)

| Endpoint Type | Server `requireCSRF()` | Client `csrfFetch()` |
| ------------- | ---------------------- | -------------------- |
| Authenticated | Required               | Required             |
| Public        | Not needed             | Optional             |
| Cron jobs     | Not needed             | N/A (CRON_SECRET)    |

CSRF check BEFORE auth on authenticated endpoints.

## Cookie Security

| Cookie                     | httpOnly | Signed | Purpose         |
| -------------------------- | -------- | ------ | --------------- |
| mirrorbuddy-user-id        | YES      | YES    | Server auth     |
| mirrorbuddy-user-id-client | NO       | NO     | Client display  |
| mirrorbuddy-visitor-id     | YES      | NO     | Trial tracking  |
| csrf-token                 | YES      | NO     | CSRF protection |
| mirrorbuddy-consent        | NO       | NO     | Client consent  |
| mirrorbuddy-a11y           | NO       | NO     | Accessibility   |

## ADR 0075 | Full reference: `@docs/claude/cookies.md`
