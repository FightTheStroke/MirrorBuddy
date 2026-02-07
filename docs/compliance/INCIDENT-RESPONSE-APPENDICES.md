# Incident Response Plan - Appendices

**Templates & Detailed Procedures**

## A. Internal Communication Templates

### Slack #incident-critical (P0 Initial Alert)

```
:warning: CRITICAL INCIDENT DECLARED

Incident: [TITLE]
Severity: P0 - CRITICAL
Time: [UTC timestamp]
Incident Commander: @[NAME]
War Room: This thread

Initial Impact:
- Users Affected: [~X%]
- Systems Down: [SYSTEMS]
- Severity Indicators: [METRICS]

IC Status: Establishing war room
Next Update: [ETA +15 min]
```

### Slack #incident-critical (Status Updates - Every 30 min for P0)

```
:stopwatch: Status Update - [Elapsed Time]

Investigation Progress:
- Root Cause: [Confirmed/Under Investigation]
- [Key findings]

Actions Taken:
- [Action 1 completed at HH:MM UTC]
- [Action 2 in progress]
- [Action 3 planned]

Estimated Time to Resolution: [ETA]
If delayed >2h: Escalate to CEO
```

### Slack #incident-critical (Resolution Notification)

```
:white_check_mark: INCIDENT RESOLVED

Incident: [TITLE]
Resolution Time: [Duration]
User Impact: [Restored/Partial recovery]
Data Loss: [Yes/No + details]

Post-Incident Review scheduled: [Date/Time]
Assignee for Follow-ups: [NAME]

:memo: Root cause analysis will be shared in post-mortem
```

## B. User-Facing Status Page Updates

### Status Page: Investigating (P0-P1 Only)

```
INCIDENT: [Service/Feature] Degradation

Status: INVESTIGATING

We are experiencing issues with [SERVICE]. Our team is actively investigating.
Real-time updates available below.

Last Update: [HH:MM UTC]
```

### Status Page: Identified (After RCA)

```
INCIDENT: [Service/Feature] Degradation

Status: IDENTIFIED & MITIGATING

Root Cause: [Brief explanation without technical jargon]
Impact: [Which users/features affected]
ETA for Resolution: [HH:MM UTC]

We apologize for the disruption. We are actively deploying a fix.
```

### Status Page: Resolved

```
INCIDENT: [Service/Feature] Degradation

Status: RESOLVED - [HH:MM UTC]

Resolution: [1-2 sentence explanation]
Root Cause: [Brief summary]
Impact Summary: [Duration + affected users]

We will publish a detailed post-mortem within 48 hours.
Thank you for your patience.
```

## C. Data Breach Notification Templates

### DPA Notification (GDPR Article 33)

**Email to: [DPA jurisdiction]**

```
Subject: Data Breach Notification - FightTheStroke Case #[INCIDENT_ID]

Dear Data Protection Authority,

Per GDPR Article 33, we are notifying a personal data breach affecting our users.

INCIDENT DETAILS:
- Date Discovered: [ISO date]
- Type of Data: [categories]
- Approximate Persons Affected: [number]
- Countries of Residence: [ISO country codes]

BREACH CHARACTERISTICS:
- Nature: [unauthorized access/loss/corruption]
- Scope: [% of user base]
- Likelihood of High Risk: [Yes/No + explanation]

MEASURES TAKEN:
- Containment: [what was done]
- Notification: [user communication method]
- Prevention: [corrective measures]

CONTACT:
Name: Roberto D'Angelo
Email: roberdan@fightthestroke.org
Phone: [number]

Documentation: Attached
Incident Report: Available upon request

Best regards,
FightTheStroke Data Protection Officer
```

### User Notification (Email Template)

**Subject: Important - Data Security Incident Affecting Your Account**

