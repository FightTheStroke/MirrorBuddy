# 0102 - Incremental E2E Execution and Release Flow

## Status

Accepted

## Context

MirrorBuddy has a comprehensive E2E suite (Playwright) plus multiple release scripts and CI jobs:

- `npm run test` runs the full E2E suite.
- `scripts/pre-release-check.sh`, `scripts/release-gate.sh`, `scripts/release-brutal.sh` all perform overlapping static checks, builds, and tests.
- GitHub Actions CI (`ci.yml`) runs full E2E and mobile E2E on every push/PR.

This design maximizes coverage but has drawbacks:

- Local iteration is slow: developers must often wait for the entire E2E suite to complete before seeing failures.
- Release scripts duplicate work (lint/typecheck/audit/build) in multiple places, increasing maintenance cost.
- CI time is high and not aligned with the new incremental E2E sets.

We recently consolidated and expanded the E2E tests (ADR 0059) and added new flows and components (consent, tiers, admin UI). We now need a more incremental strategy that:

- Keeps strong safety and compliance guarantees.
- Allows targeted, fast feedback loops while working on specific features.
- Reduces duplication between local scripts and CI configuration.

## Decision

We introduce an incremental E2E and release flow built on three pillars:

1. **Iteration-focused Playwright config and E2E sets.**
2. **Fast local release gate for PR-like validation.**
3. **Alignment of release scripts and CI around these sets.**

### 1) Iteration-focused Playwright config and E2E sets

- Added `playwright.config.iteration.ts` which:
  - Reuses the main `playwright.config.ts` but relaxes `testIgnore` for the `chromium` project to enable more suites for targeted runs.
  - Enables a dedicated `cookie-signing` project for cookie tests that must run without a pre-authenticated storage state.
  - Avoids double-running mobile tests by still ignoring `e2e/mobile/**` in the `chromium` project.

- Added incremental E2E scripts in `package.json`:
  - `test:e2e:smoke`: critical smoke paths (recommended first run).
  - `test:e2e:admin`: admin UI and admin flows.
  - `test:e2e:i18n`: locale switching, hreflang, i18n regression, welcome flows.
  - `test:e2e:compliance`: GDPR/AI Act/legal pages and compliance checks.
  - `test:e2e:security`: CSRF, cookies, debug endpoint security.
  - `test:e2e:cookie-signing`: dedicated cookie-signing project (fresh session).
  - `test:e2e:api`: API route checks and backend integration.
  - `test:e2e:ai`: AI-provider dependent tests (requires Azure/Ollama env).
  - `test:e2e:voice`: voice/WebSocket dependent tests (requires proxy).
  - `test:e2e:visual`: visual regression tests (requires baselines).
  - `test:e2e:last-failed`: reruns only the last failed tests.

Developers can now:

- Run smoke tests and a single set (admin, i18n, security, api, etc.) while iterating.
- Use `test:e2e:last-failed` to shorten feedback loops after initial failures.
- Fall back to `npm run test` when they want a CI-like full E2E pass.

Documentation (`e2e/README.md`) has been updated to describe this workflow.

### 2) Fast local release gate (`release:fast`)

- Added `scripts/release-fast.sh` and `npm run release:fast`.
- `release:fast` is a **PR-like, high-signal gate** that runs:
  - Lint + typecheck.
  - `i18n:check`.
  - `test:unit`.
  - `test:e2e:smoke`.
  - `build`.

This provides a quick “does this look safe to push / open a PR?” answer without running:

- Full E2E suite.
- Mobile E2E.
- Performance budgets and file-size audits.
- Compliance/documentation-heavy checks.

The existing `npm run release:gate` and `scripts/release-brutal.sh` remain the **full release gates** used by the `app-release-manager` flow and for production deployments.

### 3) Release scripts simplification

To reduce duplication and make the pipeline easier to maintain:

- `scripts/pre-release-check.sh` no longer runs the `lint-redirect-metadata` script directly; this check is already enforced via `npm run lint`.
- `scripts/pre-push-vercel.sh` has been updated to:
  - Run `npm run release:fast` (with build skipped) as an early phase, reusing its lint/typecheck/unit/smoke checks instead of reimplementing them.
  - Keep the Prisma, security, Vercel env, CSRF/TODO/console/secrets checks and a single production build step.
- `scripts/release-gate.sh` now:
  - Runs `npm run test:e2e:smoke` before the full `npm run test` run, improving failure visibility (fast smoke failure stops the release earlier).

The goal is to keep:

- **One place** (`npm run lint`) that wires in custom lint scripts like `lint-redirect-metadata`.
- **One fast gate** (`release:fast`) for local iteration, pre-PR validation, and as part of the pre-push Vercel simulation (with build delegated to the pre-push script).
- **One full gate** (`release:gate` / `release-brutal.sh`) for exhaustive checks.

### 4) CI alignment (direction)

CI is already structured into:

- Build, lint, typecheck, and unit tests.
- Full E2E and mobile E2E.
- Smoke tests.
- Performance and security checks.

This ADR defines the **direction** for CI alignment:

- PRs should primarily rely on:
  - Build + lint + typecheck.
  - Unit tests.
  - Smoke E2E.
  - Security and quality checks.
- Full E2E + mobile E2E + performance budgets can run:
  - On `main` pushes.
  - On scheduled workflows.
  - Or on demand for high-risk changes.

CI configuration is expected to evolve toward this pattern, using the new scripts as building blocks, but the exact scheduling is out of scope for this ADR.

## Consequences

Positive:

- Faster local iteration:
  - Developers can fix a set of tests at a time (smoke, admin, i18n, security, api).
  - `last-failed` runs shorten the debug/fix/rerun loop.
- Clearer gates:
  - `release:fast` for quick validation.
  - `release:gate` (and `release:brutal`) for full, production-grade validation.
- Less duplication:
  - Custom lint logic is centralized in `npm run lint` instead of being re-invoked in multiple scripts.
  - Release scripts share a consistent view of E2E sets.

Risks and mitigations:

- Risk: Developers may rely only on `release:fast` and skip full gates.
  - Mitigation: `app-release-manager` and CI deployment gate continue to require full tests; documentation warns that `release:fast` is **not** sufficient for production deployment.
- Risk: CI drift if jobs call Playwright directly instead of using the scripts.
  - Mitigation: CI changes should prefer `npm run test:e2e:*` scripts when adjusting jobs.

Follow-ups:

- CI updates in `.github/workflows/ci.yml`:
  - PRs run fast lanes (smoke + mobile smoke + core checks).
  - Full E2E, full mobile matrix, Docker build, and performance budgets run on push events.
- Update CI workflows to:
  - Use `npm run test:e2e:smoke` for smoke jobs.
  - Reserve full E2E/mobile/performance for `main` and/or nightly runs.
- Extend `app-release-manager` documentation to recommend:
  - `release:fast` during development and PR reviews, and as part of local pre-push checks.
  - `release:gate` / `release-brutal` before cutting a production release.
