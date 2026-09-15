# Ephemeral readonly smoke access

This is an explicitly approved **existing-account** operator capability, not a login
or recovery API. It issues one independent native session for exactly **3,600 seconds**
from authoritative database time. No argument or environment setting extends that
lifetime. It never creates, re-enables, changes the role/password of, or restores an account.

The transaction resolves only the normalized configured `ADMIN_READONLY_EMAIL` hash,
requires exactly one enabled `ADMIN_READONLY` account and the canonical non-password
seed marker, and persists only the native handle hash at the current account version.
The ordinary session codec, signing secret, persistence and revocation rules remain in use.

The accepted seed script retains broader reconciliation behavior, including account
creation, re-enabling and role synchronization. In this new workflow, leave
`ADMIN_READONLY_EMAIL` unset/empty during reconciliation and supply it only to issuance
and revocation. Reconciliation must not manufacture the issuer's eligibility. A missing,
disabled, wrong-role or wrong-marker account fails closed; any prerequisite correction
needs its own existing authorized process, not automatic widening of this capability.

## Manual conversion of an existing technical account

Dispatch **Readonly Auth Recovery** (`.github/workflows/readonly-recovery.yml`) from
`main`. The existing `database-repair` protected environment remains the approval
boundary; no environment, permission, key or account is created. The default `report`
action does not change data. Both connection URLs must match the existing
`PRODUCTION_DB_ID` secret. No database, origin, email or user-ID override is accepted.

The operator requires the configured owner and readonly account to each match exactly
one existing row by the same aliases used by the seed. It verifies their email hashes,
enabled roles and the owner's unchanged, non-reset password against `ADMIN_PASSWORD`.
Missing, ambiguous, wrong-role or unverified accounts fail closed. The proof and
conversion share a serializable transaction with row locks.

Only `convert` plus the exact confirmation `CONVERT_READONLY` permits a write.
The recovery entrypoint shares `resetSeedCredential` with `seed-admin.ts`: it replaces
the readonly bcrypt credential with the canonical disabled-password marker, increments
its authentication version, revokes all its native/legacy sessions and consumes its
unused password-reset tokens. It never calls broader owner reconciliation, creates an
account, rewrites an email, changes a role or enables a disabled user. An already-ready
marker is a no-op. Public logs contain only fixed status codes, not seed output or IDs.
After conversion, run the normal deployment smoke; do not use this operator in CI.

## Activation is a separate unresolved prerequisite

Native sessions need no legacy activation, so issuance itself is **not circular**.
However, a newly seeded readonly account has `legacyRevoked=false`, no usable password,
and no independent session lasting beyond the seven-day legacy deadline. A one-hour
smoke session cannot satisfy that readiness requirement. Fresh accounts therefore
remain activation blockers; converted accounts whose legacy family is already revoked
are different. This capability does not change readiness, account defaults or activation.
Resolve that policy explicitly before completing a legacy rollout; never manufacture
readiness by changing the account or extending this credential.

## Command contract

Use Node 24.x and the existing conditioned launcher from the worktree root:

```sh
pnpm run script -- scripts/readonly-smoke-session.ts issue --target production --directory "$RUNNER_TEMP/readonly-smoke-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
pnpm run script -- scripts/readonly-smoke-session.ts revoke --target production --directory "$RUNNER_TEMP/readonly-smoke-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
```

These are deployment integration instructions, **not authorization to execute production
from a developer session**. Both commands require the existing `DATABASE_URL`, `DIRECT_URL`,
`SESSION_SECRET` and `ADMIN_READONLY_EMAIL`. They do not load `.env`.

Production additionally requires the existing `sync-admin-credentials` job in
`FightTheStroke/MirrorBuddy/.github/workflows/ci.yml`, GitHub Actions, a `push` on
`refs/heads/main`, and `NODE_ENV=production`. Both database URLs must identify the same
Supabase project; URL target overrides are rejected. The workflow must still enforce
successful promotion and trusted code: environment checks are not proof of real GitHub
privileges or production deployment.

For separately authorized local proof only, `--target synthetic` requires
`NODE_ENV=test`, both URLs exactly targeting `127.0.0.1:5432/mirrorbuddy_remediation_47ba2c29`,
and a `readonly-smoke-*` direct child of the OS temporary directory. No other local
database is permitted. The E2E database override is refused in both modes.

## Private delivery and cleanup

`issue` creates a new owner-only `0700` run directory; do not pre-create or reuse it.
Its `0600` files are:

- `token`: the raw native bearer, published only after transaction commit.
- `receipt`: a signed, hash-only cleanup reference, atomically written and synchronized
  **before commit**. It uses the existing generic HMAC primitive and is not an authentication
  token. This permits cleanup when commit acknowledgement or token publication is lost.

