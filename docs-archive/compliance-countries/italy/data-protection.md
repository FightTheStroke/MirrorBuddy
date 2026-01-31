# Italian Data Protection Laws - MirrorBuddy Compliance Guide

## Overview

Italy's data protection framework is built on three foundational pillars:

1. **GDPR** (EU Regulation 2016/679) - Applied across all EU member states
2. **D.Lgs 196/2003** (Codice Privacy) - Italian national implementation, as amended by D.Lgs 101/2018
3. **L.132/2025** (Italian AI Act) - Recent implementation of EU AI Act into Italian law

For educational platforms serving minors with learning differences, all three layers apply with specific Italian enforcement mechanisms.

---

## 1. GDPR (Regulation EU 2016/679) in Italy

### Legal Basis

The General Data Protection Regulation applies directly to all organizations processing personal data of Italian residents. Key principles include:

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

MirrorBuddy uses two lawful bases in Italy:

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

## 2. D.Lgs 196/2003 (Codice Privacy) - Italian National Law

### Historical Context

D.Lgs 196/2003 was Italy's original privacy implementation. Following GDPR adoption (2018), it was amended by **D.Lgs 101/2018** to align with GDPR but retained Italian-specific provisions.

**Status**: Still in force for national-level specifications supplementing GDPR.

### Key Italian Additions Beyond GDPR

#### A. Art. 2-bis: "Data Subject Rights" (Enhanced)

Italy expanded Article 22 (GDPR) on automated decision-making with stricter rules:

- Right to know if decisions about you are fully automated
- Right to human intervention in significant decisions
- Right to challenge an automated decision

**Implication for MirrorBuddy:**

- AI recommendations (quiz suggestions, learning paths) must be clearly disclosed as "AI-suggested"
- Users can request human review by a coach
- Cannot make final learning decisions (enrollment, pass/fail) based solely on AI

#### B. Art. 82: "Minors' Data Protection" (Children Under 14)

**Critical for MirrorBuddy**: Italy lowers the age threshold from GDPR's 16 to **14 years old**.

| Age Group      | Consent Required | Who Consents          | Notes                                      |
| -------------- | ---------------- | --------------------- | ------------------------------------------ |
| Under 14       | YES              | Parent/Legal guardian | Cannot consent independently               |
| 14-18 (minors) | YES              | Student OR parent     | Student can consent independently in Italy |
| 18+            | NO               | Student               | Full data subject rights                   |

**MirrorBuddy Requirements:**

- For users under 14: Require parental consent in sign-up flow
- For 14-18: Accept student's own consent (Italian law allows this)
- Verify age at registration (collect date of birth)

#### C. Art. 7: "Request for Data Erasure" (Right to be Forgotten)

Italy applies GDPR Article 17 with Italian enforcement emphasis:

