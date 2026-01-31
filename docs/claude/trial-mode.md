# Trial Mode

> Anonymous trial with limited access, anti-abuse scoring, GDPR consent gate, and conversion to Base tier

## Quick Reference

| Key          | Value                                         |
| ------------ | --------------------------------------------- |
| Path         | `src/lib/trial/`                              |
| Consent UI   | `src/components/trial/trial-consent-gate.tsx` |
| Tier Service | `src/lib/tier/tier-service.ts`                |
| Anti-Abuse   | `src/lib/trial/anti-abuse.ts`                 |
| ADR          | 0056, 0057, 0098                              |

## Trial Limits

| Resource       | Limit    | Tracking            |
| -------------- | -------- | ------------------- |
| Chat messages  | 10/month | Per visitor session |
| Voice minutes  | 5 min    | Counted separately  |
| Tool calls     | 10/month | Per invocation      |
| Documents      | 1        | PDF/image upload    |
| Maestri        | 3        | Randomly assigned   |
| Coach sessions | 1        | Study method only   |

## Session Tracking

- Visitor identified by httpOnly cookie (`mirrorbuddy-visitor-id`) + salted IP hash
- IP hashing: `SHA-256(ip + IP_HASH_SALT)` -- salt rotated monthly via cron
- Cookie clearing alone does not reset limits (IP hash persists server-side)
- Global budget cap: EUR 100/month across all trials (Redis-backed)

## GDPR Consent Gate (ADR 0098)

Trial activation requires explicit consent before any data collection:

```typescript
// Wraps trial UI -- blocks children until consent given
<TrialConsentGate>{children}</TrialConsentGate>
// Sets cookie: mirrorbuddy-trial-consent (365 days)
// API: POST /api/trial/session returns 403 without consent cookie
```

## Anti-Abuse Scoring

| Behavior                 | Points  | Threshold            |
| ------------------------ | ------- | -------------------- |
| Multiple visitors per IP | +1 each | Score > 10 = blocked |
| IP rotation by visitor   | +2      | HTTP 429 returned    |
| Visitor re-registration  | +3      | 24-hour cooldown     |

## Data Retention (GDPR Art. 5)

| Data                   | Retention | Action     |
| ---------------------- | --------- | ---------- |
| Session without email  | 30 days   | Deleted    |
| Session with email     | 90 days   | Anonymized |
| Cron: `data-retention` | Daily 3AM | Automated  |

## Conversion Flow (ADR 0057)

1. Trial user submits beta request (name, email, motivation)
2. Admin reviews at `/admin/invites` -- approve/reject
3. Approved: credentials via email, optional trial data migration
4. First login: forced password change, migration choice UI

## Key Files

| File                                       | Purpose                       |
| ------------------------------------------ | ----------------------------- |
| `src/lib/trial/trial-service.ts`           | Session creation, IP hashing  |
| `src/lib/trial/anti-abuse.ts`              | Abuse scoring and blocking    |
| `src/lib/trial/trial-cleanup.ts`           | 30/90-day retention cleanup   |
| `src/app/api/trial/session/route.ts`       | Session API (consent + abuse) |
| `src/app/api/cron/rotate-ip-salt/route.ts` | Monthly salt rotation         |

## Env Vars

`IP_HASH_SALT` (32+ chars, rotate monthly), `CRON_SECRET`, `RESEND_API_KEY`

## See Also

- ADR 0056 (trial architecture), ADR 0098 (security hardening), ADR 0057 (invite system)
- `docs/claude/tier.md` -- tier limits and TierService API
- `docs/claude/cookies.md` -- visitor cookie details
