---
name: ci-verification
description: 'CI verification and build validation for MirrorBuddy. Use when running checks, validating builds, or verifying code quality before commits.'
---

## CI Verification Skill

MirrorBuddy uses compact CI scripts instead of raw npm commands.
NEVER run `npm run lint`, `npm run typecheck`, or `npm run build` individually.

### Primary Commands

| Need            | Command                           | Output    |
| --------------- | --------------------------------- | --------- |
| Default check   | `./scripts/ci-summary.sh`         | ~10 lines |
| Quick check     | `./scripts/ci-summary.sh --quick` | ~5 lines  |
| With unit tests | `./scripts/ci-summary.sh --full`  | ~15 lines |
| Lint only       | `./scripts/ci-summary.sh --lint`  | ~5 lines  |
| Types only      | `./scripts/ci-summary.sh --types` | ~5 lines  |
| Build only      | `./scripts/ci-summary.sh --build` | ~5 lines  |
| Unit tests      | `./scripts/ci-summary.sh --unit`  | ~5 lines  |
| i18n check      | `./scripts/ci-summary.sh --i18n`  | ~5 lines  |
| Everything      | `./scripts/ci-summary.sh --all`   | ~30 lines |

### Health Check

```bash
./scripts/health-check.sh  # Full triage (~6 lines)
```

### Release Gates

```bash
./scripts/release-fast.sh    # Fast: lint+typecheck+unit+smoke
./scripts/release-gate.sh    # Full 10/10 release gate
```

### Build Lock

Modes including build acquire an exclusive lock (`/tmp/mirrorbuddy-build-lock-*`).
Multiple agents in the same directory wait up to 120s.
Use `--quick` or `--lint`/`--types` to avoid locks.
