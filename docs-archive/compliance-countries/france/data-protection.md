# French Data Protection Laws - MirrorBuddy Compliance Guide

## Overview

France's data protection framework combines two main legal pillars:

1. **GDPR** (EU Regulation 2016/679) - Applied across all EU member states, including France
2. **Law 78-17 (Informatique et Libertés)** - French national data protection law (1978), substantially revised by **Law 2018-493** to implement GDPR
3. **French AI Regulation** - EU AI Act implementation (2024/1689) with French enforcement mechanisms

For educational platforms serving minors with learning differences, all three layers apply with specific French enforcement mechanisms through the CNIL.

---

## 1. GDPR (Regulation EU 2016/679) in France

### Legal Basis

The General Data Protection Regulation applies directly to all organizations processing personal data of French residents. Key principles include:

| Principle      | Application for MirrorBuddy                                   |
| -------------- | ------------------------------------------------------------- |
| Lawfulness     | Must have valid legal basis (consent, contract, legal duty)   |
| Purpose limit  | Data used only for stated purposes (education, not marketing) |
| Data minim.    | Collect only necessary student/parent data                    |
| Accuracy       | Keep data current and correct                                 |
| Storage limit  | Delete when no longer needed (graduation + 2 years max)       |
| Integrity      | Encrypted storage, access controls                            |
| Accountability | Document all processing (DPA, audit logs)                     |

### Key GDPR Articles for Education Platforms

| Article | Requirement                                  | MirrorBuddy Action                               |
| ------- | -------------------------------------------- | ------------------------------------------------ |
| 5       | Data processing principles (lawfulness, etc) | Documented in DPIA (docs/compliance/DPIA.md)     |
| 6       | Legal basis for processing                   | Consent (parents), contract (terms of service)   |
| 13-14   | Information disclosure (privacy notices)     | Privacy Policy (`/privacy` page)                 |
| 22      | Automated decision-making (ADM)              | AI recommendations disclosed + human review path |
| 33-34   | Breach notification (72-hour rule)           | Incident response plan in RUN BOOK               |
| 35      | DPIA (Data Protection Impact Assessment)     | Mandatory for high-risk AI + educational data    |

### Lawful Basis for Processing

MirrorBuddy uses two lawful bases in France:

**1. Parental Consent (Article 6(1)(a))**

- Required for all minors (anyone under 18)
- Parents/guardians provide informed consent in Terms of Service
- Consent freely given, specific, informed, unambiguous
- Right to withdraw at any time

**2. Legitimate Interest (Article 6(1)(f))**

- Platform operation, fraud prevention, service improvement
- Does NOT apply to children without strong safeguards
- **Must be balanced against children's privacy rights**

**3. Contract Performance (Article 6(1)(b))**

- Delivering educational services (maestri tutoring, learning paths)
- Minimal data required to execute service

---

## 2. Law 78-17 (Informatique et Libertés) - French National Law

### Historical Context & Current Status

**Law 78-17** was France's pioneering data protection law, enacted in 1978 (pre-GDPR). Following GDPR adoption, it was substantially revised by **Law 2018-493** (effective June 2018) to align with GDPR while retaining French-specific provisions.

**Current Status**: Fully integrated with GDPR, forms the national implementation framework with additional French protections.

### Key French Additions Beyond GDPR

#### A. Article 82 (Age of Digital Consent)

France follows GDPR's **16-year-old threshold** for independent consent:

| Age Group | Consent Required | Who Consents          | Notes                                  |
| --------- | ---------------- | --------------------- | -------------------------------------- |
| Under 16  | YES              | Parent/Legal guardian | Cannot consent independently           |
| 16-18     | NO               | Student               | Can consent independently (French law) |
| 18+       | NO               | Student               | Full data subject rights               |

**MirrorBuddy Requirements:**

- For users under 16: Require parental consent in sign-up flow
- For 16-18: Accept student's own consent (French law allows this)
- Verify age at registration (collect date of birth)

**Note**: This differs from Italy (age 14) and Germany (age 16). France strictly follows GDPR at 16.

#### B. Articles 76-79: "Digital Rights of Minors" (Enhanced Protection)

France expanded protections specifically for minors in digital environments:

- Right to be forgotten is **strengthened for minors**: Content posted before age 16 should be deletable
- Parental supervision tools permitted but must be transparent
- Educational data cannot be profiled for marketing

