# CI Verification Rules - MirrorBuddy

## Token-Efficient Verification (MANDATORY)

**ALWAYS** use `npm run ci:summary` instead of verbose CI commands.

| Need            | Command                           | Output                          |
| --------------- | --------------------------------- | ------------------------------- |
| Full check      | `npm run ci:summary`              | lint+typecheck+build, ~20 lines |
| With unit tests | `npm run ci:summary:full`         | + unit tests                    |
| Lint only       | `./scripts/ci-summary.sh --lint`  | ~10 lines                       |
| Types only      | `./scripts/ci-summary.sh --types` | ~10 lines                       |
| Build only      | `./scripts/ci-summary.sh --build` | ~10 lines                       |
| Unit tests only | `./scripts/ci-summary.sh --unit`  | ~10 lines                       |
| i18n only       | `./scripts/ci-summary.sh --i18n`  | ~10 lines                       |

## NEVER use these standalone (token waste)

- `npm run lint` (8k-15k tokens) -- use `ci:summary --lint`
- `npm run typecheck` (5k-10k tokens) -- use `ci:summary --types`
- `npm run build` (20k-50k tokens) -- use `ci:summary --build`
- `npm run lint && npm run typecheck && npm run build` (35k-75k tokens)

## When verbose is allowed

- Summary output is unclear and you need the full error context
- Release scripts (`release:fast`, `release:gate`) -- they have own filtering
- Piped commands with `| grep | head` (already filtered)

## GitHub CI logs

```bash
# NEVER: gh run view <id> --log  (100k+ tokens)
# ALWAYS:
gh run view <id> --json conclusion,status,jobs
gh run view <id> --log-failed | head -100
```

## Enforcement

A PreToolUse hook (`prefer-ci-summary.sh`) warns on verbose commands.
