# MirrorBuddy

<!-- v2.1.0 (2026-03-13): Token-optimized -->

AI education platform: 26 Maestri, voice, FSRS, mind maps, quizzes, gamification. Students with learning differences.

## Quality Gates (MANDATORY)

1. `npm run test:unit -- --reporter=dot` before EVERY commit
2. UI text change: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. New env var: update `.env.example` + `validate-pre-deploy.ts` + workflows + `SETUP.md`

Defensive coding: null/undefined on external input. Every async = error handling.

## Commands

| Command                            | Purpose                                 |
| ---------------------------------- | --------------------------------------- |
| `npm run dev`                      | Dev :3000                               |
| `npm run build`                    | Prod build                              |
| `npm run ci:summary`               | Compact lint+types+build                |
| `npm run ci:summary:full`          | Same + unit tests                       |
| `npm run test`                     | Playwright E2E                          |
| `npm run test:unit`                | Vitest                                  |
| `npm run release:fast`             | Fast gate (lint+types+unit+smoke+build) |
| `npm run release:gate`             | Full 10/10 release                      |
| `npm run ios:check`                | iOS readiness                           |
| `npx prisma generate`              | After schema changes                    |
| `./scripts/stop-local-services.sh` | Stop local PostgreSQL                   |

## Local PostgreSQL (macOS dev only)

NOT auto-started. Before dev/tests: `brew services start postgresql@17` or `./scripts/ensure-test-db.sh`. Stop: `./scripts/stop-local-services.sh`. Never in CI/prod (Supabase managed).

## Architecture

| Component | Tech                                              | Location                |
| --------- | ------------------------------------------------- | ----------------------- |
| DB        | PostgreSQL + pgvector                             | `prisma/schema/`        |
| AI        | Azure OpenAI / Claude / Ollama                    | `src/lib/ai/providers/` |
| State     | Zustand + REST (NO localStorage)                  | `src/lib/stores/`       |
| Auth      | Session `validateAuth()`, admin via `ADMIN_EMAIL` | ADR 0075                |
| Tiers     | Trial/Base/Pro                                    | `src/lib/tier/`         |

Key: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs/` | Maestros `src/data/maestri/`

## Rules & Docs

**Auto-loaded rules**: `.claude/rules/` (accessibility, admin-patterns, ci-verification, compliance, cookies, e2e, i18n, proxy, tier)

**On-demand docs**: `@docs/claude/<name>.md` — mirrorbuddy, tools, database, api-routes, coaches, rag, voice-api, gamification, tier, ios-release, etc.

## Constraints

WCAG 2.1 AA (7 DSA profiles) | NO localStorage | Prisma only | Path aliases `@/` | 5 locales (next-intl) | TypeScript LSP preferred | TDD | Conventional commits

## CSP

`src/proxy.ts` (header) + `src/components/providers.tsx` (nonces). Test: `npm run test:unit -- csp-validation`. "Caricamento..." forever = CSP blocking.

## NightMaintenance

Runbook: `.github/agents/night-maintenance.agent.md`. Closure: `npm run test:smoke:prod` + `npm run production:status` + health endpoint + `sentry-cli`. Heartbeat every 5min during CI waits.

## Thor

Per-task (Gates 1-4, 8, 9) + per-wave (all 9 + build). Gate 9 = ADR compliance. `plan-db.sh validate-task` / `validate-wave`.

## Verification

`./scripts/health-check.sh` (full) or `npm run ci:summary` (build). Details: `.claude/rules/ci-verification.md`.
