---
description: 'Cookie handling, auth patterns, and CSRF rules'
applyTo: 'src/lib/auth/**/*.ts,src/app/api/**/*.ts'
---

# Cookie & Auth Rules

## Cookie Constants (MANDATORY)

ALWAYS import from `src/lib/auth/cookie-constants.ts`. NEVER hardcode cookie names.

## Auth Patterns

| Need          | Function              | Module                        |
| ------------- | --------------------- | ----------------------------- |
| User auth     | `validateAuth()`      | `@/lib/auth/session-auth`     |
| Admin auth    | `validateAdminAuth()` | `@/lib/auth/session-auth`     |
| Visitor/Trial | `validateVisitorId()` | `@/lib/auth/cookie-constants` |

NEVER read auth cookies directly with `cookieStore.get()`.

## CSRF (POST/PUT/PATCH/DELETE)

- Server: `requireCSRF(request)` — check BEFORE auth
- Client: use `csrfFetch()` for all mutation requests
- Public endpoints and cron jobs (CRON_SECRET) skip CSRF

## Cookie Security

| Cookie                     | httpOnly | Signed | Purpose         |
| -------------------------- | -------- | ------ | --------------- |
| mirrorbuddy-user-id        | YES      | YES    | Server auth     |
| mirrorbuddy-user-id-client | NO       | NO     | Client display  |
| mirrorbuddy-visitor-id     | YES      | NO     | Trial tracking  |
| csrf-token                 | YES      | NO     | CSRF protection |
| mirrorbuddy-consent        | NO       | NO     | Cookie consent  |
| mirrorbuddy-a11y           | NO       | NO     | Accessibility   |

Reference: ADR 0075
