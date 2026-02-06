# ADR-0131: SOC 2 Type II Readiness Framework

**Status:** Accepted
**Date:** 2026-02-06
**Context:** Plan 125 W5-SOC2

## Decision

Implement SOC 2 readiness with four policy documents, structured audit logging, and an admin audit log viewer.

## Rationale

- SOC 2 Type II is expected by enterprise school customers
- Audit trail required for CC6.1 compliance (365-day retention)
- Policy documents demonstrate security posture to auditors
- Structured logging enables programmatic analysis and alerting

## Components

### Policy Documents (docs/compliance/soc2/)

1. **Access Control Policy**: RBAC matrix, session management, provisioning/deprovisioning
2. **Change Management Policy**: Code review requirements, CI/CD gates, rollback procedures
3. **Incident Response SOP**: S0-S3 severity levels, escalation matrix, post-mortem template
4. **Vendor Risk Assessment**: All 7 sub-processors with risk level, mitigations, DPA status

### Audit Logging

```
AuditLog model (prisma/schema/audit.prisma)
├── action: AuditAction (union type, 14 event types)
├── actorId, targetId, targetType
├── metadata: JSON text (flexible)
├── ipAddress: VarChar(45) (IPv4+IPv6)
└── createdAt: indexed for time-range queries

recordAuditEvent() --> fire-and-forget, error-swallowed
queryAuditLogs()   --> paginated, filtered, max 200/page
```

### Admin UI

- `audit-log-viewer.tsx`: Table with action filter dropdown, pagination

## Key Patterns

- `recordAuditEvent()` never blocks business logic (swallows errors)
- `AuditAction` union type prevents typos at compile time
- Four separate indexes for efficient query patterns
- 365-day retention with no auto-purge (SOC 2 CC6.1)

## References

- Plan 125 W5 tasks T5-01 through T5-05
- SOC 2 Trust Service Criteria: CC6.1, CC7.2, CC7.3, CC9.2