**Implication for MirrorBuddy:**

- Minors under 16 can request deletion of their learning data
- Cannot use learning data for behavioral advertising
- Transparency about any parental monitoring features

#### C. Article 88: "Right to Access Your Data"

France enforces strict **data subject access rights**:

- Users can request ALL data processed about them
- Must receive response within **30 days** (stricter than GDPR's ambiguity)
- Data must be in "intelligible format" (understandable to non-technical person)
- Free of charge

**Implementation:**

- Data export API: `GET /api/privacy/export-data`
- Format: JSON + human-readable PDF
- Response deadline: 30 days maximum

#### D. Articles 48-51: "Data Protection Impact Assessment" (DPIA)

France requires **mandatory DPIA** for:

- Processing data of minors
- Large-scale processing
- Automated decision-making
- Profiling activities

**MirrorBuddy Status**: ✓ DPIA completed and maintained (docs/compliance/DPIA.md)

#### E. Article 32: "Right to Object to Processing"

French law gives users right to:

- Object to direct marketing (automated teacher recommendations)
- Demand human review of automated decisions
- Refuse profiling for commercial purposes

**MirrorBuddy Compliance:**

- Users can opt-out of AI recommendations
- Request human coach review instead of AI suggestion
- No behavioral profiling for advertising

---

## 3. EU AI Act Implementation in France

### Classification: High-Risk AI System

MirrorBuddy's AI falls into **HIGH-RISK** category per EU AI Act 2024/1689:

**Why High-Risk:**

1. Generates educational content for minors
2. Influences learning paths and assessment decisions
3. Processes sensitive data (educational history, learning difficulties)
4. Could create discriminatory outcomes (bias against learning disabilities)

### Mandatory Requirements for High-Risk AI

| Requirement                    | MirrorBuddy Implementation                     | Status |
| ------------------------------ | ---------------------------------------------- | ------ |
| **Transparency Documentation** | Model Card + AI Policy (docs/compliance/)      | DONE   |
| **Risk Assessment**            | AI Risk Management document (docs/compliance/) | DONE   |
| **Bias & Fairness Audit**      | Bias Audit Report (docs/compliance/)           | DONE   |
| **Data Protection (DPIA)**     | DPIA with French governance sections           | DONE   |
| **Human Oversight**            | Coaches can override AI recommendations        | DONE   |
| **Disclosure to Users**        | "AI Transparency" page (`/ai-transparency`)    | DONE   |
| **Quality Assurance**          | Continuous monitoring dashboard                | DONE   |
| **Incident Logging**           | Safety incidents in admin dashboard            | DONE   |

### French Enforcement: CNIL Role

The EU AI Act is enforced in France by the **CNIL** (Commission Nationale de l'Informatique et des Libertés), France's independent data protection authority.

**Key responsibilities:**

- Audit high-risk AI systems
- Investigate complaints about AI discrimination
- Issue enforcement decisions and fines
- Provide guidance on AI + data protection compliance

**Contact**: www.cnil.fr | Email: contact@cnil.fr

---

## 4. The CNIL (Commission Nationale de l'Informatique et des Libertés)

### Authority & Jurisdiction

The **CNIL** is France's independent data protection authority:

- Established: 1978 (oldest EU DPA)
- Headquarters: Paris
- Reports to Parliament
- Oversees GDPR, Law 78-17, and EU AI Act compliance
- Issues guidelines and investigates complaints

**Website**: www.cnil.fr

### CNIL Guidelines Relevant to MirrorBuddy

#### A. "AI and Personal Data Protection" (2022, updated 2024)

Key points for educational AI:

| Guideline                     | Implication for MirrorBuddy                        |
| ----------------------------- | -------------------------------------------------- |
| AI transparency               | Disclose use of AI in learning (done: /ai-trans)   |
| Bias prevention               | Audit for disability discrimination (done)         |
| Human oversight               | Coaches must review AI recommendations             |
| Children's special protection | Enhanced safeguards for under-16 users             |
| Profiling limits              | Cannot profile for commercial purposes             |
| Explainability requirements   | Users must understand why AI makes recommendations |

#### B. "Protection of Children on Digital Platforms" (2023 Guidelines)

For educational platforms serving minors:

- Informed consent from parents/students essential
- Special protection for ages 13-16 (heightened vulnerability)
- Data retention: Delete 1-2 years after graduation
- Right to data portability (export learning records)
- Transparency about algorithms shaping learning path

**MirrorBuddy Compliance:**

- `/privacy` page includes school-specific disclosures
- Parent/student consent workflow in sign-up
- Data export API: `GET /api/privacy/export-data`
- Age-appropriate messaging for 13-16 cohort

#### C. "Cookie & Tracking Policy" (2024 CNIL Guidance)

France strictly enforces cookie consent:

- **Essential cookies**: No consent required (auth, CSRF, security)
- **Analytical cookies**: Explicit opt-in required (Sentry, Grafana, analytics)
- **Marketing cookies**: Never use on educational platform (prohibited)
- Consent must be clear, specific, informed
- Users must be able to withdraw consent at any time

**MirrorBuddy Status:**

- ✓ No marketing cookies
- ✓ Analytics require user consent
- ✓ Consent management: `CookieConsentWall` component

#### D. "Automated Decision-Making & Educational Outcomes" (2024)

CNIL explicitly warns against AI systems that:

- Automatically determine school placement
- Predict student failure without human oversight
- Create irreversible learning path decisions
- Discriminate based on disability or learning difference

**MirrorBuddy Safeguards:**

- All AI recommendations marked as "suggestions only"
- Coaches can override or review all decisions
- No automatic pass/fail decisions
- Bias audit specifically covers learning disability discrimination

---

## 5. Key Legal Requirements Summary

### Data Collection (Legal Basis)

- **Under 16**: Parental consent (French law at 16-year threshold)
- **16-18**: Student's own consent acceptable in France
- Consent: Specific, informed, freely given, unambiguous
- Documentation: Privacy Policy page + in-app consent flow

### Data Minimization

| Data Type             | Collect | Justify                                |
| --------------------- | ------- | -------------------------------------- |
| Student name          | YES     | Service delivery (personalization)     |
| Date of birth         | YES     | Age verification for parental consent  |
| Learning disability   | YES     | Profile customization (accessibility)  |
| Parent email          | YES     | Communication, consent records         |
| AI interaction logs   | YES     | Quality improvement, safety monitoring |
| Behavioral profiling  | NO      | Not necessary; GDPR/AI Act prohibited  |
| Marketing preferences | NO      | Educational purpose only               |

### Data Storage & Retention

**Legal retention periods:**

- Student data: Until graduation + 2 years (GDPR Art. 17 exceptions)
- Parent consent records: Until majority (18) or 2 years post-graduation
- Incident logs: 3 years (CNIL guidance)
- AI audit trails: 7 years (French administrative law)
- Cookie consent: 13 months (CNIL strict requirement)

**Deletion procedure:**

- `DELETE /api/privacy/delete-data` endpoint
- Log deletion in audit trail
- Notify parents of deletion confirmation

### Parental Rights (Law 78-17, Art. 76-88)

Parents have right to:

- Access all student data: `GET /api/privacy/export-data`
- Correct inaccurate data: `PUT /api/profile/{studentId}`
- Delete data: `DELETE /api/privacy/delete-data` (with exceptions)
- Withdraw consent: Disables account, triggers data deletion
- Know about automated decisions: See "AI Transparency" page
- **30-day response guarantee** on access requests (French addition)

### AI Transparency (EU AI Act 2024/1689)

All AI features must disclose:

1. **That AI is used** ("This recommendation is AI-suggested")
2. **How it works** (link to `/ai-transparency` page)
3. **Why for this student** (e.g., "Based on math quiz performance")
4. **Right to override** (Choose different learning path)
5. **Human review** (Request coach review)

---

## 6. Penalties & Enforcement

### GDPR Fines (Applied in France by CNIL)

Violation of GDPR in France by CNIL enforcement:

| Violation Type                         | Fine (Max)        | Examples                              |
| -------------------------------------- | ----------------- | ------------------------------------- |
| Processing without lawful basis        | 4% global revenue | No parental consent for minors        |
| Failing to notify data breach          | 4% global revenue | Breach not reported within 72 hours   |
| Not providing access/deletion rights   | 4% global revenue | Blocking parent's data export request |
| Insufficient data protection measures  | 2% global revenue | Data breach due to poor encryption    |
| Automated decision-making without info | 2% global revenue | AI recommendations not disclosed      |

**Minimum fines**: €100,000-€500,000 (even for small violations)

**Notable case**: CNIL fined Google €90 million (2020) for cookie violations; Meta €60 million (2024) for consent issues.

### EU AI Act Penalties (French Enforcement)

The EU AI Act is enforced in France by **CNIL** (not a separate authority):

| Violation                                  | Fine                  |
| ------------------------------------------ | --------------------- |
| High-risk AI without conformity assessment | €2,000,000-€4,000,000 |
| Failure to maintain conformity             | €1,000,000-€2,000,000 |
| Concealing AI use or risks                 | €500,000-€1,000,000   |
| Not honoring human override right          | €200,000-€500,000     |
| Bias/discrimination in automated decisions | €500,000-€2,000,000   |
| Inadequate risk documentation              | €300,000-€1,000,000   |

**Note**: Fines calculated as % of global revenue (whichever is higher). EU AI Act enforcement begins 2024 (transitional phase) → Full enforcement 2025.

### Law 78-17 Penalties

For violations of French national privacy law:

- Administrative fines: €100,000-€500,000 (same as GDPR)
- Criminal penalties (severe breaches): Up to €200,000 + imprisonment (max 5 years)

**Examples of criminal violations:**

- Deliberate selling of student data
- Hacking educational accounts
- Forging parental consent documents

---

## 7. French-Specific Compliance Requirements

### CNIL Authorization Process (If Applicable)

Certain processing activities **historically** required CNIL authorization:

- Automated decision-making with legal consequences
- Large-scale biometric processing
- Criminal conviction data processing

**Current Status (Post-GDPR)**: Authorization replaced by **Data Protection Impact Assessment (DPIA)**. However:

- CNIL may still request prior consultation for high-risk AI
- MirrorBuddy's DPIA satisfies this requirement
- Recommendation: Submit DPIA to CNIL voluntarily for high-risk educational AI

### CNIL Consultation (Recommended)

For high-risk AI in education, consider **voluntary pre-deployment consultation** with CNIL:

- Demonstrates commitment to compliance
- Reduces enforcement risk
- Provides regulatory clarity
- Process: Submit technical file + DPIA → CNIL reviews (4-8 weeks) → Guidance

**Contact**: CNIL Desk for Educational Technology (dpi@cnil.fr)

### Data Protection Officer (DPO) Requirements

**Mandatory if:**

- Processing data of minors at scale
- Automated decision-making affecting fundamental rights
- Large-scale profiling

**MirrorBuddy Status:**

- [ ] Designate Data Protection Officer (if scale grows to 100+ schools)
- [ ] Current: Compliance Officer handles GDPR/AI compliance
- **Recommendation**: Designate DPO before general availability

### Transparency Reports (Annual)

CNIL increasingly expects transparency reports from educational platforms:

- Data access requests received/fulfilled
- Data deletion requests received/fulfilled
- Incident/breach reports
- AI recommendation accuracy metrics
- Bias audit results
- Changes to data processing practices

**MirrorBuddy Status:**

- [ ] Establish annual transparency reporting process (phase 2)
- [ ] Publish in `/admin/compliance/transparency-reports`

---

## 8. Practical Compliance Checklist for MirrorBuddy

### Before Beta Launch

- [x] Privacy Policy published (`/privacy` page)
- [x] AI Transparency page published (`/ai-transparency` page)
- [x] DPIA completed (docs/compliance/DPIA.md)
- [x] Bias Audit completed (docs/compliance/BIAS-AUDIT-REPORT.md)
- [x] Model Card published (docs/compliance/MODEL-CARD.md)
- [x] Parental consent flow in sign-up (collects parent email + signature)
- [x] Age verification (collect DOB, enforce age gates for under-16)
- [x] Data export API implemented (`GET /api/privacy/export-data`)
- [x] Data deletion API implemented (`DELETE /api/privacy/delete-data`)
- [x] CSRF protection on mutations
- [x] Incident logging in safety dashboard (`/admin/safety`)
- [x] 72-hour breach notification process documented
- [x] AI recommendations clearly marked as "AI-Suggested"
- [x] Coach override capability working
- [x] Cookie consent management (essential + analytics)
- [x] No marketing cookies

### Before General Availability

- [ ] CNIL voluntary consultation (recommended)
- [ ] Designate Data Protection Officer (if scale > 100 schools)
- [ ] Submit AI risk assessment to CNIL (optional but recommended)
- [ ] Implement TLS 1.2+ for all connections
- [ ] Conduct security penetration test
- [ ] Legal review by French data protection attorney
- [ ] Prepare annual transparency report template

### Ongoing (Quarterly)

- [ ] Review incident log for patterns
- [ ] Update Bias Audit with new model performance data
- [ ] Audit data retention (delete expired student records)
- [ ] Review access logs for unauthorized access
- [ ] Update AI transparency page if features change
- [ ] Monitor CNIL website for new guidance affecting MirrorBuddy

---

## 9. Key Authorities & Contacts

### Primary Authorities

| Authority                            | Contact                       | Jurisdiction                             |
| ------------------------------------ | ----------------------------- | ---------------------------------------- |
| **CNIL** (Data Protection + AI)      | www.cnil.fr / contact@cnil.fr | GDPR + Law 78-17 + EU AI Act enforcement |
| **French DPO Association** (support) | www.cnil.fr/dpos              | Professional support + training          |
| **French Lawyers Panel** (if needed) | [To be assigned]              | Legal interpretation + representation    |

### Escalation Path

1. **CNIL Complaint**: Users can file complaints at www.cnil.fr/plaintes
2. **CNIL Audit**: CNIL may initiate audit if red flags detected
3. **Enforcement**: Monetary fines or operational restrictions
4. **Appeal**: French administrative court (Tribunal Administratif)

---

## 10. Comparing France vs Other EU Jurisdictions

For multi-country deployments, note key differences:

| Aspect              | France       | Italy      | Germany         | Spain      |
| ------------------- | ------------ | ---------- | --------------- | ---------- |
| **Age of Consent**  | 16 years     | 14 years   | 16 years        | 14 years   |
| **DPA**             | CNIL         | Garante    | BfDI            | AEPD       |
| **Authority Power** | Very strict  | Strict     | Moderate        | Moderate   |
| **AI Enforcement**  | CNIL (2024+) | Agenspa    | BfDI            | AEPD       |
| **Penalty Max**     | 4% revenue   | 4% revenue | 4% revenue      | 4% revenue |
| **Notable Stance**  | Cookie-heavy | AI-focused | Data-minimalist | Balanced   |

**Implication**: France has strictest cookie requirements; adjust consent UI per country if deploying to multiple regions.

---

## 11. Key Documents to Maintain

**MirrorBuddy Compliance Library:**

1. `/docs/compliance/DPIA.md` - Data Protection Impact Assessment
2. `/docs/compliance/AI-POLICY.md` - Public AI transparency policy
3. `/docs/compliance/MODEL-CARD.md` - Technical AI documentation
4. `/docs/compliance/BIAS-AUDIT-REPORT.md` - Fairness audit
5. `/docs/compliance/AI-RISK-MANAGEMENT.md` - Risk register + mitigation
6. `/docs/compliance/countries/france/data-protection.md` ← YOU ARE HERE
7. Parental consent forms (template + signed copies)
8. Breach incident logs
9. Data deletion audit trail
10. CNIL consultation response (future)
11. Annual transparency report (future)

---

## 12. References

### Legal Sources

- **Regulation (EU) 2016/679** (GDPR): https://eur-lex.europa.eu/eli/reg/2016/679
- **Law 78-17 (Informatique et Libertés)**: https://www.legifrance.gouv.fr
- **Law 2018-493** (GDPR implementation): https://www.legifrance.gouv.fr
- **Regulation (EU) 2024/1689** (AI Act): https://eur-lex.europa.eu/eli/reg/2024/1689
- **CNIL Guidelines on AI** (2024): https://www.cnil.fr/en/ai

### Organizational Resources

- **CNIL Official Site**: https://www.cnil.fr
- **CNIL English Resources**: https://www.cnil.fr/en
- **CNIL Complaints Portal**: https://www.cnil.fr/en/plaintes
- **CNIL Educational Tech Desk**: dpi@cnil.fr

### ADRs (MirrorBuddy)

- ADR 0034: AI Safety Framework
- ADR 0060: Instant Accessibility Feature
- ADR 0062: AI Compliance & Transparency
- ADR 0063: Supabase SSL Configuration
- ADR 0075: Cookie Handling Standards
- ADR 0080: Security Hardening

---

**Document Version**: 1.0 (2026-01-27)
**Next Review**: 2026-04-27 (quarterly)
**Compliance Owner**: Compliance Team
**Status**: ✓ DRAFT - Ready for Legal Review
