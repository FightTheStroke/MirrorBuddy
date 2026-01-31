# Spain Data Protection Legislation

## Overview

Spain has a comprehensive data protection framework combining EU-wide GDPR (Regulation EU 2016/679) with national LOPDGDD (Ley Orgánica 3/2018) that provides additional Spanish-specific protections and enforcement mechanisms.

**Jurisdiction**: Spain (EU Member State)
**Enforcement Authority**: AEPD (Agencia Española de Protección de Datos)
**Legislation**:

- GDPR (Regulation EU 2016/679) - EU-wide framework
- LOPDGDD (Ley Orgánica 3/2018) - National implementation
- Royal Decrees (RD) implementing national details

---

## 1. GDPR Foundation (EU 2016/679)

### Core Principles

All personal data processing in Spain must comply with GDPR's 6 core principles:

| Principle                     | Spanish Implementation                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| **Lawfulness**                | Processing requires legal basis (Art. 6 GDPR) + consent or contract   |
| **Fairness**                  | No deceptive practices; transparent collection methods                |
| **Transparency**              | Privacy notices required before any processing                        |
| **Purpose limitation**        | Data used ONLY for original purposes (no secondary use)               |
| **Data minimization**         | Collect ONLY necessary data; no excess collection                     |
| **Accuracy**                  | Keep data current; delete inaccurate records immediately              |
| **Storage limitation**        | Retain only as long as necessary (max 3 years for most personal data) |
| **Integrity/Confidentiality** | Secure processing; prevent unauthorized access                        |
| **Accountability**            | Document compliance (DPIAs, Privacy Impact Assessments)               |

### Legal Bases for Processing (Art. 6 GDPR)

Spanish organizations may process personal data only if:

1. **Explicit consent** - User opt-in with clear, informed agreement
2. **Contract** - Data necessary to perform contract with data subject
3. **Legal obligation** - Required by Spanish law (tax, employment, etc.)
4. **Vital interests** - Emergency protection of life/health
5. **Public task** - Necessary for public authority functions
6. **Legitimate interests** - Organization's interests (must balance with user rights)

**Spain-specific note**: Spanish laws often impose processing as legal obligations (e.g., invoicing, tax reporting). These override consent requirements but must be disclosed.

### Special Categories (Art. 9 GDPR)

**Prohibited data without explicit consent**:

- Racial/ethnic origin
- Political opinions
- Religious beliefs
- Union membership
- Genetic data
- Biometric data (for ID)
- Health data
- Sex life/sexual orientation data

**Spanish additions**: Health data is heavily regulated in Spain; medical institutions require explicit consent + documented security measures (see Section 5).

---

## 2. LOPDGDD - Spanish National Implementation

### Law Details

**Full name**: Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y Garantía de los Derechos Digitales

**Purpose**: Implement GDPR in Spanish law + add national protections

**Key additions**:

- Right to digital oblivion
- Right to data portability (expanded)
- Right to object to automated decisions
- Digital rights protections
- Enhanced security standards for sensitive sectors
- Special rules for Spanish public administration
- Cookies and electronic marketing regulations

### Spanish-Specific Rights (LOPDGDD)

#### 1. Right to Digital Oblivion ("Derecho al Olvido")

Users can request deletion of personal data in additional circumstances beyond GDPR:

- Data no longer necessary for original purpose
- Withdrawal of consent (beyond GDPR baseline)
- Data of minors (stricter than GDPR)
- Public authority processing no longer justified

**Deadline for response**: 10 business days (stricter than GDPR 30 days)

**Spanish-specific**: Special rules for online content (news, search engines must de-index expired data)

#### 2. Data Portability (Art. 20 GDPR + LOPDGDD)

- Right to obtain personal data in machine-readable format (JSON/CSV)
- Can request direct transfer to another provider
- Must be available within **8 days** (not 30)
- Free of charge (no administrative fees)

#### 3. Right to Object to Automated Decisions

- Users can refuse automated profiling (beyond GDPR)
- Right to human review if decision affects legal rights
- Applies to: recommendation algorithms, credit scoring, hiring filters

#### 4. Digital Rights Protection (LOPDGDD Chapter IV)

Organizations must:

- Respect digital identity
- Protect against digital violence (harassment, defamation online)
- Ensure digital accessibility
- Provide transparent terms of service (no hidden clauses)

### LOPDGDD for Minors

**Age threshold**: Under 14 years old

