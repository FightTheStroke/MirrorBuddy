# MirrorBuddy Operational Procedures

> Supplementary to [RUNBOOK.md](./RUNBOOK.md)

## Deployment Procedures

### INC-007: Deployment Failure

**Symptoms**: New version doesn't start

**Diagnosis**:
```bash
docker build . 2>&1 | tail -50
npx prisma migrate status
```

**Resolution**:
1. Rollback: `docker pull [prev-tag] && docker-compose up -d`
2. Run migrations: `npx prisma migrate deploy`
3. Redeploy

### INC-008: Certificate/TLS Issues

**Resolution**:
1. Check expiry: `openssl s_client -connect [domain]:443`
2. Renew certificates
3. Verify reverse proxy config

### INC-009: Rate Limiting Triggered

**Symptoms**: 429 errors

**Resolution**:
1. Identify if attack or legitimate traffic
2. Adjust rate limits if needed
3. Add IP to allowlist if false positive

---

## Data Recovery

### INC-010: Data Recovery

```bash
# Stop writes
docker stop mirrorbuddy-app

# Backup current state
docker exec mirrorbuddy-db pg_dump -U mirrorbuddy mirrorbuddy > backup-$(date +%Y%m%d).sql

# Restore from backup
docker exec -i mirrorbuddy-db psql -U mirrorbuddy mirrorbuddy < backup-YYYYMMDD.sql

# Restart
docker start mirrorbuddy-app
```

---

## Post-Incident Process

### Blameless Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date**: YYYY-MM-DD
**Severity**: SEV[1-4]
**Duration**: X hours Y minutes

## Summary
[1-2 sentence description]

## Impact
- Users affected: [number/percentage]
- Features impacted: [list]

## Timeline
- HH:MM - [Event]

## Root Cause
[Technical explanation]

## Resolution
[What fixed it]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action] | [Name] | YYYY-MM-DD |
```

---

## Maintenance Procedures

### Daily Health Check

```bash
curl -s https://[domain]/api/health | jq '.status'
docker stats --no-stream
```

### Weekly Backup Verification

```bash
pg_dump -U mirrorbuddy mirrorbuddy | gzip > weekly-backup.sql.gz
gunzip -t weekly-backup.sql.gz && echo "Backup valid"
```

### Monthly Security Review

- [ ] Review npm audit results
- [ ] Check for dependency updates
- [ ] Review safety system logs
- [ ] Rotate secrets if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial procedures |
