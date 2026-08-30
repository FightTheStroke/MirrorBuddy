# ADR 0176 — Internal notifications go to every administrator, public addresses go to one inbox

- **Status**: ACCEPTED
- **Date**: 2026-08-30
- **Supersedes**: nothing
- **Related**: ADR 0175 (admin credential sync), ADR 0075 (auth model)

## Context

Two different kinds of email address were being handled as if they were the same thing.

**Internal alerts** — a child-safety escalation, a cost alarm, a contact-form
submission, a beta request, a Pro waitlist signup — were all sent to a single
address read from `ADMIN_EMAIL`, except the waitlist, which used an address written
directly into the source (`WAITLIST_NOTIFICATION_ADDRESS`).

That had two consequences we hit for real:

1. Promoting a second person to `ADMIN` in the database gave them the admin console
   but did not make them reachable. The alerting list and the permission list were
   two unrelated facts about the same person.
2. `SUPPORT_EMAIL` in production held `info@fighttestroke.org` — a domain that does
   not exist. Every message routed through it was silently discarded, for an unknown
   length of time, with no bounce anyone was watching.

**Public contact addresses** — the ones printed in the privacy policy, the terms, the
accessibility statement, the AI-transparency page and the message sent to a parent
during a crisis — had drifted to `compliance@mirrorbuddy.it` and
`support@mirrorbuddy.it`. Neither is monitored. Families are told everywhere else to
write to the association.

## Decision

**Internal alerts are addressed from the database.** `getAdminRecipients()`
(`src/lib/admin/admin-recipients.ts`) is the single source of truth: it returns every
user with role `ADMIN` that is neither disabled nor test data, and appends
`ADMIN_EMAIL`. Adding an administrator makes them reachable; there is no second list
to maintain.

Three deliberate choices inside it:

- **`ADMIN_EMAIL` is always included, and is the fallback.** If the database is
  unreachable the function returns that address alone rather than an empty list. A
  safety escalation about a child must not depend on a healthy database.
- **`ADMIN_READONLY` is excluded.** That role exists for automated production checks,
  not for a person who should read alerts.
- **The function never throws.** A failure to work out who to notify must not break
  the request that triggered the notification.

An explicitly passed recipient still wins, so a targeted alert stays targeted.

**Public addresses are always and only `info@fightthestroke.org`** — the
association's inbox, monitored, and the one already given to families. It is not
configurable: a per-environment override is exactly how the nonexistent domain got
into production.

## Guard against regression

`src/__tests__/contact-address.test.ts` walks `src/` and `messages/` and fails if a
retired address reappears.

It reads the files with `fs` rather than shelling out to `grep`. The first version
did use `grep` as a child process, found nothing under the test runner, and reported
success — a test that would have passed forever while checking nothing. It now also
asserts that it scanned more than 100 files, so "found no violations" cannot mean
"looked at nothing".

## Consequences

- Onboarding an administrator is one database change, not two.
- `SUPPORT_EMAIL` no longer decides where a safety escalation lands; a typo in it
  cannot silence one.
- Changing the association's public address means changing it in one place and in the
  test that pins it.
- Anyone adding a new notification must call `getAdminRecipients()`. Reintroducing a
  hardcoded address in user-facing text fails the suite; a new single-recipient alert
  in server code does not, and remains a review responsibility.

## References

- `apps/web/src/lib/admin/admin-recipients.ts`
- `apps/web/src/__tests__/contact-address.test.ts`
- `apps/web/src/lib/safety/escalation/admin-notifier.ts`,
  `src/lib/ops/alert-email.ts`, `src/lib/waitlist/waitlist-notification.ts`,
  `src/lib/invite/invite-service.ts`, `src/app/api/contact/helpers.ts`
