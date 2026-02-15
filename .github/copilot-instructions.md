# Copilot Instructions — MirrorBuddy

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

AI education platform: 26 tutor characters, voice, FSRS flashcards, mind maps, quizzes. Students with dyslexia, ADHD, autism, cerebral palsy.

## Pre-Commit Checklist (MANDATORY)

1. `npm run test:unit -- --reporter=dot` BEFORE every commit
2. After ANY UI text change: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. New env var → update ALL: `.env.example`, `validate-pre-deploy.ts`, `.github/workflows/*.yml`, `SETUP.md`
4. Every function accepting external input (API params, DB results, env vars) MUST handle null/undefined
5. Every async call MUST have error handling
6. Run `npm run i18n:check` before commit even if `messages/` not staged

## Stack & Flow

Next.js 16 App Router · TS strict · React 19 · Tailwind 4 · Zustand 5 · PostgreSQL 17 + Prisma + pgvector · Playwright (E2E) + Vitest (unit)

**Data**: UI → Zustand (optimistic) → API → AI/DB → Zustand (final) → UI
**AI**: Azure OpenAI (primary) → Claude (fallback) → Ollama (local) → Showcase (demo)
**RAG**: query → Azure embed (1536d) → pgvector cosine → top 3 → prompt → response (`src/lib/rag/`)

## Commands

| Task           | Command                                |
| -------------- | -------------------------------------- |
| CI compact     | `./scripts/ci-summary.sh`              |
| CI quick       | `./scripts/ci-summary.sh --quick`      |
| CI full        | `./scripts/ci-summary.sh --full`       |
| Health check   | `./scripts/health-check.sh`            |
| Lint           | `npm run lint`                         |
| Typecheck      | `npm run typecheck`                    |
| Build          | `npm run build`                        |
| Unit tests     | `npm run test:unit`                    |
| E2E smoke      | `npm run test:e2e:smoke`               |
| Release gate   | `npm run release:gate`                 |
| Prisma codegen | `npx prisma generate`                  |
| i18n sync      | `npx tsx scripts/i18n-sync-namespaces` |

## Critical Paths

| Area           | Rule                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Proxy          | `src/proxy.ts` ONLY. Root `proxy.ts`/`middleware.ts` breaks app (307→404). Pre-push hook blocks this.       |
| CSP            | `src/proxy.ts` headers ↔ `src/components/providers.tsx` nonces. Test: `npm run test:unit -- csp-validation` |
| i18n           | 5 locales (it/en/fr/de/es). camelCase keys. No hardcoded text. JSON wraps under filename key (ADR 0104)     |
| E2E fixtures   | Import from `./fixtures/` (base/a11y/auth/locale), NEVER `@playwright/test`                                 |
| API middleware | Pipe pattern: `pipe(withSentry, withCSRF, withAuth)(handler)`. CSRF before auth on mutations                |
| Tier system    | Use `tierService.getLimits(userId)` / `useTierFeatures()`, never hardcode limits                            |
| Auth           | Session cookies. `validateAuth()` / `validateAdminAuth()`. `csrfFetch()` client, `requireCSRF()` server     |
| State          | Zustand stores (`src/lib/stores/`). NO localStorage for user data (GDPR)                                    |
| Prisma schema  | 25+ files in `prisma/schema/`. Run `npx prisma generate` after changes                                      |
| Safety         | `src/lib/safety/`: bias, filtering, age enforcement                                                         |
| A11y           | 7 DSA profiles, WCAG 2.1 AA (4.5:1 contrast, keyboard, screen readers, `prefers-reduced-motion`)            |
| Admin          | `withCSRF` before `withAdmin`. Audit: `auditService.log('VERB_ENTITY')`                                     |
| Compliance     | EU AI Act + GDPR + COPPA. Parameterized queries. No PII logs. Pages: `/ai-transparency`, `/privacy`         |

## Domain Instructions

Path-matched files in `.github/instructions/` auto-load:

cookies, tier, testing, compliance, accessibility, admin, proxy, i18n, e2e