The browser reads `token` privately into its existing `ADMIN_READONLY_COOKIE_VALUE`
input. Do not print it, enable shell tracing, write a job output/`GITHUB_ENV`, or upload
the run directory. Do not pass database credentials or the signing secret to the browser.
The runner registers both raw and URL-encoded cookies through its masking command
before browser execution; this is the only permitted log-protocol delivery.

Run `revoke` unconditionally after issuance/browser attempts, including failures and
cancellation. It removes the local bearer, verifies the receipt, and confirms revocation
of **only that native row**. Expiry, a changed account version/role/disabled state, or an
already-revoked row does not prevent scoped cleanup. A missing row is confirmed absent
by the database, not inferred from a missing file. Successful cleanup removes the receipt
and run directory. Missing/invalid receipts, uncertain database results or cleanup errors
return nonzero; preserve the private journal on failure for a controlled retry.

Issuance publication failures and graceful SIGINT/SIGTERM cancellation attempt immediate
scoped reclamation and remain failures even when reclamation succeeds. An independent
unconditional cleanup step is still required. SIGKILL, runner loss, unavailable storage
or unavailable databases cannot guarantee immediate cleanup; the one-hour expiry is a
backstop, **not a successful revocation acknowledgement**.

## Fresh dedicated student login

The separate `student-smoke-session.ts issue --directory ...` command first reads the
existing GitHub `PROD_TEST_USER_ID`, `PROD_TEST_USER_EMAIL`, `PROD_TEST_USER_USERNAME`
and `PROD_TEST_USER_PASSWORD` configuration. Prisma must resolve exactly one row across
the ID/email-hash/username aliases, with every identity field matching, enabled `USER`,
`isTestData=true`, and no required password change. It never selects a local `.env`
identity, provisions a user or writes credentials. The database URLs must match
`PRODUCTION_DB_ID`; all production context checks run before database access.

It then performs a normal username/password login at the fixed
`https://mirrorbuddy.vercel.app/api/auth/login`, without a previous cookie. Username
login avoids the email-login historical backfill. Redirects are never followed.
The response must contain a native `s2` cookie and the exact configured user, verified
again through `/api/user` before browser handoff. Login can create the normal session
and bounded, deduplicated login telemetry; it does not activate legacy sessions.
The static `PROD_TEST_USER_COOKIE_VALUE` GitHub secret is neither used nor changed.

Its exclusive `readonly-smoke-student-<run>-<attempt>` directory contains a private
token and non-secret phase receipt. Request intent is persisted before login and the
received native cookie before response-body validation. The browser gets only the
masked run-scoped cookie through its own process environment, never the password,
database credentials or a job output.

The unconditional `revoke` command obtains CSRF normally from `/api/session`, logs out
with `scope=current`, and requires the original cookie to receive HTTP 401
`SESSION_REJECTED` from `/api/user`. It cannot revoke other sessions or change an account.
Successful cleanup removes the bearer and keeps a non-secret idempotent receipt.
Failed response/identity validation attempts the same cleanup immediately.

A lost login response, runner loss or unavailable logout service cannot prove cleanup.
The job remains red, no bearer/receipt is uploaded, and the receipt must not be treated
as success. A normal student session has the normal session lifetime, **not** the
readonly one-hour limit. A lost response may therefore require separately approved
operator investigation; never silently revoke all of the account's sessions to hide it.

## Diagnostic boundary and handoff

Target validation reports `INVALID_TARGET` with a fixed prerequisite name, such as
`ADMIN_READONLY_EMAIL`, `SESSION_SECRET`, `DATABASE_URL` or `GITHUB_CONTEXT`. It never
prints the rejected value. Check that prerequisite in the trusted job configuration;
do not bypass validation or copy production secrets to a developer machine. A rejection
happens before database imports and session issuance. The same rejection during cleanup
does not imply a credential was issued, and must not be reported as successful revocation.

Upload diagnostics only after both separate revocation/cleanup commands exit zero.
Revocation failure must block upload, not merely log a warning or continue on error.
Never treat expiry, missing receipt files, cancellation or skipped cleanup as success.
After successful deletion, rerunning against that missing directory intentionally fails
rather than guessing that a previous run was revoked.

Revocation does not sanitize sensitive page content. Retain only approved diagnostics,
excluding credentials, environment dumps, storage states and sensitive raw records.
The existing production smoke configuration already disables traces and video; that is
not evidence of a prior token leak, nor permission to upload all remaining screenshots/HTML.

The parent owns workflow/package integration, diagnostic filtering, exclusive synthetic
database proof and independent acceptance. This implementation does not activate legacy
sessions, execute production or establish deployment/cancellation guarantees.
