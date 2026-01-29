# Incident Response Plan (IRP)

**Last Updated**: 2026-01-29
**Version**: 1.0
**Scope**: MirrorBuddy AI Educational Platform
**Compliance**: EU AI Act (2024/1689), GDPR, Italian Law 132/2025

## 1. Executive Summary

This Incident Response Plan defines procedures for detecting, responding to, and recovering from incidents affecting MirrorBuddy's confidentiality, integrity, availability, safety, and regulatory compliance.

All incidents are classified by severity (P0-P3) with escalation triggers and response timelines. Special procedures apply to AI safety incidents (bias detection, harmful content), data breaches (GDPR 72h notification), and child safety events (immediate escalation).

## 2. Severity Levels & Response Timelines

| Level  | Category     | Examples                                                                                                 | Detection  | Response | Escalation                                 |
| ------ | ------------ | -------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------ |
| **P0** | **CRITICAL** | System outage, data breach, child safety incident, AI generating harmful content                         | 5-15 min   | 15 min   | Immediate to CEO + DPO + Compliance        |
| **P1** | **HIGH**     | Major feature failure, AI safety trigger, authentication bypass, payment processing down                 | 30-60 min  | 1 hour   | VP Eng + Safety Lead + Compliance (15 min) |
| **P2** | **MEDIUM**   | Performance degradation (>50ms p99), partial service outage, single maestro offline, email delivery down | 1-4 hours  | 4 hours  | Eng Team Lead + Product Manager            |
| **P3** | **LOW**      | Minor UI issues, cosmetic bugs, low-impact performance (10-50ms p99), single language feature down       | 8-24 hours | 24 hours | Assigned engineer + Jira ticket            |

### Response Time Definitions

- **Detection**: Time from incident occurrence to identification by monitoring/user report
- **Response**: Time to establish incident command, begin investigation, communicate status
- **Resolution**: Time from detection to system recovery or workaround deployment

## 3. Escalation Matrix

### P0 Critical Incidents

**Initial Notification (within 5 min of detection)**:

- Incident Commander (on-call via PagerDuty)
- VP Engineering
- CEO (for breaches/safety)
- DPO (Data Protection Officer)
- Compliance Lead

**Actions**:

1. Declare incident, establish war room (Slack #incident-critical)
2. Assign incident commander (rotate weekly)
3. Begin communication protocol (see Appendices)
4. For data breach: Trigger GDPR notification procedures
5. For child safety: Notify NCMEC (if US), activate parental notification workflow

### P1 High Incidents

**Initial Notification (within 30 min)**:

- Incident Commander
- VP Engineering / Team Lead
- Safety Lead (if AI safety trigger)
- Compliance Officer (if auth/regulatory impact)

**Actions**:

1. Assess impact scope
2. Update incident status channel (#incidents-p1)
3. Begin root cause analysis
4. Notify affected users if > 5% user base impacted

### P2 Medium Incidents

**Notification (within 1 hour)**:

- Team Lead + Assigned Engineers
- Product Manager (if customer-facing)

**Actions**:

1. Start investigation
2. Create post-mortem ticket (if infrastructure)
3. Notify users only if service degradation > 2 hours

### P3 Low Incidents

**Notification**:

- Assigned Engineer
- Create Jira ticket for backlog

## 4. Special Procedures: AI & Safety Incidents

### AI Safety Incident Triggers (Auto-escalate to P0/P1)

1. **Bias Detection**: Safety guardrails flag discriminatory content
   - Action: Block output, escalate to Safety Lead, notify user
   - Review: Human review before re-enabling model

2. **Harmful Content**: System detects unsafe responses (violence, self-harm, illegal content)
   - Action: Immediate response blocking, incident logging
   - Review: Compliance review + model fine-tuning assessment

3. **Child Safety Alert**: Minor disclosed in unsafe situation or explicit content exposure
   - Action: P0 escalation, parental notification, platform restriction
   - Legal: Contact legal/compliance team for investigation

4. **Model Hallucination**: AI provides factually incorrect information (especially in STEM)
   - Action: P1 escalation if affecting >100 users
   - Review: Fine-tuning reassessment, knowledge base validation

5. **EU AI Act Compliance Breach**: Violation of transparency, human oversight, or non-discrimination requirements
   - Action: P0 escalation, DPO notification, incident logging
   - Notification: Regulatory authority (if required)

### EU AI Act Compliance Response (High-Risk AI System)

**Trigger**: Incident affecting transparency, human oversight, or non-discrimination obligations

**Procedure**:

1. Notify DPO within 24h (incident details, users affected)
2. Assess regulatory reporting requirement
3. If breach confirmed: Regulatory authority notification per jurisdiction
4. Document: Incident report + corrective measures in AI Risk Register (ADR 0034)
5. Communication: Publish incident on `/admin/safety` dashboard (internal)

## 5. GDPR Data Breach Response (72-Hour Timeline)

**Data Breach Definition**: Unauthorized access, loss, or corruption of personal data

### Immediate Actions (0-1 hour)

1. Confirm breach occurred (not false alarm)
2. Assess scope: Which data? Which users? Which jurisdictions?
3. Contain breach: Revoke compromised credentials, patch vulnerability, isolate affected systems
4. Preserve evidence: Log retention for investigation

### Notification Phase (0-72 hours)

**DPA Notification (within 72h of discovery)**:

- DPA email: [configure per jurisdiction - Italy: garante@gpdp.it]
- Required info: Nature of breach | Data category | Approximate user count | Likely consequences | Measures taken
- Document: File in `/admin/safety` dashboard under "DPA Notifications"

**User Notification** (if required):

- Notification method: Email + in-app notification
- Content: Breach nature | Data affected | Recommended actions | Contact info
- Without undue delay if high risk (or per jurisdiction requirements)

**Regulatory Authority** (if applicable):

- Consumer protection authority (if country-specific requirement)
- Sector authority (if healthcare/finance data involved)

### Investigation Phase (72h+)

1. Root cause analysis
2. Forensic investigation (if malicious)
3. Impact assessment per user
4. Corrective measures + timeline
5. Post-incident review (see Section 6)

## 6. Post-Incident Review Process

**Timing**: Scheduled within 48h of incident resolution (P0-P1) or within 1 week (P2-P3)

**Participants**:

- Incident Commander
- Technical leads involved
- Product Manager
- Safety Lead (if AI-related)
- DPO (if data-related)

**Review Components** (see INCIDENT-RESPONSE-APPENDICES.md):

1. **Timeline**: Minute-by-minute incident progression
2. **Root Cause**: Technical analysis + contributing factors
3. **Impact**: Users affected, revenue impact, regulatory implications
4. **Response Assessment**: What worked well? What failed?
5. **Corrective Actions**:
   - Immediate fixes (deployed within 1 week)
   - Medium-term improvements (1-4 weeks)
   - Long-term preventive measures (1-3 months)
6. **Lessons Learned**: Document for team + update IRP if needed
7. **Follow-up**: Assign owner for each corrective action + due dates

**Distribution**: Post-mortem document shared internally + regulatory summary (if applicable)

## 7. Incident Command Structure

### Roles (Per Incident)

| Role                   | Responsibilities                                        | Escalation Authority   |
| ---------------------- | ------------------------------------------------------- | ---------------------- |
| **Incident Commander** | Overall coordination, communication, decision authority | CEO (P0) / VP Eng (P1) |
| **Technical Lead**     | Root cause analysis, remediation planning               | IC                     |
| **Communication Lead** | Internal + external status updates                      | IC                     |
| **Compliance Lead**    | Regulatory requirements assessment                      | DPO / CEO              |
| **Safety Lead**        | AI safety assessment, corrective measures               | Compliance             |

### On-Call Rotation

- **Incident Commander**: Rotates weekly (Google Calendar integration)
- **On-call page**: PagerDuty configured for escalations
- **Fallback**: CEO on-call if primary unavailable

## 8. Communication Templates & External Notifications

See **INCIDENT-RESPONSE-APPENDICES.md** for:

- Internal incident updates (Slack templates)
- User-facing status page updates
- Regulatory authority notifications
- DPA data breach notifications
- Press release templates (for P0 breaches)
- Parental notification templates (child safety incidents)

## 9. Preventive Controls & Monitoring

### Incident Detection

1. **Automated Monitoring**:
   - Uptime checks (Vercel + Grafana Cloud)
   - Error rate thresholds (> 5% = alert)
   - Performance alerts (p99 > 500ms)
   - AI safety rule violations (auto-escalate)

2. **Health Checks**:
   - Database connectivity
   - Third-party service status (Azure OpenAI, Resend)
   - Cron job execution (daily verification)

3. **Log Analysis**:
   - Security events (failed auth, CSRF violations)
   - Data access patterns (anomaly detection)
   - Error logs (grouped by severity)

### Communication Channels

- **#incident-critical**: Real-time P0 coordination
- **#incidents-p1**: High-priority incidents
- **#product-issues**: P2-P3 tracking
- **Status Page**: https://status.mirrorbuddy.app/ (public)
- **Admin Dashboard**: `/admin/safety` (incident logging, metrics)

## 10. Document Control

| Item                 | Details                                   |
| -------------------- | ----------------------------------------- |
| **Owner**            | DPO + Compliance Lead                     |
| **Review Frequency** | Annually or after major incident          |
| **Version Control**  | Git tracked in `/docs/compliance/`        |
| **Distribution**     | All staff (onboarding + annual refresher) |
| **Training**         | Quarterly incident response drills        |

---

**Related Documents**:

- AI-RISK-MANAGEMENT.md - AI safety guardrails
- DPIA.md - Data protection impact assessment
- GDPR.md - GDPR compliance procedures
- ADR 0034 - AI Safety Framework
- ADR 0047 - Grafana Cloud Observability
