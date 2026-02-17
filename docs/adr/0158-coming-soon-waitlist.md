# ADR 0158: Coming Soon Waitlist + Invited Access

**Status**: Accepted
**Date**: 2026-02-17
**Plan**: 157

## Context

MirrorBuddy needs a pre-launch waitlist system to collect interested users, verify their email addresses, and offer early-bird promotional access (1 month Pro free) before the platform goes public. The system must comply with GDPR (double opt-in, consent version tracking, unsubscribe flow) and integrate with the existing tier/subscription infrastructure.

## Decision

### Feature Flag Gating

- New `coming_soon_overlay` feature flag controls the Coming Soon mode
- When enabled, `src/proxy.ts` redirects unauthenticated requests to `/coming-soon`
- Authenticated users and API/admin/static paths bypass the overlay

### Waitlist Flow

1. User visits `/coming-soon`, fills waitlist form (email, optional name, GDPR consent)
2. `POST /api/waitlist/signup` creates `WaitlistEntry` with verification token (24h expiry)
3. Verification email sent via email service
4. User clicks verification link -> `GET /api/waitlist/verify?token=...`
5. On verification: promo code generated (8-char alphanumeric), confirmation email with code
6. User can unsubscribe via `GET /api/waitlist/unsubscribe?token=...`

### Promo Code Redemption

- `POST /api/promo/redeem` — authenticated endpoint with rate limiting
- `redeemCode()` uses `prisma.$transaction` for atomicity
- Creates/updates `UserSubscription` with Pro tier, 30-day expiry
- Non-combinable: rejects if user has active Stripe subscription
- Logs to `TierAuditLog` with `PROMO_REDEEM` action

### Admin Dashboard

- `/admin/waitlist` — paginated list with search, verified/unverified filter
- `/api/admin/waitlist/stats` — aggregated stats (total, verified, unsubscribed, conversion rate)
- Dual-source campaign service supports targeting both users and waitlist entries

### Metrics & Cleanup

- 7 new waitlist KPIs in metrics-push cron (Grafana)
- Daily cleanup cron deletes unverified entries older than 90 days

## Consequences

- New `WaitlistEntry` Prisma model with 6 indexes
- `PROMO_REDEEM` added to `TierAuditAction` enum
- `WAITLIST_SIGNUP` and `WAITLIST_VERIFIED` funnel stages
- New `waitlist` i18n namespace (38 keys x 5 locales)
- Feature flag provides zero-downtime toggle between Coming Soon and normal mode
