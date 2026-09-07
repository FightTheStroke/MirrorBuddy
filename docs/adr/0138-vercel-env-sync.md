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

| Layer      | Script                           | When         | What                                                                                             |
| ---------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| Sync       | `fix-vercel-env-vars.sh`         | Manual       | Reads `.env`, skips `SKIP_VARS`, applies `PRODUCTION_OVERRIDES`, pushes to Vercel                |
| Pre-push   | `pre-push-vercel.sh`             | `git push`   | Checks production metadata for critical names; never pulls production secrets                    |
| Pre-deploy | `validate-pre-deploy.ts`         | CI           | Checks injected critical values, newline integrity, and existing format/configuration validators |
| Build      | `build-with-production-proof.ts` | Vercel build | Runs the value checker before generate → migrate → build, then emits a deployment-bound receipt  |

### Publication without downloading production credentials

Phase five uses `vercel env ls production --format=json` (CLI support required),
not an environment download. The CLI's list operation does not request decryption.
Only names, types and production scope are validated; config/ciphertext fields are
not printed or treated as proof of value quality. Invalid/empty output, missing
critical names, duplicate definitions, non-production scope, CLI errors and absent
project links block publication. Worktrees retain the main-tree project-link fallback.
There is no skip override. Phases one through four remain unchanged.

The shared critical policy is `scripts/lib/production-env-policy.ts`, extracted
unchanged from the pre-deploy validator. `REQUIRED_VARS` remains the local alignment
registry, not a mandate to configure optional models, Stripe, observability or voice
fallbacks. Optional names stay optional.

Metadata cannot detect blank values or trailing literal `\n` corruption. Those checks
run against values already present in the trusted runtime: CI pre-deploy checks its
injected GitHub secrets, while `vercel.json` gates the actual Vercel build before
`npm run vercel-build`. GitHub secrets are not evidence of Vercel value equality.
The value-only command loads no environment file, contacts no service and prints
only variable names and failure reasons. `values` explicitly enforces the unchanged
36-name production policy (including when invoked by `validate-pre-deploy.ts`).
`build` resolves `VERCEL_TARGET_ENV` / `VERCEL_ENV`: production requires all 36;
preview/development check resident values without requiring production-only secrets.
Every target rejects trailing literal or actual newline corruption, including optional
variables. Missing, unknown, custom or contradictory targets fail closed. System
environment variables must be enabled in Vercel; no fallback silently disables the gate.
The local CI staging build explicitly binds both target variables to `preview` and
uses `vercel build --target=preview`, since local CLI builds lack system variables.
Existing DSN/token/configuration/database validators remain in CI.

### Production source-build guarantee

After the existing staging gate and health check, `auto-promote-production` checks out
`github.sha`. It transfers only project/org identifiers from staging's project-link
metadata, not environment files. `scripts/deploy-validated-production.mjs` verifies a
clean checkout, the expected commit, build configuration and pinned CLI **56.3.2**.
It refuses local prior build output. `git.deploymentEnabled: false` disables automatic
Git deployments without canceling requested CLI source builds. `ignoreCommand: null`
explicitly overrides the project-level Ignored Build Step; every string (including
`exit 1`), missing override, legacy `builds`, or alternate local framework/output
configuration fails closed. The effective remote project settings are **not** assumed
known: a cancellation, skipped command or missing receipt still blocks promotion.
It runs `vercel deploy --prod --skip-domain --force --yes --format=json`: a fresh
remote source build using production-resident values, without assigning production
domains. It neither runs a local production build nor pulls/overrides production values.

Before promotion, the returned deployment must be READY and production-targeted.
A project-scoped JSON deployment listing must identify that exact ID/URL, expected
commit and current GitHub run/attempt metadata. Old, preview, custom-target,
ambiguous and failed deployments are rejected. READY and caller-supplied metadata
alone are **not** evidence of build or value-check execution.

`build-with-production-proof.ts` deletes any old receipt and Next `BUILD_ID`, runs
the existing target-aware value validator, then runs the unchanged `vercel-build`
pipeline. Only a successful production build with a freshly generated Next build ID
can write `apps/web/public/production-build-proof.js`. Source/configuration changes
during the build, missing platform identity, child-process failure, and receipt
generation failure are fatal. Preview/development builds never produce this receipt.
The JSON-only static artifact contains the exact source commit, deployment ID,
project ID, Next build ID, source/configuration and validator digests, and successful
validation/build indicators — no environment variable names or values.

