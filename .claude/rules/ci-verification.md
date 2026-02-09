# CI Verification Rules - MirrorBuddy

## Project Health (PREFERRED starting point)

`./scripts/health-check.sh` — single triage, ~6 lines: build + debt + compliance + i18n + git.
Drill down: `./scripts/health-check.sh --drill [ci|debt|i18n|comp|migrations]`

## ALWAYS use `ci-summary.sh` / `ci-check.sh` instead of raw commands.

### Local

| Need            | Command                                | Output    |
| --------------- | -------------------------------------- | --------- |
| Full check      | `npm run ci:summary`                   | ~10 lines |
| With unit tests | `npm run ci:summary:full`              | ~15 lines |
| Lint only       | `./scripts/ci-summary.sh --lint`       | ~5 lines  |
| Types only      | `./scripts/ci-summary.sh --types`      | ~5 lines  |
| Build only      | `./scripts/ci-summary.sh --build`      | ~5 lines  |
| Unit tests only | `./scripts/ci-summary.sh --unit`       | ~5 lines  |
| i18n only       | `./scripts/ci-summary.sh --i18n`       | ~5 lines  |
| Migrations      | `./scripts/ci-summary.sh --migrations` | ~5 lines  |
| E2E tests       | `./scripts/ci-summary.sh --e2e`        | ~15 lines |
| A11y tests      | `./scripts/ci-summary.sh --a11y`       | ~15 lines |
| Everything      | `./scripts/ci-summary.sh --all`        | ~30 lines |

### GitHub CI

| Need                | Command                       |
| ------------------- | ----------------------------- |
| Latest run (branch) | `./scripts/ci-check.sh`       |
| Latest run (any)    | `./scripts/ci-check.sh --all` |
| Specific run        | `./scripts/ci-check.sh <id>`  |

## NEVER use standalone: `npm run lint|typecheck|build|test:unit` or `gh run view --log` (8k-100k+ token waste each). Hook enforces this.

## Multi-Agent Build Lock

Modes that include a build (`default`, `--full`, `--build`, `--all`) acquire an exclusive lock via `/tmp/mirrorbuddy-build-lock-{PWD-hash}`. This prevents concurrent `next build` from corrupting `.next/`.

- **Lock is per-directory**: agents in different worktrees do NOT block each other.
- **Same directory**: agents wait up to `BUILD_LOCK_TIMEOUT` (default 120s), then fail.
- **Stale locks** (dead PID) are auto-cleaned.

| Scenario                  | Recommended mode                        |
| ------------------------- | --------------------------------------- |
| Development (any agent)   | `--quick` (no build lock)               |
| Single check              | `--lint`, `--types`, `--unit` (no lock) |
| Thor / pre-commit         | `--full` or default (acquires lock)     |
| Multiple agents, same dir | Use separate worktrees or `--quick`     |

Override timeout: `BUILD_LOCK_TIMEOUT=300 ./scripts/ci-summary.sh`
Full help: `./scripts/ci-summary.sh --help`

## Quiet modes for scripts

| Script                    | Flag             | Output                              |
| ------------------------- | ---------------- | ----------------------------------- |
| `compliance-check.ts`     | `--fail-only`    | Only FAIL/WARN, skip PASS           |
| `debt-check.ts`           | `--summary`      | Counts only, no file list           |
| `i18n-sync-namespaces.ts` | `--quiet`        | 1-line pass/fail                    |
| `release-gate.sh`         | `--summary-only` | Counts + top 3 instead of full list |

Verbose allowed only when summary output is unclear, or targeted: `npm run test:unit -- path/file 2>&1 | tail -5`