**Requirements**:

- Parental/guardian consent required (not child self-consent)
- Cannot process data of minors without explicit parental opt-in
- Higher deletion thresholds (must delete within 60 days vs 30)
- Educational institutions must appoint Data Protection Officer (DPO)

**MirrorBuddy note**: If serving Spanish minors, require parental consent via email verification

---

## 3. AEPD - Enforcement Authority

### Agencia Española de Protección de Datos

**Website**: https://www.aepd.es
**Established**: 1992 (pre-GDPR)
**Jurisdiction**: All data processing in Spain + Spanish companies processing anywhere
**Authority**: Issues fines, conducts audits, investigates complaints

### AEPD Powers

- **Investigation**: Can demand documents, audit processing activities, conduct inspections
- **Enforcement**: Issues administrative sanctions (fines)
- **Guidance**: Publishes position papers, guidelines, recommendations
- **Training**: Offers courses on GDPR compliance
- **Complaint handling**: Public can file complaints for violations

### Filing a Complaint with AEPD

Users can file complaints if their data rights are violated:

**Process**:

1. Submit complaint form on aepd.es (online or postal)
2. AEPD investigates within 3 months
3. Public hearing offered
4. AEPD issues decision (settlement, fine, or dismissal)
5. Appeal possible through Spanish courts

**Complaint deadline**: 3 years from violation

---

## 4. Key Compliance Requirements for Spain

### Data Processing Agreements

**Required for**:

- Any third-party vendor accessing personal data
- Cloud providers storing customer data
- Payment processors
- Analytics tools (Google Analytics, Mixpanel)
- AI service providers

**Must include**:

