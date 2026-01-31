# CI Verification Rules - MirrorBuddy

## Token-Efficient Verification (MANDATORY)

Two scripts optimized for AI agent consumption: minimal output, only errors/warnings.

### Local verification

**ALWAYS** use `ci-summary.sh` instead of raw npm commands.

| Need            | Command                           | Output    |
| --------------- | --------------------------------- | --------- |
| Full check      | `npm run ci:summary`              | ~10 lines |
| With unit tests | `npm run ci:summary:full`         | ~15 lines |
| Lint only       | `./scripts/ci-summary.sh --lint`  | ~5 lines  |
| Types only      | `./scripts/ci-summary.sh --types` | ~5 lines  |
| Build only      | `./scripts/ci-summary.sh --build` | ~5 lines  |
| Unit tests only | `./scripts/ci-summary.sh --unit`  | ~5 lines  |
| i18n only       | `./scripts/ci-summary.sh --i18n`  | ~5 lines  |

### GitHub CI verification

**ALWAYS** use `ci-check.sh` instead of raw gh commands.

| Need                | Command                       | Output    |
| ------------------- | ----------------------------- | --------- |
| Latest run (branch) | `./scripts/ci-check.sh`       | ~25 lines |
| Latest run (any)    | `./scripts/ci-check.sh --all` | ~25 lines |
| Specific run        | `./scripts/ci-check.sh <id>`  | ~25 lines |

## NEVER use these standalone (token waste)

| Banned command                  | Tokens wasted | Use instead             |
| ------------------------------- | ------------- | ----------------------- |
| `npm run lint`                  | 8k-15k        | `ci-summary.sh --lint`  |
| `npm run typecheck`             | 5k-10k        | `ci-summary.sh --types` |
| `npm run build`                 | 20k-50k       | `ci-summary.sh --build` |
| `npm run test:unit`             | 10k-30k       | `ci-summary.sh --unit`  |
| `gh run view <id> --log`        | 100k+         | `ci-check.sh <id>`      |
| `gh run view <id> --log-failed` | 5k-50k        | `ci-check.sh <id>`      |

## When verbose is allowed

- Summary output is unclear and you need the full error context
- Release scripts (`release:fast`, `release:gate`) -- they have own filtering
- Targeted test with pipe: `npm run test:unit -- path/file 2>&1 | tail -5`

## Enforcement

A PreToolUse hook (`prefer-ci-summary.sh`) warns on verbose commands.
