# CI Verification — MirrorBuddy

## Triage first

`./scripts/health-check.sh` — 6 lines: build+debt+compliance+i18n+git. Drill: `--drill [ci|debt|i18n|comp|migrations]`.

## ALWAYS use wrappers (hook-enforced)

NEVER raw `npm run lint|typecheck|build|test:unit` or `gh run view --log` (8k-100k token waste).

### Local `./scripts/ci-summary.sh`

| Flag | Output |
|---|---|
| (none) = `npm run ci:summary` | ~10 lines full |
| `:full` | +unit ~15 |
| `--lint\|--types\|--build\|--unit\|--i18n\|--migrations` | ~5 each |
| `--e2e\|--a11y` | ~15 each |
| `--all` | ~30 |

### GitHub CI — `~/.claude/scripts/ci-check.sh`

`ci-check.sh` (current branch) | `--all` | `<run-id>` (specific).

## Multi-agent build lock

`/tmp/mirrorbuddy-build-lock-{PWD-hash}` serializes `next build` per worktree. Stale auto-clean. Override: `BUILD_LOCK_TIMEOUT=<sec>` (default 120).

## Quiet flags

`--fail-only`, `--category`, `--summary`, `--quiet`, `--summary-only`. Verbose only when summary unclear: `npm run test:unit -- path/file 2>&1 | tail -5`.

## Deep compliance check

`npx tsx scripts/compliance-check.ts --category <key>`

| Key | # | Validates |
|---|---|---|
| `documents` | 6+ | DPIA, AI Policy, Model Card, Bias Audit |
| `safety` | 9 | Content filter, jailbreak, age gate, crisis, STEM |
| `security` | 6 | Middlewares, CSP, CSRF, cookies, PII encryption |
| `gdpr` | 8 | Delete/export, consent, ToS, anonymization, COPPA |
| `ai-act` | 7 | Transparency, conformity, oversight, literacy, PMM |
| `api` | 4 | CSRF on mutating, withAdmin, pipe order |
| `env` | 4 | .env.example, .gitignore, no secrets/PII |
| `characters` | 5+ | Maestro prompts, safety, a11y, formal address |
