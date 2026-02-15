# MirrorBuddy

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
26 AI "Maestri" with embedded knowledge, voice, FSRS flashcards, mind maps, quizzes, gamification.

## Quality Gates (MANDATORY)

**Before EVERY commit**:

1. `npm run test:unit -- --reporter=dot` (MUST pass)
2. After ANY UI text change: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. New env var: update ALL of `.env.example`, `validate-pre-deploy.ts`, `.github/workflows/*.yml`, `SETUP.md`

**Code standards**:

- Defensive coding: null/undefined handling on all external input
- Every async call MUST have error handling

## Commands

| Command                             | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `npm run dev`                       | Dev server :3000                           |
| `npm run build`                     | Production build                           |
| `npm run ci:summary`                | PREFERRED: compact lint+typecheck+build    |
| `npm run ci:summary:full`           | Same + unit tests                          |
| `npm run test`                      | Playwright E2E                             |
| `npm run test:unit`                 | Vitest unit tests                          |
| `npm run release:fast`              | Fast gate: lint+typecheck+unit+smoke+build |
| `npm run release:gate`              | Full 10/10 release gate                    |
| `npm run ios:check`                 | iOS release readiness verification         |
| `npx prisma generate`               | After schema changes                       |
| `npx prisma migrate dev --name xyz` | Create migration (local only)              |
| `./scripts/sync-databases.sh`       | Sync prod + test DBs after migrations      |

## Architecture

| Component | Technology                                              | Location                | ADR  |
| --------- | ------------------------------------------------------- | ----------------------- | ---- |
| Database  | PostgreSQL + pgvector                                   | `prisma/schema/`        | 0028 |
| AI        | Azure OpenAI \| Claude (fallback) \| Ollama (local)     | `src/lib/ai/providers/` | -    |
| RAG       | Semantic search                                         | `src/lib/rag/`          | 0033 |
| State     | Zustand + REST (NO localStorage)                        | `src/lib/stores/`       | 0015 |
| Auth      | Session-based `validateAuth()`, admin via `ADMIN_EMAIL` | -                       | 0075 |
| Tiers     | Trial/Base/Pro                                          | `src/lib/tier/`         | 0065 |

**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs/` | Maestros `src/data/maestri/` | PDF `src/lib/pdf-generator/`

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility | admin-patterns | ci-verification | compliance | cookies | e2e-testing | i18n | proxy-architecture | tier

## On-Demand Docs

**Core**: mirrorbuddy | tools | database | api-routes
**Learning**: knowledge-hub | rag | learning-path | conversation-memory
**Characters**: coaches | buddies | adding-maestri | safety
**Features**: voice-api | ambient-audio | onboarding | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | pdf-generator | gamification | validation
**Compliance**: accessibility
**Infra**: tier | mobile-readiness | vercel-deployment | cookies | operations | staging | ios-release
**Beta**: trial-mode | google-drive
**Setup**: `docs/setup/` — database.md | docker.md

All docs: `@docs/claude/<name>.md`

## CSP (Content Security Policy)

`src/proxy.ts` (CSP header) + `src/components/providers.tsx` (nonces).
Before modifying: `npm run test:unit -- csp-validation`. "Caricamento..." forever = CSP blocking.

## Constraints

- WCAG 2.1 AA (7 DSA profiles in `src/lib/accessibility/`)
- NO localStorage for user data — Zustand + REST only
- Prisma for all DB operations — parameterized queries
- Path aliases: `@/lib/...`, `@/components/...`, `@/types`
- 5 locales (it/en/fr/de/es) via next-intl — see `.claude/rules/i18n.md`
- TypeScript LSP active — prefer LSP over grep/glob
- Tests first: failing test -> implement -> pass
- Conventional commits, update CHANGELOG for user-facing changes

## Verification

`./scripts/health-check.sh` (full triage, ~6 lines) or `npm run ci:summary` (build only). Details: `.claude/rules/ci-verification.md`.
