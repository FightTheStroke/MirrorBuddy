# MirrorBuddy

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
26 AI "Maestri" with embedded knowledge, voice, FSRS flashcards, mind maps, quizzes, gamification.

## Commands

```bash
npm run dev              # Dev server :3000
npm run build            # Production build
npm run ci:summary       # PREFERRED: compact lint+typecheck+build
npm run ci:summary:full  # Same + unit tests
npm run test             # Playwright E2E
npm run test:unit        # Vitest unit tests
npm run release:fast     # Fast gate: lint+typecheck+unit+smoke(+build)
npm run release:gate     # Full 10/10 release gate
npx prisma generate      # After schema changes
npx prisma migrate dev --name xyz  # Create migration (local only)
./scripts/sync-databases.sh  # Sync prod + test DBs after migrations
```

## Architecture

**Database**: PostgreSQL + pgvector (`prisma/schema/`) — ADR 0028
**AI**: Azure OpenAI (primary) | Ollama (fallback) — `src/lib/ai/providers.ts`
**RAG**: Semantic search — `src/lib/rag/` — ADR 0033
**State**: Zustand + REST — NO localStorage (ADR 0015) — `src/lib/stores/`
**Auth**: Session-based `validateAuth()`, admin via `ADMIN_EMAIL` — ADR 0075
**Tiers**: Trial/Base/Pro — `src/lib/tier/` — ADR 0065
**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri/` | PDF `src/lib/pdf-generator/`

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility | compliance | e2e-testing | tier | cookies | i18n | proxy-architecture | ci-verification

## On-Demand Docs (`@/claude/<name>.md`)

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub | rag | safety | validation
**Features**: voice-api | ambient-audio | onboarding | learning-path | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory | pdf-generator | gamification
**Beta**: trial-mode
**Compliance**: accessibility
**Characters**: buddies | coaches | adding-maestri
**Infra**: tier | mobile-readiness | vercel-deployment | cookies | operations
**Setup**: `docs/setup/` — database.md | docker.md

## CSP (Content Security Policy) — CRITICAL

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
