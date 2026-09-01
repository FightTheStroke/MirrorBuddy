# ADR 0150: Production Smoke Testing Strategy

Status: Accepted | Date: 15 Feb 2026

## Context

MirrorBuddy is deployed on Vercel at `mirrorbuddy.org`. We needed a way to validate production deployments without leaving traces in the database or affecting real users. Manual testing is slow and error-prone, and we had no automated production validation until now.

## Decision

We created a dedicated Playwright-based production smoke test suite that:

1. **Runs against the live production URL** (configurable via `PROD_URL` env var)
2. **Does not create, modify, or delete learning data** — shared authenticated
   coverage uses locally signed storage state for a dedicated `isTestData` account
3. **Uses client-side mocks** to bypass consent walls without touching the server
4. **Covers 22 test areas** across the desktop and mobile production profiles

### Test Suite Structure

```
e2e/production-smoke/
├── fixtures.ts                    # Base fixture with consent wall bypasses
├── 00-config.spec.ts              # Browser artifact and channel safety
├── 00-routing.spec.ts             # Anonymous and authenticated route contracts
├── 01-infrastructure.spec.ts      # API health, CSP headers, static assets
├── 02-welcome.spec.ts             # Landing page, UI elements
├── 03-chat.spec.ts                # Chat interface accessibility
├── 04-accessibility.spec.ts       # WCAG, ARIA, accessibility profiles
├── 05-compliance.spec.ts          # Privacy, terms, ai-transparency pages
├── 06-i18n.spec.ts                # 5 locale support, language switching
├── 07-admin.spec.ts               # Admin login, ADMIN_READONLY role validation
├── 08-navigation.spec.ts          # Core navigation flows
├── 09-tools.spec.ts               # Educational tools (flashcards, mind maps, quizzes)
├── 10-rag-search.spec.ts          # RAG semantic search
├── 11-conversation-memory.spec.ts # Conversation memory and context
├── 12-voice-realtime.spec.ts      # Voice/realtime session endpoints
├── 13-admin-extended.spec.ts      # Admin extended panels, ADMIN_READONLY GET access
├── 14-professor-safety.spec.ts    # Professor safety guardrails
├── 15-tier-system.spec.ts         # Trial/Base/Pro tier enforcement
├── 16-admin-health.spec.ts        # Admin health checks, Redis/Resend status
├── 17-full-app-verification.spec.ts # Astuccio and Study Kit coverage
├── 18-security.spec.ts            # Security headers and access controls
├── 19-compliance-extended.spec.ts # Extended compliance checks
└── 20-safety.spec.ts              # Production safety invariants
```

### Running the Tests

```bash
# Basic run (headless, desktop only)
./scripts/smoke-prod.sh

# With options
./scripts/smoke-prod.sh --headed    # Watch tests run
./scripts/smoke-prod.sh --mobile    # Include mobile viewport
./scripts/smoke-prod.sh --fast      # Infrastructure + compliance only
./scripts/smoke-prod.sh --admin     # Include admin tests (needs ADMIN_READONLY_COOKIE_VALUE)
./scripts/smoke-prod.sh --debug     # Playwright inspector

# Direct Playwright command
PROD_URL=https://mirrorbuddy.org npx playwright test \
  --config=playwright.config.production-smoke.ts

# Microsoft Edge (Chromium engine, desktop project)
PLAYWRIGHT_CHANNEL=msedge pnpm test:smoke:prod --project=desktop

# Isolated credential login verification (no Playwright test/report artifacts)
PLAYWRIGHT_CHANNEL=msedge pnpm verify:smoke:prod:login
```

`PLAYWRIGHT_CHANNEL` defaults to `msedge` on developer machines (locally installed
Microsoft Edge, same Chromium engine, `browserName: chromium` retained) so no
bundled-browser download is needed. In CI (`CI=1`) it stays unset and Playwright
uses its bundled Chromium. Set it explicitly to override either default.

### How to Add New Tests

1. Create a new spec file in `e2e/production-smoke/` following the naming convention `NN-category.spec.ts`
2. Import fixtures from `./fixtures` (NOT from `@playwright/test`)
3. Ensure tests are **read-only** — no form submissions, no data creation
4. Add the spec to `smoke-prod.sh` if it needs special handling
5. Run locally before pushing: `./scripts/smoke-prod.sh`

### Safety Guarantees

- **Fixtures mock mutable user-state APIs** (including accessibility settings and
  `/api/tos`) and set consent cookies client-side — no server state changed
- **No authentication by default** — public tests run as anonymous visitors
- **Authenticated UI tests** inject `PROD_TEST_USER_COOKIE_VALUE` as the
  `mirrorbuddy-user-id` cookie, then verify `PROD_TEST_USER_ID` and
  `isTestData=true` through `/api/user`. Shared fixtures do not call the login
  endpoint or require `SESSION_SECRET`. A standalone Playwright-library script,
  outside the test runner and HTML reporter, uses credentials once only after
  the cookie-authenticated ID, username, email, and `isTestData` marker match the
  configured identity. It validates the login and session user IDs, emits only
  redacted pass/fail output, and may emit deduplicated `FIRST_LOGIN` telemetry.
- **Production authorization checks do not call mutating maintenance actions.**
  ADMIN_READONLY coverage inspects the UI without activating controls; the
  cleanup authorization probe is limited to `DELETE ?dryRun=true`.
- **Production smoke disables Playwright traces and video globally** so
  authenticated cookies cannot enter retained browser artifacts. Failure
  screenshots remain enabled.
- **Admin tests are opt-in** (`--admin` flag) and inject the signed
  `ADMIN_READONLY_COOKIE_VALUE` as the standard `mirrorbuddy-user-id` session cookie.
- **Anonymous route contract** — `/it` resolves to `/it/welcome`; `/admin` resolves to
  the localized login route without a valid session.
- **Reports** saved to `playwright-report/production-smoke/`

## Consequences

- Every deployment can be validated through repeatable desktop/mobile checks
- Regressions in compliance pages, i18n, or infrastructure are caught immediately
- Admin panel functionality can be verified without manual login flows
- Tests must be maintained when UI changes (selectors, page structure)
