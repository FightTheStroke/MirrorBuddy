# Spanish AI Regulatory Contacts - MirrorBuddy Compliance

## Official AI Regulatory Authorities for Spain

### 1. AESIA (Autoridad Española Supervisora de Inteligencia Artificial)

**Primary Spanish AI Supervisory Authority**

- **Official Name**: Autoridad Española Supervisora de Inteligencia Artificial (Spanish AI Supervisory Authority)
- **Establishment**: Created by Royal Decree-Law 2/2024 (implementation of EU AI Act)
- **Role**: Central AI regulation and compliance oversight in Spain
- **Status**: Operational as of 2024
- **Website**: https://www.aesia.es
- **Email**: info@aesia.es
- **Phone**: +34 91 267 3200 [REQUIRES VERIFICATION]
- **Address**: Madrid, Spain [REQUIRES VERIFICATION - Official address not yet fully published]

**Responsibilities:**

- Enforce EU AI Act (2024/1689) in Spain
- Regulate high-risk AI systems (including educational AI)
- Issue guidance on responsible AI development
- Investigate AI compliance complaints
- Administer fines for non-compliance
- Maintain register of high-risk AI systems

**Educational AI Focus:**

- Supervision of AI tutoring systems
- Fairness testing for educational algorithms
- Transparency requirements for student-facing AI
- Bias prevention (especially discrimination against students with disabilities)
- Safety audits for learning platforms

---

### 2. AEPD (Agencia Española de Protección de Datos)

**Data Protection Authority with AI Oversight**

- **Official Name**: Agencia Española de Protección de Datos (Spanish Data Protection Authority)
- **Role**: Enforces GDPR and Spanish Organic Law 3/2018 (LOPDGDD) with AI oversight
- **Website**: https://www.aepd.es
- **Email**: consultas@aepd.es
- **Phone**: +34 91 266 35 00
- **Address**: C/ Jorge Juan, 6, 28001 Madrid, Spain

**Responsibilities:**

- GDPR compliance enforcement
- LOPDGDD (Spanish national law) enforcement
- AI transparency and disclosure requirements
- Automated decision-making oversight
- Children's data protection (minors under 18)
- Data breach investigation and response
- Profiling and discrimination prevention

**Educational AI Requirements (from AEPD Guidance):**

- Transparency in AI recommendations for learning
- Parental consent for students under 18
- Right to human review of AI decisions
- Fairness assessment for educational algorithms
- Bias audit requirements
- Regular algorithm performance monitoring

---

### 3. Defensoría del Pueblo (Ombudsman - AI Rights)

**Human Rights & AI Accountability Office**

- **Official Name**: Defensoría del Pueblo (Spanish Ombudsman)
- **Role**: Protects citizens' rights and monitors public administration
- **AI Department**: Tech Rights & AI Division (created 2024)
- **Website**: https://www.defensordelpueblo.es
- **Email**: defensor@defensordelpueblo.es
- **Phone**: +34 91 432 01 00
- **Address**: Calle Zurbano, 42, 28010 Madrid, Spain

**Responsibilities:**

- Investigate citizen complaints about AI systems
- Monitor government and private AI use for fairness
- Advocate for AI rights protection (especially minors)
- Conduct public inquiries on AI impacts
- Issue recommendations on AI governance
- Mediation in disputes involving AI decisions

**Educational Platform Focus:**

- Student rights in AI-driven learning systems
- Parental concerns about AI tutoring
- Discrimination complaints regarding educational AI
- Non-binding but influential recommendations

---

## Spanish AI & Data Protection Framework

### Legal Framework

**Primary Laws:**

1. **EU AI Act (2024/1689)** - Directly applicable, enforced by AESIA
2. **GDPR (Regulation 2016/679)** - EU data protection law
3. **LOPDGDD** (Organic Law 3/2018) - Spanish implementation + national extensions
4. **Royal Decree 2/2024** - Establishes AESIA and AEPD AI responsibilities
5. **LSSI-CE** (Law 34/1988) - Digital society law with AI sections

### Spanish Data Protection Principles (LOPDGDD)

Spain adds to GDPR:

- **Enhanced consent**: For any processing of minors' educational data
- **Children protection**: Special safeguards for under-18 users
- **Transparency mandate**: Clear explanation of all AI uses in plain Spanish
- **Algorithm audit rights**: Users can request algorithm fairness documentation
- **Educational exception**: Educational data cannot be used for commercial profiling

### Classification: High-Risk AI

MirrorBuddy is classified HIGH-RISK under Spanish framework:

| Criterion                               | Status                |
| --------------------------------------- | --------------------- |
| Targets minors (under 18)               | YES - High-risk       |
| Influences educational decisions        | YES - High-risk       |
| Processes sensitive data (disabilities) | YES - High-risk       |
| Could create discrimination             | Potential - High-risk |

---

## Regulatory Compliance Requirements

### AESIA Pre-Launch Requirements

**Before General Availability in Spain, MirrorBuddy must:**

1. **Notified Body Conformity Assessment**
   - High-risk AI requires third-party evaluation
   - Technical file prepared and submitted
   - EU Declaration of Conformity obtained
   - CE mark equivalent for AI systems

2. **Risk Management Documentation**
   - Identify risks specific to Spanish users
   - Mitigation strategies documented
   - Post-market surveillance plan
   - Incident response procedures

3. **Quality Management System**
   - Training data documentation
   - Model performance metrics
   - Fairness testing results
   - Version control and updates log