Identity comes from Vercel's built-in `VERCEL_GIT_COMMIT_SHA`,
`VERCEL_DEPLOYMENT_ID` and `VERCEL_PROJECT_ID` (with `VERCEL=1` and production target);
no new user-provisioned variable or environment override is added. System variables
must be exposed; missing identity fails before the build. Validator identity hashes
the checker, unchanged policy, build wrapper and receipt contract; configuration
identity hashes Vercel config, root/app manifests, lockfile and both Next configs.

Before promotion, `vercel curl /production-build-proof.js --deployment <id>` retrieves
the artifact from that exact deployment, using the qualified CLI's authenticated
protection-token flow, **not** public aliases. CLI 56.3.2 gets or creates the project's
automation bypass token; it does not disable deployment protection or application
authentication. Lack of permission fails closed. No production environment is pulled.
Global token/scope options precede curl's `--` separator. Requests enforce HTTPS,
no redirects, bounded time and HTTP 200; HTML, missing, oversized, malformed, extra-field
or mismatched receipts fail before promotion. The receipt's unique deployment ID
prevents replay from another build, including old, preview and prebuilt artifacts.

The `.js` suffix uses the existing proxy's static-file classification without changing
authentication or adding a route. Its body is parsed as JSON, never executed.
Vercel's qualified Next builder collects `public/` **after** the custom build command,
including the monorepo public directory adjacent to the configured `.next` output,
and emits it as a static output separate from standalone functions. This is not a
claim that Next standalone automatically copies `public/` for self-hosted deployments.

Only after this positive proof is that production ID promoted.
Both public aliases must resolve to the same READY ID/URL and the www
health endpoint must return 200 before recording success; a recent timestamp is
insufficient. Failed commands and invalid output block success without printing
their captured output. No automatic rollback or activation bypass is added.

CLI contracts are qualified against the
[56.3.2 deploy flags](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/cli/src/commands/deploy/command.ts),
[project-scoped JSON listing](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/cli/src/commands/list/index.ts),
and [production-ID promotion](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/cli/src/commands/promote/request-promote.ts).
Vercel documents [target variables](https://vercel.com/docs/environment-variables/system-environment-variables)
and [withheld-domain deployment](https://vercel.com/docs/cli/deploy#skip-domain).
Build control uses the documented [Git deployment setting](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
and [nullable ignore override](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand).
Transport and packaging are qualified against the pinned
[curl implementation](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/cli/src/commands/curl/index.ts),
[protection flow](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/cli/src/commands/curl/shared.ts),
and [Next static collection](https://github.com/vercel/vercel/blob/vercel%4056.3.2/packages/next/src/utils.ts).
Tests execute real producer and consumer processes with synthetic environments and
substitute only external build, deployment, filesystem transport and health boundaries.
They are not evidence of an actual production build, protection configuration or deployment.
A metadata check, an old prebuilt artifact or a rollback is not release readiness.

### Alignment test

`src/lib/__tests__/vercel-env-sync.test.ts` enforces:

1. Every non-dev var in `.env` must be in `pre-push-vercel.sh` `REQUIRED_VARS`
2. The shared critical policy plus `validate-pre-deploy.ts` optional names must cover all `REQUIRED_VARS`
3. `fix-vercel-env-vars.sh` `SKIP_VARS` must match test's `DEV_ONLY_VARS`

### Runtime warning

`fix-vercel-env-vars.sh` warns when `.env` has variables not yet in `pre-push-vercel.sh`, catching drift before tests run.

## Adding a new environment variable

1. Add to `.env` with dev value
2. Add to `PRODUCTION_OVERRIDES` in `fix-vercel-env-vars.sh` if production value differs
3. Run `npm run test:unit -- vercel-env-sync` -- it fails listing exactly which scripts need updating
4. Add to `REQUIRED_VARS` in `pre-push-vercel.sh`
5. Add to `criticalProductionEnv` in `scripts/lib/production-env-policy.ts` only if required, otherwise to `optional[]` in `validate-pre-deploy.ts`
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
