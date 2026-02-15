# ADR 0150: Production Smoke Testing Strategy

Status: Accepted | Date: 15 Feb 2026

## Context

MirrorBuddy is deployed on Vercel at `mirrorbuddy.vercel.app`. We needed a way to validate production deployments without leaving traces in the database or affecting real users. Manual testing is slow and error-prone, and we had no automated production validation until now.

## Decision

We created a dedicated Playwright-based production smoke test suite that:

1. **Runs against the live production URL** (configurable via `PROD_URL` env var)
2. **Never creates, modifies, or deletes data** — read-only verification only
3. **Uses client-side mocks** to bypass consent walls without touching the server
4. **Covers 16 test areas** across 80+ test cases

### Test Suite Structure

```
e2e/production-smoke/
├── fixtures.ts                    # Base fixture with consent wall bypasses
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
└── 16-admin-health.spec.ts        # Admin health checks, Redis/Resend status
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
PROD_URL=https://mirrorbuddy.vercel.app npx playwright test \
  --config=playwright.config.production-smoke.ts
```

### How to Add New Tests

1. Create a new spec file in `e2e/production-smoke/` following the naming convention `NN-category.spec.ts`
2. Import fixtures from `./fixtures` (NOT from `@playwright/test`)
3. Ensure tests are **read-only** — no form submissions, no data creation
4. Add the spec to `smoke-prod.sh` if it needs special handling
5. Run locally before pushing: `./scripts/smoke-prod.sh`

### Safety Guarantees

- **Fixtures mock `/api/tos`** and set consent cookies client-side — no server state changed
- **No authentication by default** — tests run as anonymous visitors
- **Admin tests are opt-in** (`--admin` flag) and read-only (dashboard viewing only, ADMIN_READONLY role verification)
- **Reports** saved to `playwright-report/production-smoke/`

## Consequences

- Every deployment can be validated in ~30 seconds
- Regressions in compliance pages, i18n, or infrastructure are caught immediately
- Admin panel functionality can be verified without manual login flows
- Tests must be maintained when UI changes (selectors, page structure)
