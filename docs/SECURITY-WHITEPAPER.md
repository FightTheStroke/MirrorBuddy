# MirrorBuddy Security Whitepaper

**Version**: 1.0 | **Date**: February 2026 | **Classification**: Public

---

## Executive Summary

MirrorBuddy is an AI-powered educational platform designed for students with learning differences. Security and privacy are foundational to our mission—we protect vulnerable users (minors with neurodivergent conditions) while delivering accessible, effective tutoring.

**Key Security Highlights**:

- **EU AI Act Compliant**: High-risk AI system classification with full transparency measures
- **GDPR & COPPA Compliant**: Dual consent model, data minimization, 72-hour breach notification
- **5-Layer AI Safety Defense**: Content filtering, bias detection, crisis escalation
- **WCAG 2.1 AA Accessible**: 7 disability profiles supported
- **Zero PII in AI Training**: Student conversations never retrain models

This whitepaper details our security architecture, data protection practices, and compliance posture for investors, partners, and auditors.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Protection](#3-data-protection)
4. [AI Safety & Governance](#4-ai-safety--governance)
5. [Infrastructure Security](#5-infrastructure-security)
6. [Incident Response](#6-incident-response)
7. [Compliance Certifications](#7-compliance-certifications)
8. [Contact Information](#8-contact-information)

---

## 1. Platform Overview

### Mission

MirrorBuddy provides AI tutoring to students with learning differences (dyslexia, ADHD, visual/motor/auditory impairments, autism, cerebral palsy). Our 26 AI "Maestros" deliver personalized education with embedded, verified knowledge bases.

### Architecture

| Component   | Technology             | Security Features                |
| ----------- | ---------------------- | -------------------------------- |
| Frontend    | Next.js 15             | CSP headers, nonce-based scripts |
| Backend     | Next.js API Routes     | Rate limiting, CSRF protection   |
| Database    | PostgreSQL + pgvector  | AES-256 encryption at rest       |
| AI Provider | Azure OpenAI (primary) | EU data residency, SOC 2 Type II |
| AI Fallback | Ollama (self-hosted)   | Air-gapped alternative           |
| Cache       | Upstash Redis          | Pseudonymized data, 1-hour TTL   |
| Email       | Resend                 | SCCs for EU compliance           |
| Hosting     | Vercel                 | Edge network, DDoS protection    |

### User Base

- **Students**: Ages 6-19, with diagnosed learning disabilities
- **Parents**: Consent management, activity monitoring
- **Educators**: Supplementary teaching tool with transcript access

---

## 2. Authentication & Authorization

### Session-Based Authentication

MirrorBuddy uses secure, session-based authentication with cryptographically signed cookies:

```
Authentication Flow:
1. User authenticates via email/Google OAuth
2. Server generates signed session cookie (HMAC-SHA256)
3. Cookie attributes: httpOnly, secure, sameSite=lax
4. Session validated on each request via validateAuth()
```

### Cookie Security

| Cookie                     | httpOnly | Signed | Purpose               |
| -------------------------- | -------- | ------ | --------------------- |
| mirrorbuddy-user-id        | Yes      | Yes    | Server authentication |
| mirrorbuddy-user-id-client | No       | No     | Client display only   |
| mirrorbuddy-visitor-id     | Yes      | No     | Trial user tracking   |
| csrf-token                 | Yes      | No     | CSRF protection       |

### CSRF Protection

All mutating endpoints (POST/PUT/PATCH/DELETE) require CSRF token validation using the double-submit cookie pattern:

- Tokens generated server-side with cryptographic randomness
- 30-minute expiration with automatic refresh
- Header comparison: `X-CSRF-Token` vs. httpOnly cookie

### OAuth Security

Google OAuth integration uses:

- State parameter for CSRF protection (32-byte random)
- PKCE (Proof Key for Code Exchange) where supported
- Token encryption at rest (AES-256)

### Rate Limiting

| Endpoint Category   | Limit        | Window     |
| ------------------- | ------------ | ---------- |
| Authentication      | 5 requests   | 15 minutes |
| API (authenticated) | 100 requests | 1 minute   |
| API (trial users)   | 30 requests  | 1 minute   |
| AI Chat             | 20 messages  | 1 minute   |

---

## 3. Data Protection

### Data Minimization

MirrorBuddy collects only essential data for educational purposes:

**Collected**:

- Display name, age range, school level
- Learning preferences, accessibility settings
- Conversation history (for continuity)
- Session metadata (timestamps, subjects)

**Not Collected**:

- Real full name or date of birth
- Disability diagnosis details
- School name or address
- IP addresses (except security audit logs)

### Encryption

| Data State   | Encryption | Standard          |
| ------------ | ---------- | ----------------- |
| At Rest      | AES-256    | PostgreSQL TDE    |
| In Transit   | TLS 1.3    | All connections   |
| OAuth Tokens | AES-256    | Application-level |
| Backups      | AES-256    | Automated daily   |

### GDPR Compliance

MirrorBuddy implements all GDPR data subject rights:

| Right                   | Implementation                   |
| ----------------------- | -------------------------------- |
| Access (Art. 15)        | GET /api/privacy/my-data         |
| Erasure (Art. 17)       | POST /api/privacy/delete-my-data |
| Rectification (Art. 16) | Settings UI                      |
| Portability (Art. 20)   | JSON/CSV export                  |
| Restriction (Art. 18)   | AI tutoring pause                |

**Breach Notification**: 72-hour notification to Garante Privacy (Italy) and affected users per GDPR Articles 33-34.

### COPPA Compliance (Children Under 13)

For users under 13 (US) or under 16 (Italy):

1. Parental email collected during onboarding
2. 6-character verification code sent to parent
3. 48-hour expiration for verification
4. Full audit trail of consent actions
5. Parent can revoke consent at any time

### Data Retention

Country-specific retention policies implemented per GDPR Article 5(1)(e):

| Data Category    | Italy                   | UK                 | Germany            |
| ---------------- | ----------------------- | ------------------ | ------------------ |
| Student Profile  | 2 years post-graduation | 2 years            | 2 years            |
| Consent Records  | Until age 18 + 3 years  | Until 18 + 3 years | Until 18 + 5 years |
| Interaction Logs | 6 months                | 6 months           | 6 months           |
| Audit Trails     | 3 years                 | 3 years            | 5 years            |

---

## 4. AI Safety & Governance

### EU AI Act Classification

MirrorBuddy is classified as a **high-risk AI system** (Article 6) due to:

- Educational context affecting minors
- Processing of sensitive data (accessibility profiles)
- Significant impact on learning pathways

We implement Chapter III transparency and oversight requirements.

### 5-Layer Safety Defense

```
Layer 1: Prompt Engineering
├── Knowledge bases with explicit safety guidelines
├── Topic boundaries per Maestro expertise
└── Age-appropriate content constraints

Layer 2: Content Filtering
├── Violence, explicit content, self-harm detection
├── Real-time output scanning
└── Automatic response blocking

Layer 3: Jailbreak Detection
├── Pattern recognition for prompt injection
├── Behavioral anomaly detection
└── Session termination on violation

Layer 4: Crisis Escalation
├── Distress signal recognition (94% accuracy)
├── Automatic teacher/parent notification
└── Human handoff protocol

Layer 5: Human Oversight
├── 5% random sampling of responses
├── Teacher access to full transcripts
├── Quarterly bias audits
```

### Bias Mitigation

- Quarterly testing across diverse student cohorts
- Maestros designed with diverse representation
- Accessibility testing across all 7 disability profiles
- Content moderation for cultural sensitivity

### AI Provider Transparency

| Provider     | Model       | Data Residency   | Certifications           |
| ------------ | ----------- | ---------------- | ------------------------ |
| Azure OpenAI | GPT-4o      | EU (West Europe) | SOC 2 Type II, ISO 27001 |
| Ollama       | Open-source | Self-hosted      | Air-gapped               |

**Critical**: Student conversations are never used to retrain models. All data remains confidential under GDPR.

---

## 5. Infrastructure Security

### Content Security Policy (CSP)

Strict CSP headers prevent XSS attacks:

```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.openai.com;
```

### Input Validation

- All user inputs sanitized before processing
- Parameterized queries via Prisma ORM (SQL injection prevention)
- Output encoding for XSS prevention
- File upload restrictions (type, size, content scanning)

### Dependency Security

- Automated vulnerability scanning (npm audit)
- Dependabot alerts for CVE notifications
- No known critical vulnerabilities in production

### Secrets Management

- Environment variables for all secrets
- No secrets in source code or logs
- Key rotation procedures documented
- Separate secrets per environment (dev/staging/prod)

---

## 6. Incident Response

### Severity Classification

| Level | Category | Response Time | Examples                           |
| ----- | -------- | ------------- | ---------------------------------- |
| P0    | Critical | 15 minutes    | Data breach, child safety incident |
| P1    | High     | 1 hour        | Auth bypass, AI harmful content    |
| P2    | Medium   | 4 hours       | Performance degradation            |
| P3    | Low      | 24 hours      | Minor UI issues                    |

### Data Breach Protocol

1. **Detection** (0-4 hours): Contain breach, assess scope
2. **Notification** (within 72 hours): Garante Privacy + affected users
3. **Remediation**: Patch vulnerability, rotate credentials
4. **Post-Incident**: Root cause analysis, policy updates

### Emergency Contacts

| Service                 | Contact                    |
| ----------------------- | -------------------------- |
| Garante Privacy (Italy) | protocollo@gpdp.it         |
| CERT-Italia             | cert@cert-pa.it            |
| Vercel Support          | https://vercel.com/support |

---

## 7. Compliance Certifications

### Current Compliance

| Regulation            | Status    | Evidence                    |
| --------------------- | --------- | --------------------------- |
| GDPR                  | Compliant | DPIA, DPO appointed         |
| EU AI Act (2024/1689) | Compliant | Model Card, Risk Assessment |
| Italian L.132/2025    | Compliant | AI Policy, Transparency     |
| COPPA                 | Compliant | Parental consent flow       |
| WCAG 2.1 AA           | Compliant | Accessibility audit         |

### Certifications Roadmap

| Certification               | Target Date | Status  |
| --------------------------- | ----------- | ------- |
| Penetration Test (external) | Q1 2026     | Scoping |
| SOC 2 Type I                | Q3 2026     | Planned |
| ISO 27001                   | Q1 2027     | Planned |

### Audit Documentation

- **DPIA**: `docs/compliance/DPIA.md`
- **AI Policy**: `docs/compliance/AI-POLICY.md`
- **Model Card**: `docs/compliance/MODEL-CARD.md`
- **Risk Register**: `docs/compliance/AI-RISK-REGISTER.md`
- **Incident Response**: `docs/compliance/INCIDENT-RESPONSE-PLAN.md`

---

## 8. Contact Information

### Security Team

- **Security Inquiries**: roberdan@fightthestroke.org
- **Privacy/DPO**: roberdan@fightthestroke.org
- **AI Complaints**: www.mirrorbuddy.it/privacy/ai-complaint

### Responsible Disclosure

We welcome security researchers to report vulnerabilities responsibly:

1. Email: roberdan@fightthestroke.org
2. Include: Description, steps to reproduce, impact assessment
3. Response: Acknowledgment within 48 hours
4. Reward: Recognition in security hall of fame

---

## Appendices

### A. Regulatory References

- [EU AI Act (2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [GDPR (2016/679)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Italian L.132/2025](https://www.normattiva.it/)
- [COPPA (16 CFR Part 312)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)

### B. Security Architecture Diagrams

Available upon request under NDA.

### C. Third-Party Security Assessments

Penetration test reports available upon request under NDA.

---

**Document Control**

| Version | Date          | Author                    | Changes         |
| ------- | ------------- | ------------------------- | --------------- |
| 1.0     | February 2026 | MirrorBuddy Security Team | Initial release |

---

_MirrorBuddy is committed to the highest standards of security and privacy in AI-powered education._
