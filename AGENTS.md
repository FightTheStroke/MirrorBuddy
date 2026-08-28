<!-- v4.0.0 (2026-08-28): single canonical agent instruction file.
     CLAUDE.md and .github/copilot-instructions.md are thin pointers to this file.
     Rationale + rollback: ~/.copilot/backups/2026-08-28-context-slim/README.md -->

# MirrorBuddy — Agent Instructions (canonical)

AI education platform: 27 Maestri/tutor characters, voice, FSRS flashcards, mind maps,
quizzes, gamification. Users are students with learning differences (dyslexia, ADHD,
autism, cerebral palsy).

Language — code, comments and docs in English; UI strings via next-intl (it/en/fr/de/es).

## Quality gates (MANDATORY, pre-commit)

1. `npm run test:unit -- --reporter=dot` before EVERY commit.
2. After ANY UI text change: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`.
3. Run `npm run i18n:check` before commit even if `messages/` is not staged.
4. New env var → update ALL of: `.env.example`, `validate-pre-deploy.ts`,
   `.github/workflows/*.yml`, `SETUP.md`.
5. Every function accepting external input (API params, DB results, env vars) MUST
   handle null/undefined.
6. Every async call MUST have error handling.

Core rules: minimum complexity · max 250 lines/file · TDD (RED→GREEN→REFACTOR) ·
no `TODO`/`FIXME`/`@ts-ignore`/`any` · conventional commits.

## Stack & data flow

Next.js 16 App Router · TS strict · React 19 · Tailwind 4 · Zustand 5 ·
PostgreSQL 17 + Prisma + pgvector · Playwright (E2E) + Vitest (unit).

- Data: UI → Zustand (optimistic) → API → AI/DB → Zustand (final) → UI
- AI: Azure OpenAI (primary) → Claude (fallback) → Ollama (local) → Showcase (demo).
  Note: Claude/Anthropic is not wired yet (P2-4).
- RAG: query → Azure embed (1536d) → pgvector cosine → top 3 → prompt → response
  (`src/lib/rag/`)

| Component | Tech                             | Location                |
| --------- | -------------------------------- | ----------------------- |
| DB        | PostgreSQL + pgvector            | `prisma/schema/`        |
| AI        | Azure OpenAI / Ollama            | `src/lib/ai/providers/` |
| State     | Zustand + REST (NO localStorage) | `src/lib/stores/`       |
| Auth      | `validateAuth()` / `ADMIN_EMAIL` | ADR 0075                |
| Tiers     | Trial / Base / Pro               | `src/lib/tier/`         |

Key paths: types `src/types/index.ts` · safety `src/lib/safety/` ·
FSRS `src/lib/education/fsrs/` · maestri `src/data/maestri/`.

## Commands

| Task           | Command                                          |
| -------------- | ------------------------------------------------ |
| Dev / build    | `npm run dev` (:3000) / `npm run build`          |
| CI compact     | `./scripts/ci-summary.sh` (`npm run ci:summary`) |
| CI quick/full  | `./scripts/ci-summary.sh --quick` / `--full`     |
| Health check   | `./scripts/health-check.sh`                      |
| Lint / types   | `npm run lint` / `npm run typecheck`             |
| Unit tests     | `npm run test:unit` (Vitest)                     |
| E2E            | `npm run test` / `npm run test:e2e:smoke`        |
| Release        | `npm run release:fast` / `npm run release:gate`  |
| iOS readiness  | `npm run ios:check`                              |
| Prisma codegen | `npx prisma generate` (after schema change)      |
| i18n sync      | `npx tsx scripts/i18n-sync-namespaces.ts`        |

Local Postgres (macOS dev only, NOT auto-started): `brew services start postgresql@17`
or `./scripts/ensure-test-db.sh`; stop with `./scripts/stop-local-services.sh`.
Never in CI/prod (Supabase there).

## Critical paths

| Area           | Rule                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proxy          | `src/proxy.ts` ONLY. Root `proxy.ts`/`middleware.ts` breaks the app (307→404). Pre-push hook blocks this.                                           |
| CSP            | `src/proxy.ts` headers ↔ `src/components/providers.tsx` nonces. Test: `npm run test:unit -- csp-validation`. "Caricamento..." stuck = CSP blocking. |
| i18n           | 5 locales (it/en/fr/de/es). camelCase keys. No hardcoded text. JSON wraps under filename key (ADR 0104)                                             |
| E2E fixtures   | Import from `./fixtures/` (base/a11y/auth/locale), NEVER `@playwright/test`                                                                         |
| API middleware | Pipe pattern: `pipe(withSentry, withCSRF, withAuth)(handler)`. CSRF before auth on mutations                                                        |
| Tier system    | Use `tierService.getLimits(userId)` / `useTierFeatures()`, never hardcode limits                                                                    |
| Auth           | Session cookies. `validateAuth()` / `validateAdminAuth()`. `csrfFetch()` client, `requireCSRF()` server                                             |
| State          | Zustand stores (`src/lib/stores/`). NO localStorage for user data (GDPR)                                                                            |
| Prisma schema  | 25+ files in `prisma/schema/`. Run `npx prisma generate` after changes                                                                              |
| Safety         | `src/lib/safety/`: bias, filtering, age enforcement                                                                                                 |
| A11y           | 7 DSA profiles, WCAG 2.1 AA (4.5:1 contrast, keyboard, screen readers, `prefers-reduced-motion`)                                                    |
| Admin          | `withCSRF` before `withAdmin`. Audit: `auditService.log('VERB_ENTITY')`                                                                             |
| Compliance     | EU AI Act + GDPR + COPPA. Parameterized queries. No PII logs. Pages: `/ai-transparency`, `/privacy`                                                 |

Other constraints: Prisma only (no raw clients) · `@/` import aliases.

## Workflow enforcement (3+ tasks)

| Step      | Action                                             | Skip = REJECTED                  |
| --------- | -------------------------------------------------- | -------------------------------- |
| Plan      | `@planner` / structured plan before coding         | No direct plan creation          |
| Execute   | `@execute {id}` / follow plan tasks in order       | No direct file edits during plan |
| Task done | `plan-db-safe.sh update-task {id} done`            | No skipping DB update            |
| Validate  | `@validate {task_id}` / verify before marking done | No self-declaring done           |
| Merge     | After all tasks validated                          | No merge with pending tasks      |

After every task: checkpoint → validate → next task. Single fixes: direct edit is fine.

## Execution & merge discipline

- Execution bias: on "execute"/"continue"/"fai"/plan reference, act within ≤3 exploratory
  tool calls, then work. Skills `/pr`, `/worktree-start`, `/verify-done` encode the
  recurring checklists — invoke them.
- Worktree: never work directly on `main`. `/worktree-start` → `./worktrees/<id>` + branch.
  MainGuard hook blocks src writes on main (carve-outs: `CLAUDE.md`, `.claude/**`,
  `docs/**`, `*.md`). Override: `MB_ALLOW_MAIN_WRITES=1`.
- Pre-push (hook-enforced): the bash guard blocks standalone
  `npm run lint|typecheck|build|test:unit`, `gh run view --log`, and
  `git push --no-verify|--force`. Use `npm run ci:summary` instead.
  `gh pr merge` is autonomous once CI is fully green and mergeable — never merge with
  failing/pending checks, unresolved review comments, or changes touching branch
  protection / security policy / release infra without flagging first.

## Verify-before-done

Never claim done without `/verify-done` (or `./scripts/health-check.sh` +
`npm run ci:summary`). Paste the output. Red = not done. Same for marking a task completed.
Thor gates: per-task (1-4, 8, 9) + per-wave (all 9 + build).

## References

- Domain rules (path-matched, auto-load): `.github/instructions/` — cookies, tier, testing,
  compliance, accessibility, admin, proxy, i18n, e2e.
- Agent personas: `.github/agents/` · NightMaintenance runbook:
  `.github/agents/night-maintenance.agent.md`.
- On-demand docs: `@docs/claude/<name>.md`; nested `CLAUDE.md` files in subfolders
  (api/components/lib/prisma/e2e/messages) load when editing those areas.
- gbrain semantic search guidance: `docs/agents/gbrain-search.md` (load on demand).

<!-- roberdan-os:begin -->

## roberdan-os — comportamento canonico (Roberto D'Angelo)

Fonte canonica completa: `~/GitHub/roberdan-os/AGENTS.md`. Sintesi operativa:

**Default sempre — loop engineering.** Autonomia totale, **evidence-first** (artefatti:
commit SHA, PR, output test — mai "dovrebbe funzionare"), commit per fase, done = verificato
empiricamente. Vale per qualsiasi lavoro multi-step, codice **e** business.

**Digital twin — automatico, ampio.** Quando l'output è comunicazione o una decisione
"come Roberto": voce warm-first, breve, decisa, next-step chiaro, sign-off **"Roberdan"**
(interno/friendly) o **"Thank you, Roberto"** (formale/esterno). **Draft, NON auto-send** per
esterni/contrattuale/leadership. **Mai inventare** nomi/date/cifre.

**Decisioni importanti — adversarial check (obbligatorio).** Su scelte high-stakes /
irreversibili: convoca il **sounding board** e fai **sempre** un red-team contro l'opzione in
testa prima di raccomandare. Default-to-refute; pre-mortem.

**Gate umani (mai automatizzare):** merge su `main` con impatto protezioni/security/release;
force-push; spesa/email esterne/pubblicazioni; cancellazioni irreversibili; decisioni
strategiche; materiale a nome Roberto / Fight the Stroke.

**Comunicazione con Roberto — formato fisso.** (1) il punto in una frase; (2) cosa serve da
lui, con opzioni + conseguenze + raccomandazione, o "Nothing"; (3) contesto max 3 righe;
(4) dettaglio tecnico in fondo; (5) **verificato / non verificato** obbligatorio su ogni
"done". Sezioni vuote si cancellano. Niente gergo non spiegato. Max ~6 righe prima del
dettaglio. Contratto completo: `behavior/roberto-mode.md`.

<!-- roberdan-os:end -->
