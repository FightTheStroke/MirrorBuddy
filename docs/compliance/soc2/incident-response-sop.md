# Incident Response SOP

> SOC 2 Trust Service Criteria: CC7.2, CC7.3, CC7.4
> Last Updated: 2026-02-06
> Owner: Engineering Lead

## 1. Severity Levels

| Level | Name     | Response Time | Description                          |
| ----- | -------- | ------------- | ------------------------------------ |
| S0    | Critical | < 15 min      | Data breach, total service outage    |
| S1    | High     | < 1 hour      | Major feature unavailable, data loss |
| S2    | Medium   | < 4 hours     | Degraded performance, partial outage |
| S3    | Low      | < 24 hours    | Minor bug, cosmetic issue            |

## 2. Escalation Matrix

| Severity | First Responder   | Escalation To    | Communication    |
| -------- | ----------------- | ---------------- | ---------------- |
| S0       | On-call engineer  | Founder + Legal  | All stakeholders |
| S1       | On-call engineer  | Engineering Lead | Affected users   |
| S2       | Assigned engineer | Team lead        | Internal only    |
| S3       | Assigned engineer | Sprint backlog   | None             |

## 3. Incident Detection

- **Sentry**: Error tracking and alerting (real-time)
- **Vercel**: Deployment health and function errors
- **Upstash**: Redis health monitoring
- **User reports**: Support channel escalation

## 4. Response Procedure

### Phase 1: Triage (< 15 min)

1. Acknowledge incident in tracking system
2. Assess severity level
3. Assign incident commander

### Phase 2: Containment (< 1 hour)

1. Identify root cause
2. Apply immediate mitigation (rollback, feature flag, rate limit)
3. Communicate status to affected parties

### Phase 3: Resolution

1. Implement permanent fix
2. Deploy fix through standard CI/CD
3. Verify resolution in production

### Phase 4: Post-Mortem (< 48 hours)

1. Complete post-mortem document
2. Identify action items
3. Review with team

## 5. Communication Templates

### User Notification (S0/S1)

> We are aware of [issue description] affecting [scope]. Our team is
> actively working on resolution. We will provide updates every [30 min].

### Resolution Notice

> The issue affecting [scope] has been resolved at [time]. Root cause:
> [brief description]. We apologize for the inconvenience.

## 6. Post-Mortem Template

- **Incident**: Title
- **Duration**: Start time - End time
- **Impact**: Number of users affected, features impacted
- **Root Cause**: Technical description
- **Timeline**: Chronological events
- **Action Items**: Preventive measures with owners and deadlines

## 7. References

- DATA-BREACH-PROTOCOL.md (existing)
- Sentry project: mirrorbuddy-nextjs