```
Dear [User],

We are writing to inform you that we have discovered a security incident that may have affected your personal data. We take this very seriously and are committed to transparency.

WHAT HAPPENED:
On [DATE], unauthorized access to [SYSTEM] exposed [DATA_TYPES].

YOUR DATA AFFECTED:
- Email address
- [Other fields]
[NOT AFFECTED: passwords (encrypted), payment info]

WHAT WE'RE DOING:
✓ Incident contained (fix deployed [DATE])
✓ Investigating root cause
✓ Notifying authorities as required
✓ Enhancing security measures

YOUR ACTIONS (OPTIONAL):
- Change your password at [LINK]
- Review account activity at [DASHBOARD]
- Monitor for suspicious emails

SUPPORT:
Email: roberdan@fightthestroke.org
Phone: [SUPPORT_NUMBER]
FAQ: [LINK_TO_FAQ]

We apologize for this incident and appreciate your trust.

Best regards,
MirrorBuddy Security Team
```

## D. Post-Incident Review Process (Detailed)

### PIR Meeting Agenda (90 minutes)

1. **Timeline Review** (20 min)
   - First incident detection
   - Escalations
   - Mitigation steps
   - Root cause confirmation
   - Full resolution

2. **Root Cause Analysis** (25 min)
   - Technical analysis
   - Contributing factors (people, process, tools)
   - "5 Whys" analysis
   - Evidence: logs, metrics, traces

3. **Impact Assessment** (15 min)
   - Duration of outage
   - Affected users/percentage
   - Financial impact
   - Reputational impact
   - Regulatory implications

