# ADR 0138: Vercel Environment Variable Sync

**Status**: Accepted
**Date**: 2026-02-08
**Context**: Production failures (voice, invites) caused by missing env vars on Vercel

## Problem

Environment variables in `.env` were not synced to Vercel production. Three separate scripts maintained hardcoded lists of required variables that were inconsistent and incomplete (8, 4, and 5 vars respectively vs 50+ needed). No automated check caught the drift.

## Decision

### Single source of truth: `.env`

All production environment variables live in `.env`. Scripts read from it dynamically rather than maintaining separate hardcoded lists.

### Three-layer validation

| Layer      | Script                   | When       | What                                                                              |
| ---------- | ------------------------ | ---------- | --------------------------------------------------------------------------------- |
| Sync       | `fix-vercel-env-vars.sh` | Manual     | Reads `.env`, skips `SKIP_VARS`, applies `PRODUCTION_OVERRIDES`, pushes to Vercel |
| Pre-push   | `pre-push-vercel.sh`     | `git push` | Checks Vercel has all `REQUIRED_VARS`                                             |
| Pre-deploy | `validate-pre-deploy.ts` | CI         | Validates critical vars exist with correct format                                 |

### Alignment test

`src/lib/__tests__/vercel-env-sync.test.ts` enforces:

1. Every non-dev var in `.env` must be in `pre-push-vercel.sh` `REQUIRED_VARS`
2. Every var in `validate-pre-deploy.ts` (critical+optional) must cover all `REQUIRED_VARS`
3. `fix-vercel-env-vars.sh` `SKIP_VARS` must match test's `DEV_ONLY_VARS`

### Runtime warning

`fix-vercel-env-vars.sh` warns when `.env` has variables not yet in `pre-push-vercel.sh`, catching drift before tests run.

## Adding a new environment variable

1. Add to `.env` with dev value
2. Add to `PRODUCTION_OVERRIDES` in `fix-vercel-env-vars.sh` if production value differs
3. Run `npm run test:unit -- vercel-env-sync` -- it fails listing exactly which scripts need updating
4. Add to `REQUIRED_VARS` in `pre-push-vercel.sh`
5. Add to `critical[]` or `optional[]` in `validate-pre-deploy.ts`
6. Run `./scripts/fix-vercel-env-vars.sh` to sync to Vercel
7. If dev-only: add to `SKIP_VARS` and `DEV_ONLY_VARS` in the test

## Dev-only variables (never synced)

`DEV_DATABASE_URL`, `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `OLLAMA_URL`, `OLLAMA_MODEL`, `NODE_TLS_REJECT_UNAUTHORIZED`, `VERCEL_TOKEN`, `APPLE_ID`, `TEAM_ID`, `ITC_TEAM_ID`, `FASTLANE_USER`, `MATCH_GIT_URL`, `MATCH_PASSWORD`

## Production overrides

| Variable               | Local                   | Production                       |
| ---------------------- | ----------------------- | -------------------------------- |
| `NEXTAUTH_URL`         | `http://localhost:3001` | `https://mirrorbuddy.vercel.app` |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3000` | `https://mirrorbuddy.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://mirrorbuddy.vercel.app` |

## Consequences

- Adding a var to `.env` without updating scripts causes test failure (CI blocks)
- `fix-vercel-env-vars.sh` warns at runtime about unregistered vars
- No more silent production failures from missing env vars
