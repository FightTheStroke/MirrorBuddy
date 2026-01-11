# MirrorBuddy Incident Response Runbook

> ISE Engineering Fundamentals: [Incident Management](https://microsoft.github.io/code-with-engineering-playbook/observability/incident-response/)

## Quick Reference

| Severity | Response Time | Examples |
|----------|---------------|----------|
| SEV1 - Critical | 15 min | Service down, data loss, safety system failure |
| SEV2 - High | 1 hour | Major feature broken, high error rate |
| SEV3 - Medium | 4 hours | Minor feature broken, degraded performance |
| SEV4 - Low | Next business day | Minor bugs, cosmetic issues |

## Emergency Contacts

```
# During development phase - update for production
Primary:    Roberto (project owner)
Secondary:  [TBD - assign before production]
Escalation: [TBD - assign before production]
```

## Incident Response Process

### 1. Detection & Triage (0-15 min)

```bash
# Quick health check
curl -s https://[your-domain]/api/health | jq

# Check container status
docker ps -a | grep mirrorbuddy
docker logs mirrorbuddy-app --tail 100
```

### 2. Initial Assessment

- [ ] What is the user impact?
- [ ] When did the issue start?
- [ ] What changed recently (deployments, config)?
- [ ] Is this affecting safety systems? (ESCALATE IMMEDIATELY if yes)

### 3. Communication Template

```
INCIDENT: [Brief description]
SEVERITY: SEV[1-4]
IMPACT: [Users affected, features down]
STATUS: Investigating / Mitigating / Resolved
NEXT UPDATE: [Time]
```

---

## Common Incidents

### INC-001: Application Not Starting

**Symptoms**: Health check fails, 502/503 errors

**Diagnosis**:
```bash
docker logs mirrorbuddy-app --tail 200
docker exec mirrorbuddy-app env | grep -E "(DATABASE|AZURE)"
```

**Resolution**:
1. Verify DATABASE_URL
2. Check for missing environment variables
3. Restart: `docker restart mirrorbuddy-app`

### INC-002: Database Connection Failures

**Symptoms**: "Connection refused", health check database fail

**Diagnosis**:
```bash
docker exec mirrorbuddy-db pg_isready
docker exec mirrorbuddy-db psql -U mirrorbuddy -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution**: Check connections, restart db if needed, check disk space.

### INC-003: Voice API Failures

**Symptoms**: Voice sessions fail, WebRTC errors

**Resolution**:
1. Verify Azure credentials
2. Check rate limiting (429 errors)
3. Check browser WebRTC support

### INC-004: High Memory Usage

**Symptoms**: OOMKilled, slow responses

**Resolution**:
1. Restart container
2. Check for memory leaks
3. Increase container memory limit

### INC-005: Safety System Alerts

**SEVERITY**: SEV1 if bypassed, SEV2 if working correctly

**Response**:
1. If false positive: Review patterns
2. If genuine attempt: Document
3. If bypass detected: IMMEDIATE ESCALATION

### INC-006: Slow API Responses

**Diagnosis**:
```bash
docker exec mirrorbuddy-db psql -U mirrorbuddy -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

**Resolution**: Add indexes, enable caching, check AI provider.

---

## Related Documents

- [RUNBOOK-PROCEDURES.md](./RUNBOOK-PROCEDURES.md) - Maintenance and post-incident procedures
- [SLI-SLO.md](./SLI-SLO.md) - Service level definitions

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial runbook |