4. **Response Assessment** (15 min)
   - What worked well (+"s)
   - What could improve (-s)
   - Did communication protocols work?
   - Were escalations appropriate?

5. **Corrective Actions** (10 min)
   - **Immediate** (1 week): Hotfix, patch, workaround
   - **Medium-term** (1-4 weeks): Improved monitoring, process changes
   - **Long-term** (1-3 months): Infrastructure improvements, automation

6. **Lessons Learned** (5 min)
   - Team takeaways
   - Training needs
   - IRP updates required

### PIR Output Document Template

```markdown
# Post-Incident Review - [Incident Title]

**Date of Incident**: [YYYY-MM-DD HH:MM UTC]
**PIR Date**: [YYYY-MM-DD]
**Incident Commander**: [NAME]
**Severity**: P[0-3]

## Timeline

| Time (UTC) | Event                 | Owner           |
| ---------- | --------------------- | --------------- |
| HH:MM      | Detection             | [System/Person] |
| HH:MM      | Alert triggered       | [Tool]          |
| HH:MM      | INC declared          | [IC]            |
| HH:MM      | Root cause identified | [Tech Lead]     |
| HH:MM      | Fix deployed          | [Engineer]      |
| HH:MM      | Service restored      | [IC]            |

## Root Cause Analysis

**Primary Cause**: [Description]

**Contributing Factors**:

- [Process gap]
- [Knowledge gap]
- [Tool limitation]

**5 Whys**:

1. Why did X happen? → Because Y
2. Why was Y possible? → Because Z
   ...

## Impact

- **Duration**: [HH:MM UTC to HH:MM UTC] = X hours
- **Users Affected**: X,XXX ([%])
- **Severity Impact**: [DATA_LOSS / SERVICE_DEGRADATION / AUTH_FAILURE]
- **Revenue Impact**: €X,XXX
- **Compliance**: [GDPR notification required / DPA contacted / Regulatory authority notified]

## Response Assessment

### Positive (Well Done)

- Good communication cadence
- Quick IC declaration
- Effective escalation

### Could Improve

- Monitoring alert latency (detected after 15 min)
- Documentation gaps (runbook outdated)
- Knowledge silos (only 1 person knew deployment steps)

## Corrective Actions

| Action                  | Timeline | Owner  | Verification        |
| ----------------------- | -------- | ------ | ------------------- |
| Update runbook X        | 1 week   | [NAME] | Code review + E2E   |
| Add monitoring alert Y  | 2 weeks  | [NAME] | Alert fires on test |
| Schedule team training  | 3 weeks  | [NAME] | Completion rate     |
| Infrastructure change Z | 1 month  | [TEAM] | Load test           |

## Lessons Learned

- [Team insight 1]
- [Team insight 2]

## IRP Updates Required

- [Section to update in INCIDENT-RESPONSE-PLAN.md]

**Distribution**: All staff + Compliance + CEO
```

## E. AI Safety Incident Response Procedures

### Bias Detection Response Flow

1. **System Detection** (Automatic)
   - Safety guardrails flag potential bias
   - Incident logged with context

2. **Immediate Actions** (0-5 min)
   - Block AI response delivery
   - Notify Safety Lead + Compliance
   - Log: Input | Flag category | Confidence score

3. **Investigation** (1-4 hours)
   - Human review of flagged content
   - Root cause (training data / model / prompt)
   - User impact assessment

4. **Remediation** (1-24 hours)
   - Content decision (confirm/dismiss flag)
   - If confirmed: Fine-tune or retrain
   - If dismissed: Update guardrails

5. **Communication**
   - Internal: Document in /admin/safety
   - External: Only if user-facing impact
   - Regulatory: If EU AI Act violation

### Harmful Content Response Flow

1. **Detection** (Automatic or Human Report)
   - System flags unsafe response
   - Or user reports via /report form

2. **Immediate Blocking** (0-2 min)
   - Response prevented from delivery
   - User shown fallback message
   - Incident logged with full context

3. **Triage** (5-30 min)
   - Safety Lead reviews context
   - Confirm content is actually harmful
   - Assess user age (child safety priority)

4. **Escalation Decisions**
   - **P0 if**: Content threatens child safety
   - **P1 if**: Harmful but adult user
   - **P2 if**: Borderline case
   - Reference: SAFETY_GUIDELINES.md

5. **Corrective Measures**
   - Model fine-tuning (if systematic)
   - Prompt engineering (if wording issue)
   - User education (if misuse pattern)

## F. Child Safety Incident Procedures

### Trigger Events

- Explicit content exposure to minor
- Predatory interaction detected
- Self-harm discussion (credible threat)
- User discloses abuse to AI

### P0 Response (Immediate - within 15 minutes)

1. **Incident Commander**: Declare P0 + notify CEO
2. **Safety Lead**: Review conversation context
3. **Legal Team**: Assess mandatory reporting obligations
4. **Action**: Disable user account / restrict access
5. **Communication**: Prepare parent notification

### Within 24 Hours

- Complete forensic investigation
- Determine if external reporting required (NCMEC for US users)
- Prepare detailed incident report
- Notify parents/guardians

### Documentation

All child safety incidents documented in:

- `/admin/safety` dashboard (internal)
- Legal file (attorney-client privileged)
- Compliance audit log (confidential)

**Never** store full conversation in standard logs (privacy risk).

## G. EU AI Act Compliance Response

### Violation Triggers

| Violation                | Action                  | Timeline  |
| ------------------------ | ----------------------- | --------- |
| Loss of human oversight  | Disable feature         | Immediate |
| Transparency failure     | Update /ai-transparency | 4 hours   |
| Discrimination violation | Safety review           | 1 hour    |
| Unlawful profiling       | Disable + audit         | 1 hour    |

### Notification Procedure

1. DPO notified (within 1 hour)
2. Assess: Is regulatory authority notification required?
3. Document: Violation type + corrective measures
4. Update: AI Risk Register (ADR 0034)
5. Report: Regulatory authority (if required per jurisdiction)

## H. Communication During Recovery

### During Mitigation (Keep Users Informed)

- Update every 30 minutes (P0)
- Every 2 hours (P1)
- Every 4 hours (P2)

### Messaging Strategy

**DO**:

- Be transparent about scope
- Provide specific ETAs
- Acknowledge impact
- Show progress

**DON'T**:

- Blame users or third parties
- Speculate on causes
- Over-promise on timelines
- Minimize serious issues

---

**For Questions**: See INCIDENT-RESPONSE-PLAN.md Section 7 (Incident Command Structure)
