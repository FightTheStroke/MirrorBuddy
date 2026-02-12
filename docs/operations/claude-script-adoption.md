# Claude Script Adoption Plan for MirrorBuddy

This document classifies global `~/.claude/scripts` utilities for MirrorBuddy usage.

## Summary

- Reviewed set: 84 scripts
- Reuse candidates: 19
- Claude-specific (skip): 58
- Optional/manual review: 7

## Keep Existing MirrorBuddy Scripts (No Migration Needed)

These MirrorBuddy scripts already cover daily workflow and should remain the default:

- `scripts/ci-summary.sh`
- `scripts/health-check.sh`
- `scripts/release-fast.sh`
- `scripts/release-gate.sh`
- `scripts/verify-sentry-config.sh`
- `scripts/verify-vercel-env.sh`
- `scripts/pre-push-vercel.sh`

## Reuse Candidates from ~/.claude/scripts

Potentially useful in specific contexts, but not required as project defaults:

- `ci-check.sh`
- `ci-digest.sh`
- `build-digest.sh`
- `test-digest.sh`
- `audit-digest.sh`
- `git-digest.sh`
- `diff-digest.sh`
- `merge-digest.sh`
- `error-digest.sh`
- `npm-digest.sh`
- `migration-digest.sh`
- `service-digest.sh`
- `sentry-digest.sh`
- `vercel-helper.sh`
- `deploy-digest.sh`
- `worktree-check.sh`
- `worktree-create.sh`
- `worktree-merge-check.sh`
- `supabase-helper.sh`

## Why Most Scripts Are Not Migrated

Do not migrate scripts tightly coupled to global Claude orchestration:

- `plan-db*` family
- `thor-validate.sh`
- `planner-init.sh`
- `orchestrate.sh`, `worker-launch.sh`, `executor-tracking.sh`
- dashboard sync/init scripts
- Claude/Copilot sync and session management scripts

These depend on environment assumptions outside MirrorBuddy and add maintenance risk.

## Operational Policy

1. Prefer in-repo scripts first (`scripts/ci-summary.sh`, `scripts/health-check.sh`).
2. Use global helper scripts only as optional personal tooling.
3. If a global script is adopted, copy it into `scripts/` and remove external dependencies.
4. Any adopted script must include usage docs and pass shell lint/readability review.

## Next Migration Batch (If Needed)

If you want a second phase, prioritize only these two for local adoption:

1. `git-digest.sh` (compact git status in JSON)
2. `sentry-digest.sh` (compact unresolved Sentry list)

Both provide clear value and low integration complexity.
