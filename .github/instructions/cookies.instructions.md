---
description: 'Cookie handling, auth patterns, and CSRF rules'
applyTo: 'src/lib/auth/**/*.ts,src/app/api/**/*.ts'
---

# Cookie & Auth

## Cookie Constants

ALWAYS import from `src/lib/auth/cookie-constants.ts` — NEVER hardcode

## Auth

User: `validateAuth()` | Admin: `validateAdminAuth()` | Visitor: `validateVisitorId()`
NEVER read cookies directly with `cookieStore.get()`

## CSRF

Server: `requireCSRF(request)` BEFORE auth | Client: `csrfFetch()` for mutations | Skip: public endpoints, CRON_SECRET

## Security

httpOnly+Signed: `mirrorbuddy-user-id` | httpOnly: `csrf-token`, `mirrorbuddy-visitor-id` | Client: `mirrorbuddy-user-id-client`, `mirrorbuddy-consent`, `mirrorbuddy-a11y`

Reference: ADR 0075

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
