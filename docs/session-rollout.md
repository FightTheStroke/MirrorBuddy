# Durable authentication rollout

This rollout is manual. Installing the schema or deploying code does **not** activate
legacy access. There is no deployment, boot-time, environment-variable or approval-date
fallback. `NOT_ACTIVATED` is an explicit service-unavailable state for legacy credentials,
not a compatible completed deployment and not unlimited grace.

## Before moving existing traffic

1. Apply the additive session migration and generate the matching Prisma client.
   Never edit its applied checksum or reconcile unrelated database drift as part of activation.
2. Stage the complete reader, issuer, logout, password, disable and restore implementation.
   All readers must understand opaque credentials before any issuer emits them.
3. Run the read-only readiness command against the explicitly selected database:
   `npm run script -- scripts/activate-session-lifecycle.ts`.
4. Resolve every reported blocker before the traffic transition. Only a reviewed operator
   action may run `npm run script -- scripts/activate-session-lifecycle.ts --activate`.
   This plan does not execute activation in production.
5. Observe the persisted activation state and exercise real login/logout/navigation.
   A successful build or passing readiness census alone is not lifecycle acceptance.

The script uses the existing database configuration and signing secret; it introduces no
secret, recovery identity, personal-data field or emergency authentication bypass.
The write rechecks readiness inside the same serializable transaction. Repeated activation
returns the original timestamp and cannot move the deadline.

## Who retains access, and for how long

Let **A** be the once-only database activation timestamp and **D = A + 604800 seconds**.
Raw legacy cookies and every session upgraded from them stop authorizing at D, even if a
browser retains its cookie. Upgrading never changes that deadline or removes legacy origin.
The browser may request an upgrade through the CSRF-protected upgrade API; server components
only read authentication state and never write replacement cookies.

Independent native sessions require no activation. Password login issues seven days;
onboarding and development-only guest creation retain their existing 365-day lifetime.
Each row has immutable issuance/expiry metadata. Ordinary reads and native upgrade requests
do not slide expiry. Fresh password proof may replace the presented same-account native
session with a new seven-day row, without revoking other devices.

Users relying on legacy access must authenticate with an existing usable credential before
their legacy deadline. Existing password reset is available only where an existing account
and delivery address support it. Provider-linking/provisioning callbacks are not assumed to
be login issuers; Google Drive OAuth and ten-minute PKCE handshakes remain separate.

## Recovery and readiness blockers

Activation blocks while an enabled, unrevoked legacy-family account has neither a usable
password/login identifier nor an independent, current-version native session valid beyond D.
Short-lived, expired, revoked, version-mismatched and legacy-derived rows do not count.
The census reports a count, not personal identities, and creates no recovery data.

For an unrecoverable credentialless legacy-only account, there is **no approved recovery
path**. Do not activate and then promise recovery, collect new identifying information, or
manufacture a credential. Surface the blocker for an explicit human decision. A disabled
account requires the existing administrator process; re-enabling it does not revive tokens.

## Logout, credential changes and restoration

The visible default is **current session**; **all sessions** is a separate explicit action.
Native current-session logout marks only that row revoked. Logging out from a legacy or
legacy-origin credential revokes the account's entire legacy family, including upgraded
copies; independently authenticated native sessions survive. The interface explains this
automatic consequence; it is not a third logout option.

All-session logout atomically increments the user version, blocks raw legacy, and revokes
existing rows. Password change performs the same invalidation and replaces the acting
session only after fresh proof. Password reset issues nothing and consumes reset credentials
once. Disable persists invalidation before re-enable can occur. Administrative lifecycle
mutations recheck the actor's live session and role inside their transaction.

Deletion cascades session rows. Restoration never restores session/reset-token rows, never
overwrites a live user, increments the saved version, and permanently blocks the restored
legacy family. Outstanding provider callbacks cannot recreate a deleted identity.

Cookie clearing follows durable success, except current-browser recovery when the initial
credential read definitively rejects an expired, revoked or malformed credential. This
local clearing performs no revocation and cannot report all-session success. Absent or
rejected credentials cannot authorize all-session logout. Database/schema failures and
`NOT_ACTIVATED` remain failures without cookie clearing.

When identity is unavailable, current-browser logout is also reachable directly in the
sign-in status alert, including cold loads without settings navigation. All-session logout
stays disabled until identity is authenticated. The interface becomes anonymous and
navigates only after the server acknowledges successful logout.

A rejection during the revocation transaction is not swallowed: a replacement/version or
expiry race still fails without claiming durable success. A subsequent current-browser
attempt rereads the credential and can clear it locally if it is still rejected. An
identical same-version logout remains idempotent in the shared revocation service.
Visitor usage budgets and consent survive logout. Missing or corrupt display hints
cannot turn a real authenticated browser into a guest: server context and `/api/auth/me`
provide identity, with unavailable/pending states kept distinct from anonymous.

## Operational constraints

Use serializable transactions and bounded retries, including Prisma adapter commit
conflicts. A lost replacement response requires reauthentication, never restoration of an
old handle. Already-running requests/external voice connections are not retroactively
terminated; sensitive lifecycle operations revalidate within their transactions.

Do not rewrite session identity/origin/issuance/version, clear `revokedAt`, recreate old
handles, lower user versions, clear `legacyRevoked`, or restore pre-rollout authentication
state. Database expiry/version/family/activation constraints supplement these service rules.
Privileged `TRUNCATE`, table replacement, trigger disabling or stale database restoration
can bypass row triggers: operational access must prohibit those actions for these records.
They are not supported rollback mechanisms. Rolling back to legacy-only readers is unsafe.

Keep A, all version counters and all revocations through process restart, redeployment,
backup and recovery. If the schema is missing, incomplete or unavailable, fail visibly;
never select anonymous access or silently start another grace period.
