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
Ordinary student credentials remain separate and unchanged.

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

## Diagnostic boundary and handoff

Upload diagnostics only after the separate revocation/cleanup command exits zero.
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