- Description of processing purposes
- Type of data processed
- Security measures required
- Data subject rights (deletion, portability)
- Prohibition on unauthorized processing
- Sub-processor rules (vendor's vendors must be approved)
- Indemnification clauses

**Spanish addition**: Must be in Spanish or legally certified English translation.

### Privacy Impact Assessments (DPIA)

**Required when**:

- Processing children's data
- Processing health/financial data
- Using automated decision-making
- Large-scale surveillance
- Any "high-risk" processing

**Contents**:

1. Purpose and necessity assessment
2. Legitimate interest balancing test
3. Data minimization review
4. Security risk analysis
5. Mitigation measures
6. Consultation with AEPD (if high-risk)

**Deadline**: Before processing begins

### Data Breach Notification

**Notification required if**:

- Unauthorized access to personal data
- Data loss
- Encryption bypass
- Ransomware attack affecting PII

**Who to notify**:

1. **AEPD**: Within 72 hours (mandatory)
2. **Data subjects**: Within 15 days (if high risk to rights)

**What to include**:

- Description of breach
- Likely consequences
- Measures taken/planned
- Data Protection Officer contact

**No notification needed if**: Encrypted data accessed (encryption keys remain secure)

### Data Protection Officer (DPO)

**Required for**:

- Public authorities
- Educational institutions
- Large-scale systematic monitoring
- Organizations processing large volumes of special categories

**MirrorBuddy applicability**: Likely required if processing health/educational data of Spanish minors at scale

**Responsibilities**:

- Monitor GDPR compliance
- Advise on DPIAs
- Receive and investigate complaints
- Coordinate with AEPD
- Maintain register of processing activities

---

## 5. Spanish-Specific Sectors

### Health Data (Special Category)

**Legislation**:

- GDPR Art. 9 (special categories)
- LOPDGDD Art. 9-11 (health sector specific)
- Healthcare Laws (Ley 41/2002)

**Requirements**:

- Health data processing ONLY for healthcare, research, or insurance
- Explicit written consent required
- Pseudonymization mandatory (remove identifiers before processing)
- Data protection by design (security-first architecture)
- Cannot use health data for profiling/discrimination
- Healthcare institutions must conduct annual security audits

### Education Data

**Legislation**: LOPDGDD Art. 6 (educational data)

**Requirements**:

- Parents/guardians control their child's educational data
- School must appoint DPO
- Limit retention (delete when student leaves institution)
- Cannot share with third parties without consent
- Educational records must be protected (no public access)

### Employment Data

**Legislation**: LOPDGDD Art. 88 (employment processing)

**Requirements**:

- Employer must justify business need for each data point
- Monitoring (video/email) allowed only with employee notice + union consultation
- Cannot require authorization to access social media accounts
- Severance must include data deletion confirmation
- Salary data is strictly confidential

### Public Administration Data

**Legislation**: LOPDGDD Chapters I-II (public sector)

**Requirements**:

- All processing must have legal basis (law, duty, public interest)
- Transparency reports required (annual public disclosure of data uses)
- Subject access requests within 10 days (not 30)
- DPIA mandatory for all processing
- Public administration registers must be publicly available

---

## 6. Spanish Penalties & Enforcement

### Administrative Fines

**Tier 1 (Minor violations)**: Up to €100,000

- **Examples**: Failure to respond to data subject request, incomplete Privacy Notice
- **Recovery period**: 2 years

**Tier 2 (Moderate violations)**: Up to €10,000,000 or 2% annual turnover (whichever higher)

- **Examples**: Unauthorized processing, failure to implement security, missing DPA
- **Recovery period**: 3 years

**Tier 3 (Serious violations)**: Up to €20,000,000 or 4% annual turnover (whichever higher)

- **Examples**: Processing without legal basis, violating consent rights, selling data
- **Recovery period**: 3 years

**AEPD calculation**:

- Fine amount based on severity, intent, financial benefit, damage
- Repeated violations = higher multiplier
- Large companies (>€100M turnover) = maximum fines applied more often

### Example Recent Fines (2021-2024)

| Company              | Violation                | Fine  | Year |
| -------------------- | ------------------------ | ----- | ---- |
| WhatsApp Spain       | Inadequate transparency  | €8.5M | 2021 |
| Google Spain         | Cookies without consent  | €10M  | 2022 |
| Banco Bilbao Vizcaya | Unauthorized marketing   | €2.6M | 2023 |
| Telefónica Spain     | Excessive data retention | €8.1M | 2023 |

### Criminal Penalties (Beyond Administrative Fines)

Spanish courts can impose **criminal penalties** for:

- Unauthorized access to databases (1-2 years imprisonment)
- Selling/distribution of personal data (1-3 years imprisonment)
- Misuse of processing (6 months-3 years imprisonment)

**Rare but possible**: Major data breaches or intentional fraud

---

## 7. Practical Compliance Checklist for Spanish Operations

### Pre-Launch

- [ ] **Legal basis identified** for each data collection (consent, contract, legal obligation)
- [ ] **Privacy Notice translated to Spanish** and published on website
- [ ] **Data Processing Agreement signed** with all vendors
- [ ] **DPIA completed** if processing special categories or high-risk data
- [ ] **DPO appointed** (if required by volume/sector)
- [ ] **Data register created** (list of all processing activities)
- [ ] **Security measures documented** (encryption, access controls, backup)
- [ ] **Breach notification plan** created + AEPD contact identified
- [ ] **Sub-processor list** documented and kept current
- [ ] **Parental consent forms** prepared (if serving minors)

### Ongoing Operations

- [ ] **Subject access requests** handled within 10 days
- [ ] **Data deletion requests** processed within 10 days (or justified delay)
- [ ] **Cookies consent** obtained before analytics/tracking (no pre-checked boxes)
- [ ] **Marketing emails** include unsubscribe + AEPD rights footer
- [ ] **Data breaches** reported to AEPD within 72 hours
- [ ] **Sub-processors** notified before adding new vendors
- [ ] **Security audits** conducted annually (if health/education data)
- [ ] **Data retention policies** enforced (delete expired data automatically)
- [ ] **Training** provided to staff on GDPR/LOPDGDD
- [ ] **Privacy Notice updated** if processing changes

### Annual/Periodic

- [ ] **DPA reviews** scheduled (vendor compliance checks)
- [ ] **Breach register** audited (confirm all reported to AEPD)
- [ ] **Data retention rules** applied (delete data > 3 years old unless needed)
- [ ] **Staff training** refreshed (at least annual)
- [ ] **DPIA updates** for new or changed processing (health, education, profiling)
- [ ] **Transparency report** published (if public authority)

---

## 8. LOPDGDD Consent & Cookies

### Consent Requirements (LOPDGDD Art. 6)

**Valid consent must be**:

1. **Freely given** - No coercion, no forced acceptance
2. **Specific** - Clear what data is being collected and why
3. **Informed** - User understands all implications
4. **Unambiguous** - Clear affirmative action (clicking "OK" or checkbox)

**Invalid consent**:

- Pre-checked boxes
- Silence as consent
- Bundled with other terms
- Obtained under duress or manipulation
- Vague language ("we use your data")

### Cookies & Electronic Marketing (LOPDGDD Art. 95)

**Cookies requiring consent**:

- Analytics (Google Analytics, Mixpanel)
- Marketing/advertising pixels
- Retargeting (storing user interest profiles)
- Third-party tracking

**Cookies NOT requiring consent** (necessary for functionality):

- Session cookies (maintaining login)
- Load balancing cookies
- Security cookies (CSRF tokens)
- Preference cookies (language choice)

**Email marketing**: Requires explicit opt-in (no pre-checked boxes)

**SMS marketing**: Requires explicit opt-in (stricter than email)

**Spanish requirement**: Consent banner must be in Spanish, with clear "Accept All" and "Reject All" buttons (no burying rejection)

---

## 9. Key Differences from Other EU Countries

### vs. GDPR-Only (Non-EU Countries)

| Aspect              | GDPR Only              | Spain (GDPR + LOPDGDD)              |
| ------------------- | ---------------------- | ----------------------------------- |
| Deletion deadline   | 30 days                | 10 days                             |
| Data portability    | Within 30 days         | Within 8 days                       |
| Minor consent age   | 16 (default)           | 14                                  |
| Automated decisions | "Right to explanation" | Full right to object + human review |
| Cookies             | Opt-in required        | Explicit consent + Spanish banners  |
| DPO requirement     | Large orgs only        | Educational institutions mandatory  |

### vs. Germany (GDPR + NatSChuG)

- **Germany**: Stricter on employee monitoring (requires union consent)
- **Spain**: Stricter on children (14 vs 16), faster response times
- **Both**: DPO required for public authorities + education

### vs. Italy (GDPR + DLGS 196/2003)

- **Italy**: Broader "legitimate interest" flexibility
- **Spain**: More prescriptive on health/education sectors
- **Spain**: Stricter on right to digital oblivion

---

## 10. MirrorBuddy Spain Compliance Actions

### Required for Educational AI Platform

1. **Age verification**:
   - Users under 14 require parental consent
   - Parental email verification before account creation
   - Clear parental dashboard showing student data usage

2. **Health/Educational Data**:
   - Explicit DPIA for learning analytics
   - Pseudonymization of performance data in aggregates
   - No behavioral profiling without explicit consent
   - Retention: Delete after student leaves (or 1 year of inactivity)

3. **AI Transparency** (LOPDGDD + EU AI Act):
   - Disclose to Spanish users that AI tutoring is used
   - Explain how AI decisions affect learning recommendations
   - Right to request human teacher review (if applicable)
   - No automated profiling without consent + human option

4. **Vendor Compliance**:
   - All US cloud providers must sign Standard Contractual Clauses (SCCs)
   - Azure OpenAI: DPA with Schrems II adequacy analysis
   - Data residency: Consider EU-only servers for health/education data

5. **Spanish Privacy Notice**:
   - Legally compliant Spanish translation (not auto-translate)
   - Clearly explain data uses for Spanish government
   - Include AEPD contact + complaint process
   - List sub-processors (Azure, Supabase, etc.)

6. **Consent Forms**:
   - Parental consent for minors (parents provide email + password)
   - Separate consent for educational analytics
   - Separate consent for AI-based learning recommendations
   - No bundled consent (each purpose = separate checkbox)

---

## 11. References & Further Reading

### Official Sources

- **AEPD**: https://www.aepd.es (Agencia Española de Protección de Datos)
- **LOPDGDD text**: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- **GDPR**: https://gdpr-info.eu
- **Spanish Courts**: National Court (Audiencia Nacional) handles data protection appeals

### Key Guidance Documents

- **AEPD Position Paper on Cookies**: "Condiciones para que el consentimiento sea válido bajo la Ley Orgánica 3/2018"
- **AEPD Guidelines on Children's Data**: Recomendaciones en materia de protección de datos de menores
- **AEPD on Right to Deletion**: Guía de los Derechos Digitales

### Assessment Tools

- **AEPD Audit Checklist**: https://www.aepd.es/es/orientaciones/conformidad
- **Spanish DPA Tool**: Self-assessment questionnaire on aepd.es

---

## Document Control

| Date       | Author | Change                         |
| ---------- | ------ | ------------------------------ |
| 2026-01-27 | Claude | Initial comprehensive research |

**Status**: Ready for implementation
**Next steps**: Integration into MirrorBuddy compliance policy + parent consent forms for Spanish users
