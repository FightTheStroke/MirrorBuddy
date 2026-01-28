# Incident Response Plan (IRP) - MirrorBuddy

**Status:** 🟠 Draft / Implementation in Progress
**Last Updated:** 2026-01-28

## 1. Goal

Ensure a rapid, coordinated, and effective response to security incidents, protecting user data (especially minors) and system integrity.

## 2. Status Tracking

| Feature                                | Status     | Notes                                            |
| :------------------------------------- | :--------- | :----------------------------------------------- |
| **Data Breach Notification Flow**      | ✅ Done    | Integrated in `docs/compliance/GDPR.md`          |
| **Technical Logging (Sentry/Grafana)** | ✅ Done    | Configured in `src/lib/observability`            |
| **Internal Escalation Path**           | ❌ To Do   | Need to define contact points for security team  |
| **Post-Mortem Templates**              | ✅ Done    | Available in `docs/incidents/templates`          |
| **Legal/Regulatory Reporting**         | 🟠 Partial | GDPR 72h notice documented, EU AI Act notice TBD |

## 3. Incident Severity Levels

- **P0 (Critical):** Confirmed data breach of personal information (PII). Full system outage.
- **P1 (High):** Unauthorized access to internal tools (Prisma Studio, Admin UI).
- **P2 (Medium):** AI Safety violation (Maestro giving inappropriate advice).
- **P3 (Low):** Minor UI bugs or performance degradation.

## 4. Response Workflow

1. **Identification:** Alert from Grafana or user report.
2. **Containment:** Isolate affected services/users.
3. **Eradication:** Patch vulnerability or rotate keys.
4. **Recovery:** Restore from backup if necessary.
5. **Notification:** Notify DPA/Users within 72h if PII is involved.

## 5. To Do List

- [ ] Define "Security Officer" role and contact details.
- [ ] Conduct a tabletop simulation of a data breach.
- [ ] Automate account lockout on suspicious Admin login attempts.
