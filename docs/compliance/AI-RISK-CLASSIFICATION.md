# AI Risk Classification - MirrorBuddy

**Status**: Published | **Last Updated**: January 27, 2026 | **Regulatory Basis**: EU AI Act 2024/1689

## Executive Summary

MirrorBuddy is classified as a **HIGH-RISK AI system** under EU AI Act Article 6(1) and Annex III, point 3(b) because it:

1. Deploys AI in **education for minors** with learning differences
2. Influences **educational decisions and learning pathways**
3. Processes **sensitive data** (diagnoses of cognitive disabilities)
4. Implements **biometric processing** (voice recognition)

This classification triggers **mandatory conformity assessment** requirements under Chapter III (Articles 8-15) of the EU AI Act.

---

## 1. Legal Basis: Article 6 and Annex III

### Article 6 - Risk Classification Framework

```
Article 6(1): High-risk AI systems
An AI system is classified as high-risk if:
(a) it is intended to be used as a safety component, OR
(b) it is in one of the categories listed in Annex III
```

MirrorBuddy meets criterion **(b)** via **Annex III, point 3(b)**: _"AI systems intended to be used in education or vocational training for determining or significantly influencing access to or placement within educational and vocational institutions."_

### Annex III, Point 3(b) - Educational Classification

MirrorBuddy qualifies under this point because:

| Criterion            | MirrorBuddy Implementation                                         | Assessment                     |
| -------------------- | ------------------------------------------------------------------ | ------------------------------ |
| **Context**          | Educational platform for minors (ages 6-18)                        | ✓ Qualifies                    |
| **Purpose**          | Tutoring in 20+ subjects; adaptive learning paths                  | ✓ Qualifies                    |
| **Influence**        | Generates recommendations for lesson difficulty, next topics, pace | ✓ Influences learning pathways |
| **Access/Placement** | Determines learning path progression, tool access by tier          | ✓ Affects access               |
| **Users**            | Minors with learning differences (protected category)              | ✓ High-risk population         |

**Legal Interpretation**: The system "significantly influences" education via:

- Personalized learning path recommendations
- Adaptive difficulty selection
- Tool and feature access by learning profile
- Performance assessments shaping next lesson content

This is **beyond mere tutoring assistance** → triggers high-risk classification.

---

## 2. Conformity Assessment Requirements

Under **Chapter III (Articles 8-15)**, high-risk systems must:

### 2.1 Technical Documentation (Article 11)

- [ ] System architecture and design documentation
- [ ] Training data sources and processing methods
- [ ] Model cards with performance metrics
- [ ] Risk assessment and mitigation measures
- [ ] Testing and validation protocols
- [ ] Version control and deployment procedures

**MirrorBuddy Status**:

- ✓ Partial: Model cards created (MODEL-CARD.md)
- ✓ Partial: Risk management framework (AI-RISK-MANAGEMENT.md)
- ⚠️ In Progress: Full technical documentation audit (Plan 090, Wave 3)

### 2.2 Quality Management System (Article 8)

MirrorBuddy must maintain:

- [ ] **Data management**: Source validation, bias monitoring, retention policies
- [ ] **Testing and validation**: Unit tests, integration tests, E2E tests
- [ ] **Performance monitoring**: Real-time metrics, degradation detection
- [ ] **Incident management**: Logging, escalation, corrective actions
- [ ] **Human oversight**: Teacher and parent review workflows
- [ ] **Documentation**: Change logs, audit trails, decision records

**MirrorBuddy Status**:

- ✓ Implemented: Unit/E2E testing (npm run test, npm run test:unit)
- ✓ Implemented: Incident logging and safety dashboard
- ✓ Implemented: Human review workflows (parent, teacher, admin dashboards)
- ⚠️ In Progress: Automated performance monitoring (ADR 0047)

### 2.3 Transparency and User Information (Article 13)

Users must be informed:

1. **AI Interaction Disclosure** ← _Users know when they're using AI_
   - ✓ Transparency banners on chat interface
   - ✓ AI toggle in settings page
   - ✓ Privacy policy Section 4 (AI-POLICY.md)

2. **System Capabilities and Limitations** ← _Explicit disclosure of what AI can/cannot do_
   - ⚠️ In Progress: Detailed capability statements in UI
   - ⚠️ In Progress: Clear limitations documentation

3. **Data Processing** ← _How student data is used by AI_
   - ✓ DPIA.md covers data flows
   - ⚠️ In Progress: Student-friendly summary