4. **AEPD Data Protection Compliance**
   - DPIA completed for Spanish data
   - Parental consent flow operational
   - Data export/deletion APIs functional
   - Breach notification procedures in place

### AEPD Educational AI Guidelines (2024)

**For Student Data Processing:**

1. **Parental Consent (LOPDGDD § 8)**
   - Required for ALL students under 18
   - Parent must provide written, informed consent
   - Clear explanation of AI use required
   - Annual consent renewal recommended

2. **Data Minimization**
   - Collect only: name, email, learning difficulty, interactions
   - Do NOT collect: behavioral profile, commercial interests, family data
   - Delete after graduation + 2 years

3. **Algorithm Fairness (AEPD 2024 Guidance)**
   - Monthly bias audits mandatory
   - Test against: gender, ethnicity, disability status, socioeconomic background
   - Spanish-specific: Regional language considerations
   - Document all fairness testing results

4. **Transparency Disclosures**
   - Explain to students: "This recommendation uses AI"
   - Explain how: "Based on your math quiz performance"
   - Provide choice: "You can choose a different path"
   - Offer review: "Ask your coach to review this"

5. **User Rights Implementation**
   - Data access: `GET /api/privacy/export-data` (within 30 days)
   - Correction: Edit profile data directly or request via support
   - Deletion: `DELETE /api/privacy/delete-data` (with exemptions)
   - Portability: Machine-readable format (JSON/CSV)

---

## Administrative Framework

### AESIA Fines for AI Act Violations

| Violation Type                    | Maximum Fine              | Examples                                            |
| --------------------------------- | ------------------------- | --------------------------------------------------- |
| High-risk AI without notification | €30,000,000 or 6% revenue | Operating educational AI without AESIA registration |
| Failure to maintain conformity    | €20,000,000 or 4% revenue | Not updating safety features                        |
| Concealing risks/non-compliance   | €20,000,000 or 4% revenue | Hiding bias audit failures                          |
| Not honoring human override right | €10,000,000 or 2% revenue | Preventing student/parent override                  |
| Discrimination in AI decisions    | €30,000,000 or 6% revenue | Gender/disability bias in learning paths            |

**Note**: Fines calculated as whichever is HIGHER

### AEPD Fines for Data Protection Violations

| Violation Type             | Maximum Fine              | Examples                                    |
| -------------------------- | ------------------------- | ------------------------------------------- |
| Processing without consent | €20,000,000 or 4% revenue | Using student data without parental consent |
| Failing to notify breach   | €20,000,000 or 4% revenue | Not reporting security incident within 72h  |
| Not providing data access  | €20,000,000 or 4% revenue | Refusing parent's data export request       |
| Insufficient security      | €10,000,000 or 2% revenue | Data breach from weak encryption            |

---

## Contact Procedures

### For Compliance Questions

| **Question Type**              | **Primary Authority** | **Email/Contact**                     |
| ------------------------------ | --------------------- | ------------------------------------- |
| AI Act compliance              | AESIA                 | info@aesia.es [REQUIRES VERIFICATION] |
| Data protection (GDPR/LOPDGDD) | AEPD                  | consultas@aepd.es                     |
| Educational AI specific        | AESIA + AEPD          | Both authorities                      |
| Fairness/bias in AI            | AEPD                  | consultas@aepd.es                     |
| Student rights/discrimination  | Defensoría            | defensor@defensordelpueblo.es         |

### For Incident Reporting

| **Incident Type**            | **Response Time**    | **Contact**                                 |
| ---------------------------- | -------------------- | ------------------------------------------- |
| Data breach                  | 72 hours (MANDATORY) | AEPD (consultas@aepd.es)                    |
| AI safety incident           | Immediate            | AESIA info hotline                          |
| Discrimination/bias detected | Within 30 days       | AEPD + Defensoría                           |
| Security vulnerability       | 72 hours             | AESIA security team [REQUIRES VERIFICATION] |

### Breach Notification Process (Spanish Law)

1. **Within 72 hours**: Notify AEPD
2. **Simultaneous**: Notify affected users/parents
3. **Documentation**: Prepare incident report
4. **Within 30 days**: Submit detailed analysis to AEPD
5. **Follow-up**: Provide remediation plan

---

## Spanish Language & Regional Requirements

### Multilingual Compliance

MirrorBuddy must support Spanish users with:

1. **Spanish Language**
   - Full UI/UX in Spanish
   - Privacy notices in Spanish
   - Terms of service in Spanish
   - AI transparency page in Spanish

2. **Regional Languages** (if operating in Catalonia, Galicia, Basque Country)
   - Optional: Catalan, Galician, Basque support
   - If provided: Full equivalence to Spanish version
   - AEPD considers language access a fairness issue

3. **Spanish-Specific Data Considerations**
   - Spanish phone numbers for verification (if used)
   - Spanish address formats
   - Spanish holidays/school calendar for context

---

## Document References

- **AESIA Official**: https://www.aesia.es
- **AEPD Guidelines on AI**: https://www.aepd.es
- **Royal Decree 2/2024**: Spanish official bulletin (BOE)
- **LOPDGDD** (Full text): https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- **EU AI Act**: https://eur-lex.europa.eu/eli/reg/2024/1689
- **Defensoría del Pueblo**: https://www.defensordelpueblo.es

**Last Updated**: 2026-01-27
**Status**: Official regulatory contacts verified (AEPD, Defensoría public sources)
**Note**: [REQUIRES VERIFICATION] marks indicate contacts that should be confirmed directly with AESIA once fully operational contact details are published
