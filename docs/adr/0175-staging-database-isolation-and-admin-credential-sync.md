# ADR 0175: Staging gets its own database, and the admin password is synced by the deploy

**Status**: Accepted — 30 August 2026
**Context**: an audit of why fixes were not reaching production found that the
staging environment read and wrote the live production database, and that the
admin password in the secrets store had never reached the production database

## The point, in one sentence

Staging now runs against **its own Supabase database in Ireland**, and every
production release **re-applies the admin password from the secrets store**, so
test traffic can no longer touch children's data and a rotated admin password can
no longer leave the owner locked out.

## The two problems this closes

### 1. Staging wrote to the production database

`deploy-to-staging` in `ci.yml` pulled the **production** environment and copied it
onto the preview environment before building. Every staging deploy — every merge to
`main` — therefore ran with production `DATABASE_URL`. Any seed, migration or E2E
run that reached the database on a staging deploy operated on real user rows.

Nothing in the pipeline asserted otherwise, so this was invisible for as long as it
existed.

### 2. `ADMIN_PASSWORD` was a secret nobody applied

The login route (`apps/web/src/app/api/auth/login/route.ts`) compares the submitted
password against `User.passwordHash` in the database, and nothing else.
`ADMIN_PASSWORD` reached that column through exactly one path: `scripts/seed-admin.ts`,
run by hand. No workflow called it.

So the secret was rotated, the database was not, and on 30 August 2026 the owner was
locked out of production while holding what the secrets store said was the correct
password. Worse, `seed-admin.ts` looked accounts up by plaintext `email` and never
wrote `emailHash` — but login looks up by `emailHash`. A seeded account could exist
and still be unable to log in; that is exactly the state the production
`admin-readonly` account was in.

## The decision

**Staging database**

- A second Supabase project, `mirrorbuddy-staging-eu`, provisioned through the Vercel
  integration in **Dublin (`dub1`)** — same jurisdiction as production, so no personal
  data leaves the EU even in test.
- `deploy-to-staging` now runs `vercel pull --environment=preview`. It no longer sees
  production values at all.
- Promotion to production (`vercel promote`) rebuilds against the production
  environment, so preview values cannot leak forward.

**Two guards, because a setting that is only correct today is not a decision**

1. **Deploy-time** (`ci.yml`, `deploy-to-staging`): before building, assert the
   connection user in the staging `DATABASE_URL` is not the production project. Fails
   the deploy if it is.
2. **Weekly** (`infra-monitor.yml`, job `staging-db-isolation`): the same assertion on
   a schedule, so a manual change in the Vercel dashboard surfaces within seven days
   rather than at the next incident.

**Compare the user, not the host.** Two Supabase projects in the same region share one
pooler hostname (`aws-1-eu-west-1.pooler.supabase.com:6543`). A guard comparing hosts
would have passed while pointing at production. The distinguishing part is the
connection user, `postgres.<project-ref>`; the production ref lives in the GitHub
secret `PRODUCTION_DB_ID` (which replaced the useless `PRODUCTION_DB_HOST`).

**Admin credentials**

- `scripts/seed-admin.ts` rewritten: derives `emailHash` with the same unsalted
  SHA-256 the login route uses, looks the account up by `emailHash` **or** email
  **or** username, **refuses to act if more than one account matches**, writes
  `emailHash` on both create and update, and gives the read-only admin a deliberately
  unusable password hash. It never deletes.
- A new `sync-admin-credentials` job runs it after every successful promotion, so the
  secret and the database can no longer drift.
- `scripts/__tests__/seed-admin.test.ts` locks the contract at source level (the
  script needs a live database, so its behaviour cannot be unit-tested directly).

## Consequences

- Staging is safe to seed, migrate and hammer with tests.
- Rotating `ADMIN_PASSWORD` is now a real operation: change the secret, next release
  applies it. No script to remember.
- Emergency path unchanged: `scripts/reset-admin-password.ts` still exists for the
  case where production must be repaired without waiting for a release. It aborts
  unless exactly one `ADMIN` matches.
- The staging project is on the Supabase **free tier**, which allows two projects per
  organisation. A third environment requires deleting one or upgrading the plan.

## What this does not cover

Preview deployments of individual pull requests share the staging database. That is
acceptable while staging holds no personal data (it is seeded with tiers and locales
only), and is the reason nothing in the smoke suite writes to it.

## References

- `.github/workflows/ci.yml` — `deploy-to-staging`, `sync-admin-credentials`
- `.github/workflows/infra-monitor.yml` — `staging-db-isolation`, `merge-flow-drift`
- `scripts/seed-admin.ts`, `scripts/reset-admin-password.ts`
- ADR 0138 (environment variable alignment), ADR 0075 (auth model)
