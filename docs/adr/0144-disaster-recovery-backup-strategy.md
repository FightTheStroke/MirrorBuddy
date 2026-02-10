# ADR 0144: Disaster Recovery & Backup Strategy

Status: Accepted | Date: 10 Feb 2026 | Plan: none

## Context

MirrorBuddy uses Supabase-managed PostgreSQL in production. No disaster
recovery procedure was documented. RPO/RTO targets were undefined.

## Decision

Rely on Supabase built-in backups with documented recovery procedures:

- **RPO** (Recovery Point Objective): ≤24h (Supabase daily backups, Pro plan)
- **RTO** (Recovery Time Objective): ≤4h (restore from dashboard + migrate)
- **PITR**: Available on Supabase Pro plan (point-in-time recovery, 7 days)

### Recovery Procedure

1. Open Supabase Dashboard → Database → Backups
2. Select backup point (daily or PITR timestamp)
3. Restore to new project or in-place
4. Run `npx prisma migrate deploy` to ensure schema consistency
5. Verify with `./scripts/health-check.sh`
6. Update DNS/environment variables if new project

### User-Level Backup

- `DeletedUserBackup` model stores full user data JSON for 30 days
- GDPR right-to-portability via `/api/admin/users/trash` endpoints
- Automated purge via `/api/cron/data-retention` daily cron

## Consequences

- Positive: Clear recovery path, GDPR-compliant user backups
- Negative: RPO limited by Supabase plan tier (24h on Pro, PITR extra)

## Enforcement

- Rule: `grep -r "DATABASE_URL" .env.example` must show backup docs link
- Check: `./scripts/health-check.sh` validates DB connectivity
