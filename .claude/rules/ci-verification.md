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

## Quiet modes for scripts

| Script                    | Flag             | Output                              |
| ------------------------- | ---------------- | ----------------------------------- |
| `compliance-check.ts`     | `--fail-only`    | Only FAIL/WARN, skip PASS           |
| `debt-check.ts`           | `--summary`      | Counts only, no file list           |
| `i18n-sync-namespaces.ts` | `--quiet`        | 1-line pass/fail                    |
| `release-gate.sh`         | `--summary-only` | Counts + top 3 instead of full list |

Verbose allowed only when summary output is unclear, or targeted: `npm run test:unit -- path/file 2>&1 | tail -5`
