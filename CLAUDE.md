<!-- v3.1.0 -->

# MirrorBuddy

AI education platform — 27 Maestri, voice, FSRS, mind maps, quizzes, gamification. Students with learning differences.

## Quality Gates (MANDATORY)

1. `npm run test:unit -- --reporter=dot` before EVERY commit
2. UI text: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. New env var: `.env.example` + `validate-pre-deploy.ts` + workflows + `SETUP.md`

Defensive: null/undefined on external input. Every async = error handling.

## Commands

| Command                          | Purpose                  |
| -------------------------------- | ------------------------ |
| `npm run dev` / `build`          | Dev :3000 / Prod build   |
| `npm run ci:summary` / `:full`   | Lint+types+build / +unit |
| `npm run test` / `test:unit`     | Playwright E2E / Vitest  |
| `npm run release:fast` / `:gate` | Fast / Full 10/10        |
| `npm run ios:check`              | iOS readiness            |
| `npx prisma generate`            | After schema changes     |

## Local Postgres (macOS dev only)

NOT auto-started. `brew services start postgresql@17` or `./scripts/ensure-test-db.sh`. Stop: `./scripts/stop-local-services.sh`. Never in CI/prod (Supabase).

## Architecture

| Component | Tech                                                        | Location                |
| --------- | ----------------------------------------------------------- | ----------------------- |
| DB        | PostgreSQL + pgvector                                       | `prisma/schema/`        |
| AI        | Azure OpenAI / Ollama (Claude/Anthropic never wired — P2-4) | `src/lib/ai/providers/` |
| State     | Zustand + REST (NO localStorage)                            | `src/lib/stores/`       |
| Auth      | `validateAuth()` / `ADMIN_EMAIL`                            | ADR 0075                |
| Tiers     | Trial/Base/Pro                                              | `src/lib/tier/`         |

Key: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs/` | Maestros `src/data/maestri/`

## Docs

Rules auto-loaded: `.claude/rules/` | On-demand: `@docs/claude/<name>.md` | Nested `CLAUDE.md` in subfolders (api/components/lib/prisma/e2e/messages) load when editing those areas.

## Constraints

WCAG 2.1 AA (7 DSA profiles) | NO localStorage | Prisma only | `@/` aliases | 5 locales: it,en,fr,de,es (next-intl) | TDD | Conventional commits

## CSP

`src/proxy.ts` (header) + `src/components/providers.tsx` (nonces). Test: `npm run test:unit -- csp-validation`. "Caricamento..." = CSP blocking.

## Verification

`./scripts/health-check.sh` (full) or `npm run ci:summary` (build). Thor: per-task (Gates 1-4,8,9) + per-wave (all 9 + build). Night: `.github/agents/night-maintenance.agent.md`.

## Execution Bias

On "execute"/"continue"/"fai"/plan ref: act within ≤3 exploratory tool calls, then work. No drift. Skills `/pr`, `/worktree-start`, `/verify-done` encode recurring checklists — invoke them.

## Worktree Discipline

Never work directly on `main`. `/worktree-start` → `./worktrees/<id>` + branch. MainGuard hook blocks src writes on main (carve-outs: CLAUDE.md, `.claude/**`, `docs/**`, `*.md`). Override: `MB_ALLOW_MAIN_WRITES=1`.

## Pre-Push Checklist (hook-enforced)

Bash guard blocks: standalone `npm run lint|typecheck|build|test:unit`, `gh run view --log`, `git push --no-verify|--force`. Use `npm run ci:summary` + `~/.claude/scripts/ci-check.sh`. `gh pr merge` → autonomous once CI is fully green and mergeable (matches global `~/.claude/rules/best-practices.md` § Merge Discipline: no asking per-PR). Still never merge with failing/pending checks, unresolved review comments, or on anything touching branch protection/security policy/release infra without flagging first.

## Verify-Before-Done

Never claim done without `/verify-done` (or `./scripts/health-check.sh` + `npm run ci:summary`). Paste output. Red = not done. Same for TaskUpdate completed.

## GBrain Search Guidance (configured by /sync-gbrain)

<!-- gstack-gbrain-search-guidance:start -->

Use this section only when both `command -v gbrain` succeeds and a readable
`.gbrain-source` file exists in the repository root. If either prerequisite is
missing, ignore this section and use the repository's normal search tools;
do not install or configure gbrain automatically.

When those prerequisites are present, prefer gbrain over Grep when the question
is semantic or when you don't know the exact identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context).
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, `search`, and
`query` from anywhere under this worktree route to that source by default —
no `--source` flag needed (gbrain >= 0.41.38.0; on older gbrain the call-graph
commands need `--source "$(cat .gbrain-source)"`). Conductor sibling worktrees
of the same repo each have their own pin and their own indexed pages, so
semantic results match the code on disk here.

Call-graph queries (`code-callers`/`code-callees`) also need the graph to be
built first — run `/sync-gbrain --dream` (or `--full`) if they return
`count: 0`. This only works if this source's gbrain schema pack extracts code
symbols; on a non-code-aware pack `--dream` completes but the graph stays empty
and reports a WARN. `code-def`/`code-refs` need the same extraction.

Indexed corpora may include:

- This worktree's code (auto-pinned via `.gbrain-source`).
- `~/.gstack/` curated memory, when `gbrain sources list` shows a
  `gstack-brain-<user>` source registered by the federation pipeline.

Prefer gbrain when:

- "Where is X handled?" / semantic intent, no exact string yet:
  `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?" / symbol-based code questions:
  `gbrain code-def <symbol>` or `gbrain code-refs <symbol>`
- "What calls Y?" / "What does Y depend on?":
  `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?" / past plans, retros, learnings:
  `gbrain search "<terms>" --source gstack-brain-<user>`

Grep is still right for known exact strings, regex, multiline patterns, and
file globs. Run `/sync-gbrain` after meaningful code changes; for ongoing
auto-sync across all worktrees, run `gbrain autopilot --install` once per
machine — gbrain's daemon handles incremental refresh on a schedule.

Safety: don't run `/sync-gbrain` while `gbrain autopilot` is active — the
orchestrator refuses destructive source ops when it detects a running autopilot
to avoid racing it (#1734). Prefer registering user repos with `gbrain sources
add --path <dir>` (no `--url`): URL-managed sources can auto-reclone, and the
sync code walk for them requires an explicit `--allow-reclone` opt-in.

<!-- gstack-gbrain-search-guidance:end -->
