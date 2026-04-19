<!-- v3.0.0 -->

# MirrorBuddy

AI education platform: 26 Maestri, voice, FSRS, mind maps, quizzes, gamification. Students with learning differences.

## Quality Gates (MANDATORY)

1. `npm run test:unit -- --reporter=dot` before EVERY commit
2. UI text: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. New env var: `.env.example` + `validate-pre-deploy.ts` + workflows + `SETUP.md`

Defensive: null/undefined on external input. Every async = error handling.

## Commands

| Command                                  | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `npm run dev` / `build`                  | Dev :3000 / Prod build         |
| `npm run ci:summary` / `ci:summary:full` | Lint+types+build / same + unit |
| `npm run test` / `test:unit`             | Playwright E2E / Vitest        |
| `npm run release:fast` / `release:gate`  | Fast gate / Full 10/10         |
| `npm run ios:check`                      | iOS readiness                  |
| `npx prisma generate`                    | After schema changes           |

## Local PostgreSQL (macOS dev only)

NOT auto-started. `brew services start postgresql@17` or `./scripts/ensure-test-db.sh`. Stop: `./scripts/stop-local-services.sh`. Never in CI/prod (Supabase).

## Architecture

| Component | Tech                                          | Location                |
| --------- | --------------------------------------------- | ----------------------- |
| DB        | PostgreSQL + pgvector                         | `prisma/schema/`        |
| AI        | Azure OpenAI / Claude / Ollama                | `src/lib/ai/providers/` |
| State     | Zustand + REST (NO localStorage)              | `src/lib/stores/`       |
| Auth      | Session `validateAuth()`, admin `ADMIN_EMAIL` | ADR 0075                |
| Tiers     | Trial/Base/Pro                                | `src/lib/tier/`         |

Key: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs/` | Maestros `src/data/maestri/`

## Docs

Rules: `.claude/rules/` (auto-loaded) | On-demand: `@docs/claude/<name>.md`

## Constraints

WCAG 2.1 AA (7 DSA profiles) | NO localStorage | Prisma only | `@/` aliases | 5 locales: it, en, fr, de, es (next-intl) | TDD | Conventional commits

## CSP

`src/proxy.ts` (header) + `src/components/providers.tsx` (nonces). Test: `npm run test:unit -- csp-validation`. "Caricamento..." = CSP blocking.

## Verification

`./scripts/health-check.sh` (full) or `npm run ci:summary` (build). Thor: per-task (Gates 1-4, 8, 9) + per-wave (all 9 + build). Night: `.github/agents/night-maintenance.agent.md`.

## Execution Bias

When user says "execute", "continue", "fai", or references a plan/MISSION.md: act within ≤3 exploratory tool calls, then start work. No drift into exploration. Skills `/pr`, `/worktree-start`, `/verify-done` encode recurring checklists — invoke them instead of re-deriving steps.

## Worktree Discipline

Never work directly on `main`. Use `/worktree-start` → creates `./worktrees/<id>` + branch. MainGuard hook (`.claude/hooks/main-guard.sh`) blocks writes to src on main (carve-outs: CLAUDE.md, `.claude/**`, `docs/**`, `*.md`). Emergency override: `MB_ALLOW_MAIN_WRITES=1`.

## Pre-Push Checklist (hook-enforced)

Bash guard (`.claude/hooks/bash-guard.sh`) blocks: standalone `npm run lint|typecheck|build|test:unit`, `gh run view --log`, `git push --no-verify|--force`. Use `npm run ci:summary` + `~/.claude/scripts/ci-check.sh`. `gh pr merge` triggers confirmation — paste `gh pr checks <n>` output + wait user "yes".

## Verify-Before-Done

Never claim "done" without running `/verify-done` (or equivalent: `./scripts/health-check.sh` + `npm run ci:summary`). Paste actual output. If red → not done. Applies to TaskUpdate completed status too.
