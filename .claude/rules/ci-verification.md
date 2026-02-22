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

| Need                | Command                                         |
| ------------------- | ----------------------------------------------- |
| Latest run (branch) | `ci-check.sh` (from `~/.claude/scripts/`)       |
| Latest run (any)    | `ci-check.sh --all` (from `~/.claude/scripts/`) |
| Specific run        | `ci-check.sh <id>` (from `~/.claude/scripts/`)  |

## NEVER use standalone: `npm run lint|typecheck|build|test:unit` or `gh run view --log` (8k-100k+ token waste each). Hook enforces this.

## Multi-Agent Build Lock

Build modes (`default`, `--full`, `--build`, `--all`) use `/tmp/mirrorbuddy-build-lock-{PWD-hash}` to serialize `next build` per worktree directory (stale PID locks are auto-cleaned).
Override wait with `BUILD_LOCK_TIMEOUT=<seconds> ./scripts/ci-summary.sh ...` (default `120`).
Full options and lock behavior details: `./scripts/ci-summary.sh --help`

## Quiet modes for scripts

Use each script's summary/quiet flags (for example `--fail-only`, `--category`, `--summary`, `--quiet`, `--summary-only`); check each script `--help` for current options.
Use verbose output only when summaries are unclear, or for targeted debug runs: `npm run test:unit -- path/file 2>&1 | tail -5`

## Deep Compliance Check Categories

`npx tsx scripts/compliance-check.ts --category <key>`

| Key          | Checks | What it validates                                     |
| ------------ | ------ | ----------------------------------------------------- |
| `documents`  | 6+     | DPIA sections, AI Policy refs, Model Card, Bias Audit |
| `safety`     | 9      | Content filter, jailbreak, age gating, crisis, STEM   |
| `security`   | 6      | Middlewares, CSP, CSRF, cookies, PII encryption       |
| `gdpr`       | 8      | Delete/export API, consent, ToS, anonymization, COPPA |
| `ai-act`     | 7      | Transparency, conformity, oversight, literacy, PMM    |
| `api`        | 4      | CSRF on mutating routes, withAdmin, pipe order        |
| `env`        | 4      | .env.example, .gitignore, no hardcoded secrets/PII    |
| `characters` | 5+     | Maestro prompts, safety content, a11y, formal address |
