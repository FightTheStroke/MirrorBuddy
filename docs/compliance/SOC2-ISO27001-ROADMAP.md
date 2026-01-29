# SOC2 Type II & ISO 27001 Certification Roadmap

## Executive Summary

MirrorBuddy's 12-month path to SOC2 Type II and ISO 27001 certification. MirrorBuddy already implements foundational security controls (session-based auth, CSRF protection, AES-256 encryption, audit logging, WCAG accessibility). This roadmap formalizes policies, documents controls, and prepares evidence for external audit.

**Target completion**: Q4 2026

---

## Current State Assessment

### Strengths (Ready for SOC2/27001)

| Control Area          | Current Implementation                            | Status  |
| --------------------- | ------------------------------------------------- | ------- |
| **Authentication**    | Session-based, validateAuth() (ADR 0075)          | Stable  |
| **CSRF Protection**   | requireCSRF() on mutations, csrfFetch             | Stable  |
| **Encryption**        | AES-256-GCM token encryption (ADR 0080)           | Stable  |
| **Audit Logging**     | Comprehensive activity logging                    | Partial |
| **SSL/TLS**           | Per-connection SSL, no NODE_TLS_REJECT (ADR 0063) | Stable  |
| **Database Security** | Prisma parameterized queries, pgvector (ADR 0028) | Stable  |
| **Accessibility**     | WCAG 2.1 AA (7 DSA profiles)                      | Stable  |
| **Risk Management**   | AI Risk Register (ADR 0034)                       | Partial |

### Critical Gaps (Must Fix for Audit)

1. **Formal documented policies** - Policies exist implicitly in code/ADRs, not as formal documents
2. **Access control documentation** - Only ADMIN_EMAIL boolean; need formal RBAC matrix
3. **Change management process** - Git-based but not audit-logged with change tickets
4. **Incident response playbook** - Logging exists but no formal escalation process
5. **Vendor management** - SERVICE-INVENTORY.md exists but no security assessment/SLAs
6. **Business continuity plan** - No formal BC/DR documentation

---

## SOC2 Type II Trust Service Criteria Mapping

### Common Criteria (CC)

| Criteria                        | Current                    | Gap               | Phase |
| ------------------------------- | -------------------------- | ----------------- | ----- |
| CC6.1 - Logical/physical access | validateAuth(), encryption | Policies needed   | 1     |
| CC6.6 - Privileged access mgmt  | Manual                     | Formal procedures | 1     |
| CC7.1 - Access restrictions     | ADMIN_EMAIL role           | RBAC matrix       | 1     |
| CC7.2 - Encrypted transmission  | TLS verified               | Document          | 1     |
| CC7.3 - Key management          | Vercel env vars            | Rotation policy   | 2     |
| CC8.1 - Change management       | Git-based                  | Formal changelog  | 1     |
| CC9.1 - Configuration mgmt      | IaC partial, Vercel        | Inventory         | 2     |

### Availability (A)

| Criteria                      | Current       | Status  | Phase |
| ----------------------------- | ------------- | ------- | ----- |
| A1.1 - Performance monitoring | `/api/health` | Partial | 1     |
| A2.1 - Disaster recovery plan | None          | Gap     | 3     |
| A2.2 - Recovery testing       | None          | Gap     | 3     |

### Processing Integrity (PI)

| Criteria                    | Current              | Status | Phase |
| --------------------------- | -------------------- | ------ | ----- |
| PI1.1 - Input validation    | Prisma + Zod schemas | Stable | 1     |
| PI1.3 - Data accuracy       | Database constraints | Stable | 1     |
| PI1.5 - Output authenticity | Signed cookies       | Stable | 1     |

### Confidentiality (C)

| Criteria                        | Current            | Status | Phase |
| ------------------------------- | ------------------ | ------ | ----- |
| C1.1 - Confidentiality policies | Informal           | Gap    | 1     |
| C1.2 - Restricted access        | Session-based auth | Stable | 1     |
| C1.3/C1.4 - Encryption          | TLS, AES-256-GCM   | Stable | 1     |

### Privacy (P) - GDPR Aligned

| Criteria                    | Current                      | Status  | Phase |
| --------------------------- | ---------------------------- | ------- | ----- |
| P1.1 - Privacy notice       | `/privacy` page              | Stable  | 1     |
| P2.1 - Data inventory       | DATA-FLOW-MAPPING.md         | Partial | 2     |
| P2.2 - Data minimization    | Trial mode limits (ADR 0056) | Stable  | 1     |
| P3.1 - Retention policy     | DATA-RETENTION-POLICY.md     | Stable  | 1     |
| P4.1 - Consent management   | Cookie consent + TOS         | Stable  | 1     |
| P5.1 - User access rights   | No export endpoint           | Gap     | 2     |
| P5.2 - User deletion rights | Manual process               | Gap     | 2     |

---

## ISO 27001 Annex A Controls Mapping (Summary)

### A.5 Organizational Controls

| Control                         | Gap                        | Phase |
| ------------------------------- | -------------------------- | ----- |
| A.5.1 ISMS Policies             | Formal policy suite needed | 1     |
| A.5.2 Security roles            | RBAC matrix needed         | 1     |
| A.5.3 Segregation of duties     | Automation needed          | 2     |
| A.5.6 Threat/vulnerability mgmt | Formal program             | 2     |
| A.5.7 Supplier relationships    | Vendor assessments         | 2     |
| A.5.10 Incident management      | Formal playbook            | 1     |

### A.6 People Controls

| Control                            | Gap                 | Phase |
| ---------------------------------- | ------------------- | ----- |
| A.6.1 Screening                    | Background checks   | 2     |
| A.6.3 Awareness training           | Program needed      | 3     |
| A.6.5 Termination responsibilities | Offboarding process | 2     |

### A.7 Technical Controls

| Control                   | Gap                   | Phase |
| ------------------------- | --------------------- | ----- |
| A.7.1 Cryptography policy | Document AES-256, TLS | 1     |
| A.7.2 Key management      | Rotation policy (KMS) | 2     |

---

## Gap Analysis Summary

**Foundational Security**: Strong (auth, encryption, CSRF, SSL, audit logging)

**Critical Gaps**: Formal policies, RBAC documentation, change management, incident response, vendor management, BC/DR plan

**Medium Gaps**: Key rotation, DSAR automation, background checks, training

---

## References & Next Steps

**Full implementation details**: See `SOC2-ISO27001-PHASES.md`

**Key documents to create**:

- Information Security Policy Suite (5 docs)
- RBAC matrix and change management process
- Incident response playbook
- Vendor management program
- BC/DR plan

**External support needed**:

- Security policy templates (€3k)
- Pre-audit assessment (€3k)
- SOC2 Type II audit (€8k, 6-month observation)
- ISO 27001 audit (€4k)

**Timeline**: Phase 1 (3 months) → Phase 2 (6 months) → Phase 3 (2 months) → Phase 4 (12 months total)

---

**Version**: 1.0 | **Updated**: 2026-01-29 | **Owner**: Compliance Officer | **Review**: Quarterly
