# Compliance audit contracts

Run `pnpm exec tsx scripts/compliance-check.ts` from the repository root.
The API and character checks deliberately distinguish source inspection from
executed behavior; a green result is not a general security certification.

## API mutations

`api-route-policy.ts` inspects each exported POST/PUT/PATCH/DELETE independently,
including constant aliases and local named/star reexports. Modules are resolved
within the real application source directory; external, missing, escaping and
cyclic exports are reported as unresolved, never silently counted as protected.
Only executed, imported middleware counts.
Imports, comments, lint suppressions and a protected GET cannot satisfy a POST.
The order check inspects the pipeline, not the import list.

`csrf-exceptions.ts` records exact methods, authority explanations and reviewed
source fingerprints. There are no directory-wide or "public" label exemptions.
Changed source invalidates an exception: inspect the route and its service
authority, update the behavior contract, then update the fingerprint. Never
regenerate fingerprints simply to make the audit green. Review service changes
too: route fingerprints do not prove arbitrary transitive dependencies safe.

The ten public/code/token exceptions are exercised with and without ambient
cookie identity in `scripts/__tests__/csrf-exception-authority.test.ts`. Database,
mail and provider effects are replaced at the service boundary; these tests do
not claim production database or external delivery coverage. Invite visitor
cookies affect attribution only.

Safety events, voice crisis escalation, trial email, trial session creation and trial voice
usage now require the standard CSRF token before reading cookie authority.
Authentication remains optional: anonymous crises and trials still work.
The existing event/session callers already use `csrfFetch`; voice crisis
escalation now does too, with keepalive and explicit HTTP-failure logging.
No sendBeacon or webhook transport was changed.

Trial email requires both the session identifier and an independent validated
visitor cookie matching the database owner; knowing the session identifier or
sharing an IP is insufficient. Trial status/voice GETs never create sessions and
do not read personal trial data without consent. Voice reporting requires an
already activated owned session. Activation rejects an existing IP budget owned
by a different visitor rather than returning that visitor's data: resetting a
cookie on the same IP does not reset the existing quota.

`useTrialStatus` handles an absent session without inventing quotas or activating
a trial. Welcome email capture sends the session ID returned by activation.
Capture is optional: HTTP/network failures warn explicitly and do not block
onboarding. A stale returning-user email with no owned session is skipped with a
warning; it never creates a new trial or invents ownership. Activation, consent,
shared-IP budget rejection and essential onboarding failures remain blocking.

The default Chromium project excludes trial tests. Run the dedicated project
with an explicit isolated local `TEST_DATABASE_URL`, matching `DATABASE_URL`,
`DIRECT_URL`, `TEST_DIRECT_URL`, and an unused `MIRRORBUDDY_PORT`:

```sh
RESEND_API_KEY='' pnpm exec playwright test \
  --config apps/web/playwright.config.trial.ts --project trial-compliance --workers 1
```

It inherits the standard production guards and server environment isolation.
Use blank external service credentials (mail, Redis, Sentry, Azure) for local
validation. Specs execute Chromium requests against real routes and inspect
the isolated database, including rejected ownership changes and persisted
crisis/events. Email transport is disabled; delivery is not certified.
The safety-event runtime enum also defines its TypeScript union, so additions
cannot silently diverge from request validation.

For optional-email failure and stale returning-user coverage, run
`pnpm exec playwright test --config apps/web/playwright.config.trial-email.ts
--project trial-optional-email --workers 1` with the same isolated local database
environment. This guarded config supplies a synthetic email key and an empty
`FROM_EMAIL`: the real email API returns HTTP 500 before attempting any external
delivery. No protected API or authentication/database result is mocked. Browser
assertions verify the warning, real onboarding persistence and navigation, plus
no trial creation or email PATCH when the returning visitor has no owned trial.

## Character prompts

The registry supplies actual assembled prompts, including delegated prompt and
knowledge modules. `character-runtime.ts` calls the public `enhanceSystemPrompt`
under Node's server condition, with empty memory and no database query. Missing
or invalid runtime output fails the audit. The CLI flushes its result and exits
because imported server modules own timers.

`prompt-contracts.ts` requires substantive instructions for minors, prohibited
content, privacy, injection resistance, crisis referral, role limits and learning.
Runtime tests cover all registered maestri, plus all seven profile selections for
Austen, Kahlo, Loto, Nightingale, Noether and Turing. Their adaptations follow the
existing profile headings; filtering preserves the selected substantive content,
excludes other profiles' content (auditory is not cerebral palsy), and does not
remove persona limits.
The same seven-profile checks cover the actual legacy Ippocrate, Lovelace and
Simone prompts, including subject-specific auditory adaptations. Their complete
curriculum and persona content outside the adaptation section remain intact;
missing unrelated legacy sections are not substituted with another profile.
Formal address checks require exact membership in the canonical greeting list,
not names appearing in a compatibility export or comment. The i18n formality
module reuses that same public canonical list, with an identity regression test.