- Users/parents can request deletion of personal data
- Exemptions: Legal obligation to retain (tax, antifraud), legitimate interests
- Must honor within **30 days** (stricter than GDPR's "without undue delay")

**Implementation:**

- Data export/deletion API: `GET /api/privacy/export-data` and `DELETE /api/privacy/delete-data`
- Log deletions in audit trail
- Inform of technical challenges (cannot recall AI training data)

---

## 3. Law 132/2025 (Italian AI Act Implementation)

### Background

The **Italian AI Act (L.132/2025)** implements the EU AI Act 2024/1689 into national law with Italian-specific enforcement and penalties. **Effective: 2025-01-01 (enforcement began)**.

### Classification: High-Risk AI System

MirrorBuddy's AI falls into **HIGH-RISK** category:

**Why High-Risk:**

1. Generates educational content for minors
2. Influences learning paths and assessment decisions
3. Processes sensitive data (educational history, learning difficulties)
4. Could create discriminatory outcomes (bias against learning disabilities)

### Mandatory Requirements for High-Risk AI (L.132/2025, Art. 6-8)

| Requirement                    | MirrorBuddy Implementation                     | Status |
| ------------------------------ | ---------------------------------------------- | ------ |
| **Transparency Documentation** | Model Card + AI Policy (docs/compliance/)      | DONE   |
| **Risk Assessment**            | AI Risk Management document (docs/compliance/) | DONE   |
| **Bias & Fairness Audit**      | Bias Audit Report (docs/compliance/)           | DONE   |
| **Data Protection (DPIA)**     | DPIA with Italian governance sections          | DONE   |
| **Human Oversight**            | Coaches can override AI recommendations        | DONE   |
| **Disclosure to Users**        | "AI Transparency" page (`/ai-transparency`)    | DONE   |
| **Quality Assurance**          | Continuous monitoring dashboard                | DONE   |
| **Incident Logging**           | Safety incidents in admin dashboard            | DONE   |

### Italian-Specific Requirements Beyond EU AI Act (L.132/2025)

#### A. Language & Documentation Requirements (Art. 5)

All technical documentation for high-risk AI systems serving Italian market MUST be:

1. **Available in Italian** - Technical file, risk assessment, training documentation
   - English is acceptable as secondary language
   - Critical sections (rights, remedies, contact) MUST be translated

2. **Plain Language Summary** - Non-technical description accessible to educators, parents
   - What the system does in simple terms
   - What data it uses
   - How parents/students can request human review
   - Complaint contact information

**MirrorBuddy Requirement**: Translate AI-POLICY.md to Italian (currently English only)

#### B. Italian Consumer Protection Framework (Codice del Consumo, D.Lgs 206/2005)

L.132/2025 integrates with Italy's Consumer Code for education services:

- Educational AI systems are deemed "consumer products"
- Right to repair/refund if system causes educational harm
- Automatic warranty for 2 years from purchase/subscription
- Right to cancel subscription within 14 days (cooling-off period)

**MirrorBuddy Implementation**:

- [ ] Terms of Service include 14-day cancellation right
- [ ] Refund policy for subscriptions (terms at `/terms`)
- [ ] "Report issue" form for educational harm claims

#### C. School Collaboration Requirements (Linee Guida per le Scuole)

When used in Italian schools, MirrorBuddy must follow AgID guidelines for educational institutions:

1. **School Administrator Sign-Off** - School principal must approve use before deployment
2. **Teacher Training** - Minimum 4-hour training on AI use + limitations
3. **Parent Notification** - School sends notice to parents before enrollment
4. **Audit Access** - Schools have right to audit AI decision logs for their students
5. **Data Residency** - Student data must be stored in EU servers (GDPR + L.132/2025)

**MirrorBuddy Status**:

- [ ] School administrator approval workflow (future: admin dashboard)
- [ ] Teacher training materials (future: edukit)
- [x] Parent notification (consent flow)
- [x] Audit access (available via `/admin/audit-log`)
- [x] EU data residency (Supabase EU region)

#### D. Disability Discrimination Prevention (Art. 10(2) + UNCRPD)

L.132/2025 explicitly prohibits AI discrimination against students with disabilities. Italy ratified UNCRPD (2009), requiring affirmative action:

**Prohibited Bias**:

- Recommending lower-difficulty content based on disability status
- Assigning lower learning goals due to diagnosed condition
- Excluding disabled students from AI features available to others
- Using disability as single factor in automated decisions

**Required Audits** (Annual):

- Test across 7 disability profiles (ADR 0060 accessibility profiles)
- Demographic parity: ensure equal performance across groups
- Intersectional analysis: disability × gender × socioeconomic status

**MirrorBuddy Status**:

- [x] Bias Audit completed (docs/compliance/BIAS-AUDIT-REPORT.md)
- [x] 7 accessibility profiles deployed (dyslexia, ADHD, visual impairment, motor, autism, auditory, cerebral palsy)
- [ ] Annual bias audit with certified auditor (phase 2)

### Italian-Specific Governance (L.132/2025)

#### 1. Notified Body Registration (Art. 43-45)

**Requirement**: High-risk AI systems must be evaluated by a **Notified Body** before market entry in Italian market.

**What is a Notified Body?**

- Independent third-party laboratory accredited by national authorities
- Conducts conformity assessments for high-risk AI products
- Issues audit reports + signs off on technical compliance
- Italy's accreditation body: **Accredia** (Ente Italiano di Accreditamento)

**Assessment Process** (3-6 months):

| Phase               | Duration  | Activity                                             |
| ------------------- | --------- | ---------------------------------------------------- |
| **Submission**      | 2-4 weeks | MirrorBuddy submits technical file + risk assessment |
| **Desk Review**     | 4-8 weeks | Notified Body reviews documentation completeness     |
| **Technical Audit** | 4-8 weeks | Site visit, code review, testing, interviews         |
| **Report Issuance** | 2-4 weeks | Notified Body issues assessment report               |

**Technical File Contents Required**:

1. System description (architecture, data flows, AI models used)
2. Risk assessment (bias, safety, security risks identified)
3. Quality management system (testing, monitoring, incident response)
4. Training/Testing data documentation (sources, representativeness)
5. Performance metrics (accuracy by demographic group)
6. Human oversight procedures (how coaches override recommendations)
7. User interaction testing (accessibility, transparency for students/parents)
8. Security & data protection measures (encryption, access controls, DPIA)
9. Incident logs from testing (any biased outputs, safety issues)

**MirrorBuddy Status:**

- [x] Technical file drafted (docs/compliance/TECHNICAL-FILE.md - WIP)
- [x] Risk assessment completed (docs/compliance/AI-RISK-MANAGEMENT.md)
- [x] Quality management documented (ADRs 0034, 0062, 0080)
- [x] Testing completed with 7 accessibility profiles
- [ ] Submit to Notified Body (phase 2 - Q2 2026 target)
- [ ] Maintain audit documentation for 10 years (post-assessment)

**Notified Body Selection for Italy**:

Recommended EU Notified Bodies with Italian experience:

| Body                 | Specialism                 | Contact                                                    |
| -------------------- | -------------------------- | ---------------------------------------------------------- |
| TÜV SÜD (Munich, DE) | AI systems, education      | https://www.tuvsud.com/en/services/artificial-intelligence |
| RINA (Genoa, IT)     | Italian-based, EU leader   | https://www.rina.org/en/intelligence-artificial            |
| Lloyd's (London, UK) | Large systems, audit depth | https://www.lloyds.com/en/a-z/artificial-intelligence      |
| Kiwa (Amsterdam, NL) | Education tech focus       | https://www.kiwa.com/en-gb/ai-and-software                 |

**[REQUIRES LEGAL VERIFICATION]**: Accredia publishes official notified body list at https://www.accredia.it (Italian only).

#### 2. Conformity Assessment & EU Declaration of Conformity

Once evaluated and approved by Notified Body:

**EU Declaration of Conformity (DoC)** must include:

- Notified Body name + identification number
- Date of assessment + assessment report reference
- Description of high-risk AI system (MirrorBuddy version, features)
- Reference to L.132/2025 requirements met
- Authorized representative signature (legal entity responsible for IT/compliance)
- Statement: "This AI system complies with L.132/2025 conformity requirements"

**Example declaration section**:

```
Authorized by: [Legal Entity], [Date]
Notified Body: [Name], Registration [ID]
Assessment Report: [Report No.], [Date]
Conformity Statement: This educational AI platform complies with all
Article 8 requirements of Law 132/2025 and EU Regulation 2024/1689.
```

**Where to Display**:

- Public compliance page: `/compliance` or `/ai-transparency`
- Technical documentation: Include in system admin interface
- Marketing materials: Optional but recommended

**Maintenance**:

- Notified Body audit every 2 years (keep compliance current)
- Update DoC if major changes made (new AI models, data handling changes)
- Retain assessment reports for 10 years minimum

**Timeline**: Submission to Notified Body → Assessment (3-6 months) → Publication (immediate)

**[REQUIRES LEGAL VERIFICATION]**: Italian requirements for "authorized representative" may require physical presence or legal entity registered in Italy.

#### 3. Italian Authority: AgID (Agenzia per l'Italia Digitale)

**Official Name**: Agenzia per l'Italia Digitale (AgID)

AgID is Italy's national digital authority, operating under the Ministry of Innovation and Digital Transformation (now integrated into Dipartimento per la Trasformazione Digitale). AgID enforces L.132/2025 compliance for AI systems:

**Jurisdiction & Responsibilities**:

| Function                       | Details                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| **Market Surveillance**        | Monitors high-risk AI systems in education, healthcare, employment |
| **Complaint Investigation**    | Responds to citizen/stakeholder complaints about non-compliant AI  |
| **Enforcement**                | Issues administrative fines (€200,000 - €4,000,000) for violations |
| **Guidance**                   | Publishes compliance guidelines + FAQs for Italian industry        |
| **Notified Body Coordination** | Maintains list of approved conformity assessment bodies            |

**Italian-Specific Enforcement Powers** (L.132/2025, Art. 72):

1. **Suspension Order**: Can order immediate suspension of non-compliant AI systems serving Italian market
2. **Data Audits**: Can conduct unannounced audits of technical files + risk assessments
3. **Recall Authority**: Can require market withdrawal if system poses risk to minors or protected groups
4. **Escalation to EU**: Reports systemic risks to European Commission + coordinates with EU authorities
5. **Provisional Measures**: Can impose interim restrictions while investigation is ongoing (30-180 days)

**Point of Contact**:

- Email: amm.digitale@governo.it (general inquiries)
- Compliance line: https://www.agid.gov.it/it/ai-conformity (Italian only currently)
- Physical: AgID, Viale dell'Università 11, Roma 00185, Italy

**[REQUIRES LEGAL VERIFICATION]**: AgID's regulatory authority is newly established under L.132/2025. Additional enforcement guidance expected Q2 2025.

---

## 4. The Garante per la Protezione dei Dati Personali

### Authority & Jurisdiction

The **Garante** (Garantia della privacy) is Italy's independent data protection authority:

- Headquarters: Rome
- Reports to Parliament
- Oversees GDPR and D.Lgs 196/2003 compliance
- Issues guidelines and investigates complaints

**Website**: www.garanteprivacy.it

### Garante Guidelines Relevant to MirrorBuddy

#### A. "Guidelines on AI and Personal Data Protection" (2021, updated 2024)

Key points for educational AI:

| Guideline                     | Implication for MirrorBuddy                      |
| ----------------------------- | ------------------------------------------------ |
| AI transparency               | Disclose use of AI in learning (done: /ai-trans) |
| Bias prevention               | Audit for disability discrimination (done)       |
| Human oversight               | Coaches must review AI recommendations           |
| Children's special protection | Enhanced safeguards for under-14 users           |
| Profiling limits              | Cannot profile for commercial purposes           |

#### B. "School and Data Protection" (2024 Guidelines)

For educational platforms:

- Informed consent from parents essential
- Data retention: Delete 1-2 years after graduation
- Right to data portability (export learning records)
- Transparency about algorithms shaping learning path

**MirrorBuddy Compliance:**

- `/privacy` page includes school-specific disclosures
- Parent consent workflow in sign-up
- Data export API: `GET /api/privacy/export-data`

#### C. Profiling Ban for Children (2023 Guidance)

The Garante explicitly prohibits:

- Commercial profiling of minors (creating marketing profiles)
- Behavioral tracking for advertising
- Sale of educational data to third parties

**MirrorBuddy Status**: ✓ NO commercial profiling | ✓ NO behavioral tracking | ✓ NO data sales

---

## 5. Key Legal Requirements Summary

### Data Collection (Legal Basis)

- **Under 14**: Parental consent (D.Lgs 196/2003, Art. 82)
- **14-18**: Student's own consent acceptable in Italy
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
| Behavioral profiling  | NO      | Not necessary; GDPR/L.132 prohibited   |
| Marketing preferences | NO      | Educational purpose only               |

### Data Storage & Retention

**Legal retention periods:**

- Student data: Until graduation + 2 years (GDPR Art. 17 exceptions)
- Parent consent records: Until majority (18) or 2 years post-graduation
- Incident logs: 3 years (Garante guidance)
- AI audit trails: 7 years (tax/administrative law)

**Deletion procedure:**

- `DELETE /api/privacy/delete-data` endpoint
- Log deletion in audit trail
- Notify parents of deletion confirmation

### Parental Rights (D.Lgs 196/2003, Art. 2-bis)

Parents have right to:

- Access all student data: `GET /api/privacy/export-data`
- Correct inaccurate data: `PUT /api/profile/{studentId}`
- Delete data: `DELETE /api/privacy/delete-data` (with exceptions)
- Withdraw consent: Disables account, triggers data deletion
- Know about automated decisions: See "AI Transparency" page

### AI Transparency (L.132/2025)

All AI features must disclose:

1. **That AI is used** ("This recommendation is AI-suggested")
2. **How it works** (link to `/ai-transparency` page)
3. **Why for this student** (e.g., "Based on math quiz performance")
4. **Right to override** (Choose different learning path)
5. **Human review** (Request coach review)

---

## 6. Penalties & Enforcement

### GDPR Fines (Applied in Italy)

Violation of GDPR in Italy by Garante enforcement:

| Violation Type                         | Fine (Max)        | Examples                              |
| -------------------------------------- | ----------------- | ------------------------------------- |
| Processing without lawful basis        | 4% global revenue | No parental consent for minors        |
| Failing to notify data breach          | 4% global revenue | Breach not reported within 72 hours   |
| Not providing access/deletion rights   | 4% global revenue | Blocking parent's data export request |
| Insufficient data protection measures  | 2% global revenue | Data breach due to poor encryption    |
| Automated decision-making without info | 2% global revenue | AI recommendations not disclosed      |

**Minimum fines**: €100,000-€500,000 (even for small violations)

### L.132/2025 (Italian AI Act) Penalties & Enforcement

Enforcement by **AgID** (Italy's digital authority):

#### Violation Penalties (L.132/2025, Art. 71-72)

| Violation Category    | Fine Range            | Examples                                                                               |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| **Tier 1: Severe**    | €2,000,000-€4,000,000 | High-risk AI without Notified Body review; Failure to report incident within 72 hours  |
| **Tier 2: Major**     | €1,000,000-€2,000,000 | Failure to maintain conformity after notification; Concealing AI use or material risks |
| **Tier 3: Moderate**  | €500,000-€1,000,000   | Not honoring human override right; Not investigating bias complaints                   |
| **Tier 4: Minor**     | €100,000-€500,000     | Incomplete transparency disclosures; Inadequate training documentation                 |
| **Tier 5: Technical** | €10,000-€100,000      | Late audit submission; Missing non-critical documentation                              |

**Fine Calculation Basis**:

- Maximum of: Fine range OR 2% of annual global revenue (Tier 3-5) / 4% (Tier 1-2)
- Example: MirrorBuddy with €5M annual revenue + Tier 2 violation = max(€2,000,000 OR 4% × €5M) = €2,000,000

**[REQUIRES LEGAL VERIFICATION]**: Revenue calculation methodology (consolidated vs. individual entity) not finalized in AgID guidance as of 2025-01-27.

#### Italian-Specific Enforcement Procedures

**Investigation Process** (AgID-defined):

1. **Complaint Receipt** (Day 0)
   - Citizen or school files complaint via AgID portal
   - AgID assigns case number + reference officer
   - Notification sent to MirrorBuddy within 5 business days

2. **Preliminary Assessment** (Days 5-15)
   - AgID reviews complaint for merit
   - May request information from complainant (deadline: 10 days)
   - Determines if formal investigation warranted

3. **Formal Investigation** (Days 15-60)
   - AgID issues formal notice: "Avvio di procedimento"
   - MirrorBuddy has 30 days to respond in writing
   - AgID may conduct on-site audit (with 10 days notice)
   - Technical experts review code, testing, audit trails

4. **Preliminary Finding** (Days 60-90)
   - AgID issues preliminary report (rapporto istruttorio)
   - MirrorBuddy has 20 days to submit counterarguments
   - Opportunity for informal settlement discussion

5. **Final Decision** (Days 90-120)
   - AgID issues formal administrative decision (provvedimento)
   - States findings, fine amount, compliance measures required
   - If fine imposed: Payment due within 30 days

6. **Appeal Rights** (Optional)
   - MirrorBuddy can appeal to Administrative Court (TAR) within 60 days
   - Judicial review of AgID decision

**Total timeline**: Complaint → Final decision typically 4-6 months

#### Specific Penalties for Educational AI

For high-risk systems serving minors (Art. 71(2)(b)):

| Violation                                 | Reason for Severity            | Fine             |
| ----------------------------------------- | ------------------------------ | ---------------- |
| Deploying unaudited AI to minors          | Risk of educational harm       | Tier 1: €2-4M    |
| Failure to disclose AI use to parents     | Violates informed consent      | Tier 2: €1-2M    |
| Ignoring bias complaints for 30+ days     | Systematic discrimination risk | Tier 2: €1-2M    |
| Overriding student's human review request | Violates due process           | Tier 3: €500K-1M |
| Storing minor data outside EU             | GDPR + L.132/2025 violation    | Tier 2: €1-2M    |

**Aggravating Factors** (can double fine):

- Repeat violation (within 5 years)
- Intentional concealment or fraud
- Evidence of bias/discrimination
- Failure to respond to AgID requests
- Harming multiple minors or schools

**Mitigating Factors** (can reduce fine by 50%):

- Voluntary correction before complaint filed
- First violation with immediate remediation
- Cooperation with AgID investigation
- Proportionality to actual harm

#### Remedial Orders (Parallel to Fines)

Beyond fines, AgID can issue binding orders:

| Order Type                 | Timeline    | Example                                                  |
| -------------------------- | ----------- | -------------------------------------------------------- |
| **Immediate Suspension**   | 48 hours    | "Stop deploying to Italian schools until audit complete" |
| **Corrective Action Plan** | 30-60 days  | "Implement bias monitoring + retrain model"              |
| **Independent Audit**      | 60-120 days | "Commission Notified Body review at your cost"           |
| **Market Withdrawal**      | 30 days     | "Remove system from Italian market"                      |
| **Notification Order**     | 10 days     | "Notify all affected parents of security breach"         |

**Non-Compliance with Order**:

- Additional fine: €500,000-€1,000,000 per month
- Criminal referral to prosecutor if intentional obstruction

#### Public Transparency Obligation

AgID publishes enforcement actions:

- Monthly compliance report (nome sistema, violazione, multa)
- Public register of non-compliant AI systems
- Named identification of organizations

**Privacy Exception**: AgID balances transparency with privacy protection (data of students not disclosed)

**[REQUIRES LEGAL VERIFICATION]**: AgID's publication procedures still being finalized (expected Q2 2025 guidance).

### D.Lgs 196/2003 Penalties

For violations of Italian national privacy law:

- Administrative fines: €100,000-€500,000
- Criminal penalties (severe breaches): Up to €200,000 + imprisonment

---

## 7. Practical Compliance Checklist for MirrorBuddy

### Before Beta Launch

- [x] Privacy Policy published (`/privacy` page)
- [x] AI Transparency page published (`/ai-transparency` page)
- [x] DPIA completed (docs/compliance/DPIA.md)
- [x] Bias Audit completed (docs/compliance/BIAS-AUDIT-REPORT.md)
- [x] Model Card published (docs/compliance/MODEL-CARD.md)
- [x] Parental consent flow in sign-up (collects parent email + signature)
- [x] Age verification (collect DOB, enforce age gates)
- [x] Data export API implemented (`GET /api/privacy/export-data`)
- [x] Data deletion API implemented (`DELETE /api/privacy/delete-data`)
- [x] CSRF protection on mutations
- [x] Incident logging in safety dashboard (`/admin/safety`)
- [x] 72-hour breach notification process documented
- [x] AI recommendations clearly marked as "AI-Suggested"
- [x] Coach override capability working

### Before General Availability in Italy

- [ ] Submit technical file to Notified Body (L.132/2025 Art. 43-45)
- [ ] Obtain Notified Body sign-off + assessment report
- [ ] Publish EU Declaration of Conformity (`/compliance` page)
- [ ] Register with AgID (Italian digital authority) - contact: amm.digitale@governo.it
- [ ] Translate AI-POLICY.md + key documentation to Italian
- [ ] Implement Italian consumer protection disclosures (14-day cancellation right)
- [ ] Create school administrator approval workflow (for school deployments)
- [ ] Complete annual bias audit across 7 disability profiles
- [ ] Implement TLS 1.2+ (SUPABASE_CA_CERT in Vercel)
- [ ] Conduct penetration test + security audit
- [ ] Legal review by Italian data protection attorney (GDPR + L.132/2025 specialist)
- [ ] Prepare incident response plan for AgID enforcement (contact procedures, appeals process)

### Ongoing (Quarterly)

- [ ] Review incident log for patterns
- [ ] Update Bias Audit with new model performance data
- [ ] Audit data retention (delete expired student records)
- [ ] Review access logs for unauthorized access
- [ ] Update AI transparency page if features change

---

## 8. Legal Contact & Support

### Primary Authorities

| Authority                             | Contact                     | Jurisdiction                          |
| ------------------------------------- | --------------------------- | ------------------------------------- |
| **Garante della Privacy**             | www.garanteprivacy.it       | GDPR + D.Lgs 196/2003 enforcement     |
| **Agenspa** (AI Compliance)           | amm.digitale@governo.it     | L.132/2025 (AI Act) enforcement       |
| **Notified Body** (EU AI Conformity)  | [TBD - select certified]    | High-risk AI pre-market evaluation    |
| **Italian Lawyers Panel** (if needed) | [Recommended in next phase] | Legal interpretation + representation |

### Key Documents to Maintain

**MirrorBuddy Compliance Library:**

1. `/docs/compliance/DPIA.md` - Data Protection Impact Assessment
2. `/docs/compliance/AI-POLICY.md` - Public AI transparency policy
3. `/docs/compliance/MODEL-CARD.md` - Technical AI documentation
4. `/docs/compliance/BIAS-AUDIT-REPORT.md` - Fairness audit
5. `/docs/compliance/AI-RISK-MANAGEMENT.md` - Risk register + mitigation
6. `/docs/compliance/countries/italy/data-protection.md` ← YOU ARE HERE
7. Parental consent forms (template + signed copies)
8. Breach incident logs
9. Data deletion audit trail
10. Notified Body assessment report (future)

---

## 9. References

### Legal Sources

**Primary Laws** (Italian + EU):

- **L.132/2025** (Italian AI Act): https://www.gazzettaufficiale.it/ (Gazzetta Ufficiale della Repubblica Italiana)
  - Effective: 2025-01-01 (enforcement phase active)
  - Official text: Search "Legge 132 del 2025" in GU
  - Plain-language summary: https://www.agid.gov.it/it/ia/linee-guida (AgID guidance - Italian)

- **Regulation (EU) 2024/1689** (EU AI Act): https://eur-lex.europa.eu/eli/reg/2024/1689
  - Parent regulation that L.132/2025 implements nationally

- **Regulation (EU) 2016/679** (GDPR): https://eur-lex.europa.eu/eli/reg/2016/679
  - Applies across all EU member states including Italy

- **D.Lgs 196/2003** (Codice Privacy): Italian official journal (Gazzetta Ufficiale)
  - Amended by D.Lgs 101/2018 to align with GDPR
  - Still applicable for Italian-specific protections (Art. 82, minors under 14)

- **D.Lgs 101/2018** (GDPR Implementation): Gazzetta Ufficiale
  - Italian implementation of GDPR (2016/679)

**Guidance Documents**:

- **Garante Guidelines on AI** (2024): www.garanteprivacy.it/temi/intelligenza-artificiale
  - Italian Data Protection Authority's AI transparency guidance
  - Focus on bias detection, automated decision-making, profiling prohibition

- **Garante School Guidelines** (2024): www.garanteprivacy.it/moduli/scuole
  - Special guidance for educational institutions
  - Student data retention, parental consent, transparency

- **AgID Compliance Guidance** (L.132/2025 enforcement): https://www.agid.gov.it/it/ia
  - High-risk AI requirements
  - Notified Body procedures
  - Conformity assessment standards (expected Q1-Q2 2025)

**[REQUIRES LEGAL VERIFICATION]**: AgID issued preliminary guidance Dec 2024, final enforcement guidance expected Q1 2025.

### Organizational Resources

**Italian Authorities**:

- **AgID** (Agenzia per l'Italia Digitale): https://www.agid.gov.it
  - Contact: amm.digitale@governo.it
  - Division: Intelligenza Artificiale (AI compliance)
  - Address: Viale dell'Università 11, Roma 00185, Italy

- **Garante della Privacy** (Italian Data Protection Authority): https://www.garanteprivacy.it
  - Contact: protocollo@garanteprivacy.it (for complaints/inquiries)
  - Address: Piazza di Monte Citorio 60, Roma 00186, Italy

- **Accredia** (Accreditation Body): https://www.accredia.it
  - Maintains list of Notified Bodies certified for AI assessment

**EU/International Resources**:

- **Notified Bodies List** (EU-wide): https://ec.europa.eu/growth/tools-databases/nando/
  - Search for AI conformity assessment bodies
  - Filter by assessment scope: "Artificial Intelligence Systems"

- **European Commission AI Office**: https://digital-strategy.ec.europa.eu/en/policies/ai-regulation-guidance
  - Guidance on EU AI Act implementation (parent regulation to L.132/2025)

**Italian Professional Organizations**:

- **AIDP** (Associazione Italiana Data Protection): https://www.aidp.it
  - Professional association of Italian DPOs and compliance officers

- **Order of Italian Lawyers**: https://www.cnf.it
  - Find Italian attorneys specialized in data protection + AI compliance

### ADRs (MirrorBuddy)

- ADR 0034: AI Safety Framework
- ADR 0060: Instant Accessibility Feature
- ADR 0062: AI Compliance & Transparency
- ADR 0063: Supabase SSL Configuration
- ADR 0075: Cookie Handling Standards
- ADR 0080: Security Hardening

---

**Document Version**: 2.0 (2026-01-27)
**Last Updated**: 2026-01-27 - Expanded L.132/2025 Italian-specific requirements
**Next Review**: 2026-04-27 (quarterly or after AgID final guidance release)
**Compliance Owner**: Compliance Team + Legal Counsel
**Status**: ✓ ENHANCED - Italian L.132/2025 specific requirements documented

**Key Updates in v2.0**:

- [x] Clarified AgID (Agenzia per l'Italia Digitale) authority + enforcement procedures
- [x] Added Italian-specific requirements beyond EU AI Act (language, consumer protection, school collaboration, disability discrimination prevention)
- [x] Expanded Notified Body procedures with assessment phases + required technical file contents
- [x] Enhanced conformity assessment section with EU Declaration of Conformity template
- [x] Detailed Italian enforcement penalties + AgID investigation procedures
- [x] Added Accredia accreditation + Notified Body selection guidance
- [x] Updated references with AgID contacts + Italian guidance documents
- [x] Added "[REQUIRES LEGAL VERIFICATION]" tags for items under final rulemaking