4. **Rights and Remedies** ← _How to opt-out, complain, escalate_
   - ✓ Privacy policy Section 9 (user rights)
   - ✓ AI-POLICY.md Section 10 (complaints process)

### 2.4 Human Oversight (Article 14)

Humans must retain **meaningful control** over AI decisions:

- [ ] Teachers access full conversation logs (audit trail)
- [ ] Teachers can override AI recommendations
- [ ] Parents receive alerts for significant recommendations
- [ ] Administrators can disable/modify AI behavior
- [ ] Crisis escalation (self-harm, abuse) → Human intervention

**MirrorBuddy Status**: ✓ Implemented

---

## 3. Country-Specific Implementation Status

### 3.1 European Union

**Applicable Law**: EU AI Act 2024/1689 (effective August 2025)

| Requirement                            | Implementation                                | Status             |
| -------------------------------------- | --------------------------------------------- | ------------------ |
| **Article 6**: Risk classification     | HIGH-RISK determined                          | ✓ Complete         |
| **Article 8**: Quality management      | Risk register, safety dashboard, QA protocols | ✓ Complete         |
| **Article 11**: Technical docs         | Model cards, DPIA, architecture docs          | ✓ 80% Complete     |
| **Article 13**: Transparency           | Banners, privacy policy, user disclosures     | ✓ 90% Complete     |
| **Article 14**: Human oversight        | Teacher/parent dashboards, escalation         | ✓ Complete         |
| **Article 17**: Conformity assessment  | CE marking procedure (pending)                | ⏳ Planned Q2 2026 |
| **Article 49**: Post-market monitoring | Safety dashboard, incident logs               | ✓ Complete         |

**Timeline**:

- Q1 2026: Complete technical documentation + transparency
- Q2 2026: External CE conformity assessment audit
- Q3 2026: CE mark and market notification

### 3.2 Italy

**Applicable Law**: Law 132/2025 (National AI Implementation)

| Requirement                 | Implementation              | Status                           |
| --------------------------- | --------------------------- | -------------------------------- |
| **Supplier responsibility** | Company liable for AI harms | ✓ Acknowledged in insurance      |
| **User information rights** | Art. 13-15 compliance       | ✓ Privacy policy updated         |
| **Dispute resolution**      | AGID oversight authority    | ✓ Contact info in privacy policy |
| **Language requirements**   | Italian + English support   | ✓ i18n framework (5 languages)   |
| **Data residency**          | Optional: EU data residency | ✓ Supabase (EU region)           |

**Status**: Fully implemented

### 3.3 United Kingdom (Post-Brexit)

**Applicable Law**: AI Bill (Draft, expected 2026-2027)

**Anticipated requirements** (Pending legal review):

- Similar to EU AI Act (high-risk classification expected)
- Different conformity body requirements
- Transition: EU Act applies during transition period

**MirrorBuddy Status**: Monitoring draft legislation. Current EU compliance provides foundation.

### 3.4 United States

**Applicable Law**: State-level regulations (no federal AI Act yet)

| State               | Status                                  | Requirements                   |
| ------------------- | --------------------------------------- | ------------------------------ |
| **California**      | Blueprint for AI Accountability (draft) | Transparency, risk assessment  |
| **New York**        | AI Bias Audit Law (effective 2025)      | Bias testing, disclosure       |
| **Federal (COPPA)** | Children's Online Privacy (1998)        | Parental consent for <13 users |

**MirrorBuddy Status**:

- ✓ COPPA compliant (age verification, parental consent)
- ✓ NY bias audit: Quarterly fairness testing
- ⚠️ Monitoring CA Blueprint

---

## 4. Conformity Assessment Procedure (Article 19)

### 4.1 Process Overview

```
Step 1: Technical File
├─ System documentation
├─ Risk assessment
├─ Test results
└─ Post-market monitoring plan

Step 2: Notified Body Assessment [Q2 2026]
├─ External auditor reviews technical file
├─ On-site validation of safety controls
└─ Issuance of Conformity Assessment Report

Step 3: Declaration of Conformity (DoC) [Q2 2026]
├─ Sign EU Declaration of Conformity
├─ Affix CE mark
└─ Register with NANDO (EU database)

Step 4: Post-Market Monitoring [Ongoing]
├─ Safety dashboard (active)
├─ Incident reporting
├─ Annual conformity review
└─ Model updates → re-assessment if high-risk changes
```

### 4.2 Notified Body Selection

**Criteria for selecting an EU Notified Body** (Pending legal review):

