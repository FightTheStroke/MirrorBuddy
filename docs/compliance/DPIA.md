# Data Protection Impact Assessment (DPIA)

## MirrorBuddy AI-Powered Educational Platform

**Document Version**: 1.0 | **Date**: 20 January 2026 | **Assessment ID**: DPIA-MB-2026-001
**Next Review**: 20 January 2027

---

## Executive Summary

This DPIA assesses high-risk data processing activities under GDPR Article 35, including minors' data (under 16 Italy, under 13 COPPA), vulnerable subjects (7 DSA accessibility profiles), and AI decision-making.

**Conclusion**: Processing activities comply with GDPR, AI Act Article 9, and Italian L.132/2025 Article 3 when mitigation measures are implemented and reviewed annually.

---

## 1. System Description

**Purpose**: AI-powered tutoring platform with 20 AI "Maestros" and personalized learning support.

**Data Subjects**:

- Minors: Ages 8-18 (under 16 Italy, under 13 COPPA US)
- Vulnerable: Dyslexia, ADHD, visual/motor/auditory impairments, autism, cerebral palsy (7 DSA profiles)
- Parents: Consent management and activity monitoring

**AI Components**: Azure OpenAI (primary), Ollama (fallback), RAG semantic search of Maestro knowledge bases.

**Key Data**: Conversations, learning preferences, accessibility settings, profile (name, age range, school level).

**Not Collected**: Real name, DOB, disability diagnosis, school name, IP address (except audit logs).

---

## 2. Legal Basis

| Activity                     | Legal Basis                        |
| ---------------------------- | ---------------------------------- |
| User + parental consent      | GDPR Article 6(1)(a)               |
| Legitimate interest (safety) | GDPR Article 6(1)(f)               |
| Age verification             | GDPR Article 9 (special category)  |
| Accessibility profiling      | Consent-based                      |
| AI decision-making           | AI Act Article 9 (risk management) |

---

## 3. Data Processing Activities

**Collection** (`src/lib/compliance/coppa-service.ts`): Opt-in registration with privacy notice + dual consent (student + parent for under-16/13).

**Processing** (`src/lib/safety/safety-core.ts`):

- Conversations → Azure OpenAI → Sanitized response (5-layer safety: jailbreak detector, content filter, output sanitizer, age-gating, audit trail)
- Age-gating: Topic access restricted by age via `src/lib/safety/age-gating.ts`
- Audit logging: All access logged without PII via `src/lib/safety/audit/audit-trail-service.ts`

**Storage**: Multi-layered encryption architecture (ADR 0126):

- **Database-level encryption**: PostgreSQL encrypted at rest (AES-256), TLS 1.3 in transit
- **Application-level PII encryption**: AES-256-GCM for email, name, and user-generated content (`src/lib/security/pii-encryption.ts`)
- **Cookie encryption**: Session cookies encrypted with AES-256-GCM (`src/lib/auth/cookie-encryption.ts`)
- **Privacy-aware RAG**: PII anonymization before embedding generation and vector storage (`src/lib/privacy/privacy-aware-embedding.ts`)
- **Key management**: Versioned key rotation with Azure Key Vault integration and environment variable fallback
- **Audit trail**: All PII decryption operations logged to AuditLog table (30-day retention)
- **Access control**: User-only access + admin auth via `ADMIN_EMAIL`

**Deletion**: `POST /api/privacy/delete-my-data` cascade deletes profile, conversations, preferences (30-day grace period). Parental delete via Parent Mode.

---

## 4. Necessity & Proportionality

**Necessary to**: Provide tutoring (contract), protect minors (legal obligation), support accessibility (WCAG 2.1 AA).

**Proportionate**: Conversation AI sent to trusted Azure (sanitized); age-gating matches appropriateness; audit logging redacts PII; accessibility is user-initiated; dual consent ensures privacy.

**Alternatives rejected**: Local-only AI (poor performance), no accessibility (WCAG violation), no audit trail (cannot detect violations).

---

## 5. Risk Assessment & Mitigation

See `docs/compliance/DPIA-risks.md` for detailed 12-risk matrix with likelihood×impact scores and mitigation strategies.

**Key risks**: Unauthorized access (R-01), harmful AI content (R-02), missing COPPA consent (R-03).

**Risk verdict**: ACCEPTABLE with planned mitigations (human escalation pathway + complete COPPA email verification in Q1 2026).

### 5.1 External Services Risk Assessment

Per GDPR Article 35(7), this assessment evaluates risks arising from data processing by third-party processors. See `docs/compliance/DPIA-SERVICES.md` for detailed risk analysis.

**Summary**: All 5 primary processors (Supabase, Azure OpenAI, Vercel, Resend, Upstash Redis) assessed with residual risk ratings:

- **EU-only processors** (Supabase, Azure OpenAI): 🟢 NEGLIGIBLE risk
- **Extra-EU with SCCs** (Vercel, Resend): 🟡 LOW risk (mitigated via Standard Contractual Clauses + technical safeguards)
- **Pseudonymized data** (Upstash Redis): 🟢 VERY LOW risk (hashed IDs, 1-hour TTL)

**Overall External Services Risk**: 🟡 **LOW** - All processors compliant with GDPR Chapter V (Articles 44-50). No high-risk or non-compliant transfers identified.

**Supervisory Authority Consultation**: Not required per GDPR Article 36 - residual risks are low and adequately mitigated.

**Full Analysis**: `docs/compliance/DPIA-SERVICES.md` | **Audit Reference**: `docs/compliance/SERVICE-COMPLIANCE-AUDIT-2026-01.md` (21 January 2026)

---

## 6. Mitigation Measures

### Existing (Implemented)

- **5-Layer Safety Defense** (`src/lib/safety/`): Jailbreak detection, content filtering, output sanitization, age-gating, audit trail
- **Dual Consent**: Student + parent email verification
- **Multi-Layered Encryption** (ADR 0126):
  - TLS 1.3 in transit with HSTS preload directive
  - AES-256 database-level encryption at rest
  - AES-256-GCM application-level PII encryption (email, name, user content)
  - AES-256-GCM session cookie encryption
  - Privacy-aware RAG with pre-embedding PII anonymization
  - Azure Key Vault for encryption key management with versioned key rotation
- **Access Control**: Session-based auth; users access own data only
- **Audit Trail**: All access logged (PII-redacted, 90-day retention); PII decryption operations logged separately
- **Accessibility**: 7 DSA profiles; character intensity dial (ADR 0031); 90-day cookie storage

### Planned (Q1 2026)

- **Human Escalation**: Flag high-risk violations for review (T1-02)
- **Complete COPPA Verification**: Fix email verification for parental consent (T1-03)
- **Data Subject Rights Dashboard**: User portal for access/erasure/portability (T1-04)

---

## 7. Data Subject Rights

| Right                  | Implementation                                                                    |
| ---------------------- | --------------------------------------------------------------------------------- |
| Access (Art 15)        | `GET /api/privacy/delete-my-data` - Summary of profile, conversations, audit logs |
| Erasure (Art 17)       | `POST /api/privacy/delete-my-data` - Cascade deletion + 30-day grace              |
| Rectification (Art 16) | Settings UI - Edit profile, accessibility, preferences                            |
| Restrict (Art 18)      | Planned - Request restriction of AI tutoring                                      |
| Portability (Art 20)   | Planned - Export as JSON/CSV (ADR pending)                                        |
| Parental Rights        | View activity, delete data, update child settings                                 |

---

## 8. Governance

**Review Schedule**:

- Annual: Every 20 January
- After change: New processing activity triggers immediate DPIA update
- Quarterly: Risk reassessment by Product Security Team
- Post-incident: Data breach or safety violation requires DPA notification (72 hours if required)

**Consultation**: No prior DPA consultation required - mitigation measures adequately address risks. Consultation triggered only if new processing introduced (e.g., behavioral profiling, AI training).

**Vendor**: Microsoft DPA covers Azure OpenAI; annual security assessment.

---

## 9. Appendices

See supporting documents:

- `docs/compliance/DPIA-risks.md` - Detailed 12-risk matrix with scores
- `docs/compliance/DPIA-SERVICES.md` - External services risk assessment (Vercel, Supabase, Azure, Resend, Upstash)
- `docs/compliance/DPIA-appendices.md` - Data flow diagram, reference files, regulatory citations
- `docs/compliance/GDPR.md` - General GDPR compliance framework

---

## Reference Implementation Files

**Safety**: `src/lib/safety/` (jailbreak-detector.ts, content-filter.ts, output-sanitizer.ts, age-gating.ts)
**Compliance**: `src/lib/compliance/coppa-service.ts`, `src/app/api/privacy/delete-my-data/`
**Accessibility**: `src/lib/accessibility/` (7 DSA profiles), `src/lib/accessibility/a11y-cookie-storage.ts`
**Audit**: `src/lib/safety/audit/audit-trail-service.ts`, `src/lib/safety/monitoring/`

---

**Assessment Verdict**: COMPLIANT with mitigation measures in place | **Next Review**: 20 January 2027

**Regulatory References**: GDPR 2016/679 (Art 35) | AI Act 2024 (Art 9) | L.132/2025 (Art 3) | COPPA Rule (16 CFR 312) | WCAG 2.1 AA
