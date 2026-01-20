# Risk Assessment Matrix

## MirrorBuddy DPIA - Detailed Risk Analysis

**Date**: 20 January 2026 | **Assessment ID**: DPIA-MB-2026-001-RISKS

---

## Risk Scoring Methodology

**Scale**: Likelihood (1=rare, 5=likely) × Impact (1=minor, 5=critical) = Risk Level

- **Level 5-7**: HIGH - Require immediate mitigation
- **Level 3-4**: MEDIUM - Require ongoing monitoring
- **Level 1-2**: LOW - Document and review annually

---

## Risk Assessment Matrix

| ID   | Risk                                           | Likelihood | Impact | Score | Level  | Mitigation                                                                                                                                                                  |
| ---- | ---------------------------------------------- | ---------- | ------ | ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | Unauthorized access to conversation data       | 2          | 5      | 10    | HIGH   | Encryption + session auth (`src/lib/auth/validateSessionAuth.ts`) + audit logging (`src/lib/safety/audit/`) + access controls                                               |
| R-02 | AI generates harmful content to minor          | 2          | 5      | 10    | HIGH   | Jailbreak detector (`src/lib/safety/jailbreak-detector.ts`) + content filter (`src/lib/safety/content-filter.ts`) + output sanitizer (`src/lib/safety/output-sanitizer.ts`) |
| R-03 | Parent consent not obtained (COPPA)            | 2          | 5      | 10    | HIGH   | Email verification (`src/lib/compliance/coppa-service.ts`) + timeout enforcement + **PLANNED: Complete email verification (T1-03)**                                         |
| R-04 | Age-gating bypassed via prompt injection       | 2          | 4      | 8     | HIGH   | Age-gating matrix (`src/lib/safety/age-gating-matrix.ts`) + jailbreak detection + content filter sanitization                                                               |
| R-05 | Data breach via Azure OpenAI API               | 1          | 5      | 5     | MEDIUM | Microsoft DPA compliance + network encryption (TLS 1.3) + automated monitoring alerts + 72-hour breach response                                                             |
| R-06 | Accessibility setting data misuse              | 2          | 3      | 6     | MEDIUM | Access logs per user (`src/lib/safety/monitoring/logging.ts`) + cookie storage (90 days max) + user audit trail                                                             |
| R-07 | Vulnerable subject targeted by AI              | 2          | 4      | 8     | MEDIUM | Safety guardrails per DSA profile (`src/lib/accessibility/`) + character intensity dial (ADR 0031) + monitoring                                                             |
| R-08 | Data retention period exceeded                 | 2          | 3      | 6     | MEDIUM | Scheduled deletion job (`vercel.json` cron daily 03:00 UTC) + cascade delete implementation + 30-day grace period                                                           |
| R-09 | Parental dashboard provides excessive insight  | 2          | 3      | 6     | MEDIUM | Limited activity view (no conversation content) + audit trail with timestamps + parental consent requirement                                                                |
| R-10 | AI system trained on student data              | 1          | 5      | 5     | MEDIUM | Azure DPA prohibits training; no model fine-tuning on student data; Ollama fallback is local-only                                                                           |
| R-11 | Inference of sensitive attributes (disability) | 2          | 4      | 8     | MEDIUM | Accessibility profiles are opt-in; no forced profiling; can be disabled anytime by user or parent; stored in cookies only                                                   |
| R-12 | Vendor lock-in (Azure OpenAI)                  | 2          | 3      | 6     | MEDIUM | Ollama fallback provider (`src/lib/ai/providers.ts`) + abstraction layer + data not dependent on vendor                                                                     |

---

## Risk Treatment Summary

### HIGH RISKS (Scores 8-10)

**R-01: Unauthorized Access**

- **Current mitigation**: Session-based auth + user isolation + audit trail
- **Residual risk**: LOW - Encrypted storage + TLS + access controls reduce to acceptable
- **Owner**: Information Security Team
- **Review**: Quarterly

**R-02: Harmful AI Content**

- **Current mitigation**: 5-layer safety defense (jailbreak detection, content filtering, output sanitization, age-gating, audit trail)
- **Residual risk**: LOW - Multiple layers reduce likelihood
- **Owner**: Safety Engineering Team
- **Review**: Continuous (automated monitoring)

**R-03: Missing COPPA Consent**

- **Current mitigation**: Email verification flow with 48-hour expiry
- **Residual risk**: MEDIUM - Email delivery issues possible
- **Planned mitigation**: T1-03 - Complete email verification (Q1 2026)
- **Owner**: Compliance Team
- **Review**: Post-implementation test

**R-04: Age-Gating Bypass**

- **Current mitigation**: Multi-layer age-gating + jailbreak detection
- **Residual risk**: LOW - Jailbreak patterns catch prompt injection
- **Owner**: Safety Engineering Team
- **Review**: Quarterly threat model update

**R-07: Vulnerable Subject Targeting**

- **Current mitigation**: Character intensity dial + DSA safety guardrails
- **Planned mitigation**: T1-02 - Human escalation pathway (Q1 2026)
- **Residual risk**: MEDIUM - Human review adds safety valve
- **Owner**: Product Security Team
- **Review**: Quarterly

**R-11: Sensitive Attribute Inference**

- **Current mitigation**: Opt-in accessibility (no forced profiling) + cookie storage only
- **Residual risk**: LOW - User control + limited storage
- **Owner**: Privacy Team
- **Review**: Annual

---

### MEDIUM RISKS (Scores 4-6)

**R-05: Third-Party Breach**

- **Mitigation**: Microsoft DPA + encryption + monitoring
- **Response plan**: 72-hour DPA notification if required
- **Owner**: Infrastructure Team

**R-06: Accessibility Misuse**

- **Mitigation**: Access logging + limited retention (90 days)
- **Owner**: Privacy Team

**R-08: Data Retention Exceeded**

- **Mitigation**: Automated cleanup job + grace period
- **Owner**: Database Team

**R-09: Parental Over-Insight**

- **Mitigation**: Limited activity view + audit trail
- **Owner**: Product Team

**R-10: Model Training**

- **Mitigation**: DPA prohibition + local fallback
- **Owner**: AI Safety Team

**R-12: Vendor Lock-In**

- **Mitigation**: Ollama abstraction + data portability
- **Owner**: Platform Team

---

## Monitoring & Escalation

**Continuous Monitoring** (Automated):

- Jailbreak attempts flagged via `src/lib/safety/versioning/jailbreak-flagging.ts`
- Violation tracking via `src/lib/safety/monitoring/violation-tracker.ts`
- Audit logs via `src/lib/safety/audit/audit-trail-service.ts`

**Escalation Triggers**:

- HIGH risk violation (R-02: harmful content) → Immediate human review + user notification
- MEDIUM risk with pattern (3+ R-03 COPPA failures) → Compliance team alert
- Data breach (R-05) → Emergency response (24-hour assessment, 72-hour DPA notification)

---

## Risk Acceptance Sign-Off

| Role                    | Review Date | Status                                           |
| ----------------------- | ----------- | ------------------------------------------------ |
| Product Security Lead   | 20 Jan 2026 | ACCEPTED with planned mitigations (T1-02, T1-03) |
| Data Protection Officer | 20 Jan 2026 | ACCEPTED - No prior consultation required        |
| Legal Team              | 20 Jan 2026 | ACCEPTED - Compliant with GDPR, AI Act, COPPA    |

---

**Next Risk Review**: 20 April 2026 (Quarterly)
**Planned Mitigation Completion**: 31 March 2026 (Q1 2026)
