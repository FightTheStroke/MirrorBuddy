# ADR 0137 - Schema Drift Detection

**Status**: Accepted
**Date**: 2026-02-08

## Context

9 Prisma models and 1 enum were defined in `prisma/schema/` but had no corresponding migration. The tables did not exist in production PostgreSQL. Every API route touching these models returned 500, silently swallowed by empty `catch {}` blocks.

**Root cause**: `prisma generate` works from schema files, not DB state. Build, lint, and typecheck all passed despite missing tables. No validation existed to verify that schema models had matching migrations.

**Affected features** (all broken in production):

- Admin character management (CharacterConfig)
- Tool output persistence - mindmaps, flashcards, quizzes (ToolOutput)
- Conversation memory/summaries (HierarchicalSummary)
- Password reset flow (PasswordResetToken)
- B2B contact forms (ContactRequest)
- Admin audit logging (AdminAuditLog, AuditLog)
- Enterprise SSO (SchoolSSOConfig, SSOSession)

## Decision

### 1. Migration for missing models

Single migration (`20260208120000_add_missing_models`) creating all 9 tables + CharacterType enum with indexes and foreign keys (ToolOutput -> Conversation, PasswordResetToken -> User).

### 2. Database-free drift detection script

`scripts/check-schema-drift.sh` parses `prisma/schema/*.prisma` for `model` and `enum` declarations, resolves `@@map` directives to actual table names, and verifies each has a matching `CREATE TABLE` / `CREATE TYPE` in `prisma/migrations/**/*.sql`.

Database-free by design: CI runners (Lane 4b) have no DB access.

### 3. Three-layer enforcement

| Layer  | Hook                               | When                         | Blocks             |
| ------ | ---------------------------------- | ---------------------------- | ------------------ |
| Local  | `pre-push-vercel.sh` Phase 1/4     | Before `git push`            | Push rejected      |
| CI     | `.github/workflows/ci.yml` Lane 4b | On PR with `prisma/` changes | Merge blocked      |
| Manual | `ci-summary.sh --migrations`       | On demand                    | Developer feedback |

### 4. Integration into existing tooling

- `ci-summary.sh`: `--migrations` flag + included in `--all`
- `health-check.sh`: `--drill migrations` option

## Consequences

- Schema drift is caught **before push** (local hook), not after deployment
- No new CI job required -- extends existing Lane 4b (Migration Consistency)
- Adding a Prisma model without a migration now fails at three gates
- Script handles `@@map` directives and `CREATE TABLE IF NOT EXISTS` variants
- No database or shadow DB required for validation

## References

- `scripts/check-schema-drift.sh`
- `scripts/pre-push-vercel.sh` (Phase 1/4)
- `.github/workflows/ci.yml` (Lane 4b)
- `.claude/rules/ci-verification.md`