- Independent certification authority
- NANDO-registered for AI systems
- Expertise in educational AI
- Accreditation: ISO/IEC 17065 or equivalent

**MirrorBuddy Timeline**: Issue RFQ Q1 2026, select body by March 2026.

### 4.3 CE Marking

**Once conformity assessment passes**:

1. Affix **CE mark** to product documentation (privacy policy, admin UI)
2. Publish **EU Declaration of Conformity**
3. Register system in **NANDO database**
4. Notify **national AI authority** (Italy: AGID)

---

## 5. Risk-Based Mitigation (MirrorBuddy Controls)

### 5.1 Educational Risk Mitigation

| Risk                        | Mitigation                                | Evidence                                 |
| --------------------------- | ----------------------------------------- | ---------------------------------------- |
| **Harmful content**         | Content filters + knowledge base curation | SAFETY_GUIDELINES.ts, embedded knowledge |
| **Bias in recommendations** | Fairness testing (quarterly)              | Bias audit reports                       |
| **Hallucination**           | Embedded knowledge bases (not generative) | Model cards                              |
| **Inappropriate for age**   | Age-aware content filtering               | Safety dashboard logs                    |

### 5.2 Data Protection Mitigation

| Control                   | Implementation                     | Status                  |
| ------------------------- | ---------------------------------- | ----------------------- |
| **Encryption at rest**    | AES-256-GCM                        | ✓ TOKEN_ENCRYPTION_KEY  |
| **Encryption in transit** | TLS 1.3                            | ✓ Vercel deployment     |
| **Data minimization**     | Only necessary fields stored       | ✓ DPIA.md               |
| **Retention limits**      | 90 days for audit logs             | ✓ Data retention policy |
| **Parental controls**     | Parent review + consent revocation | ✓ Parent dashboard      |

### 5.3 Transparency Mitigation

| Measure                  | Implementation                      | Visibility        |
| ------------------------ | ----------------------------------- | ----------------- |
| **AI disclosure banner** | Shown on every AI interaction       | Chat interface    |
| **Settings toggle**      | Users can disable AI                | Settings page     |
| **Privacy policy**       | AI-POLICY.md with full transparency | /privacy endpoint |
| **Explainability**       | Teachers see reasoning in logs      | Teacher dashboard |

---

## 6. Annual Compliance Review

**Schedule**: January 2027 (then annually)

### Review Checklist

- [ ] Model performance drift detected? (benchmarks vs. baseline)
- [ ] New high-risk capabilities added? (triggers re-assessment)
- [ ] Safety incidents logged? (any pattern?)
- [ ] User complaints received? (AGID, supervisory authority)
- [ ] Regulatory updates? (EU AI Act enforcement, national law)
- [ ] Third-party AI providers updated? (Azure OpenAI version changes)
- [ ] Conformity maintained? (Re-audit with notified body)

**Owner**: Chief Compliance Officer + AI Risk Lead

---

## 7. References

### Regulatory Documents

- **EU AI Act 2024/1689**: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
  - Article 6: Risk classification
  - Article 8-15: Conformity assessment (Chapter III)
  - Annex III: High-risk categories

- **Law 132/2025** (Italy): National AI implementation

- **GDPR 2016/679**: Data protection framework

- **COPPA** (US): Children's privacy (if US market)

### Internal Documentation

- [AI-POLICY.md](AI-POLICY.md) - Public transparency policy
- [AI-RISK-MANAGEMENT.md](AI-RISK-MANAGEMENT.md) - Risk framework
- [MODEL-CARD.md](MODEL-CARD.md) - Model documentation
- [DPIA.md](DPIA.md) - Data protection impact assessment
- [AI-RISK-REGISTER.md](AI-RISK-REGISTER.md) - Detailed risk tracking

---

## Approval and Sign-Off

| Role                         | Name                       | Date       | Signature |
| ---------------------------- | -------------------------- | ---------- | --------- |
| **CEO / Product Owner**      | Roberto D'Angelo (Interim) | 2026-02-07 |           |
| **Chief Compliance Officer** | Roberto D'Angelo (Interim) | 2026-02-07 |           |
| **AI Risk Lead**             | Roberto D'Angelo (Interim) | 2026-02-07 |           |
| **Legal Counsel**            | Roberto D'Angelo (Interim) | 2026-02-07 |           |

**Pending legal review**: This classification and conformity roadmap must be reviewed by EU AI Act legal specialists before finalization and market entry.

---

**Document Version**: 1.0
**Next Review**: January 27, 2027
**Confidentiality**: Internal + Regulatory Authority (as required)
