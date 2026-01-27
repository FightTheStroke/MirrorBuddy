# UK Data Protection Framework

> **Jurisdiction**: United Kingdom (England, Scotland, Wales, Northern Ireland)
> **Effective**: Post-Brexit (1 January 2021)
> **Status**: Active | Last Updated: January 2026

---

## Executive Summary

MirrorBuddy must comply with the UK's dual data protection framework:

- **UK GDPR** - Core privacy regulation (retained EU law with UK amendments)
- **Data Protection Act 2018** - Statutory framework implementing UK GDPR
- **Age Appropriate Design Code** - Children's Code by ICO (mandatory for services targeting children <18)

The UK has retained GDPR principles post-Brexit with modifications, creating an independent regulatory regime under the **Information Commissioner's Office (ICO)**.

---

## 1. UK GDPR (2018/679 as retained in UK law)

### Overview

Post-Brexit, the UK GDPR became the primary privacy regulation on 1 January 2021:

- **Source**: EU GDPR (2018/679) retained and modified by Data Protection, Privacy and Electronic Communications (Amendments) Regulations 2020/1750
- **Scope**: Applies to all personal data processing in the UK + overseas transfers
- **Enforcement**: Information Commissioner's Office (ICO) - independent public authority
- **Status**: Substantially similar to EU GDPR with UK-specific amendments

### Key Principles (UK GDPR Article 5)

Same as EU GDPR:

| Principle                       | Requirement                                  | MirrorBuddy Impact                                     |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Lawfulness**                  | Processing must be lawful, fair, transparent | Require consent + provide privacy notices              |
| **Purpose Limitation**          | Use data only for stated purposes            | Limit AI use to education; disallow secondary purposes |
| **Data Minimization**           | Collect only necessary data                  | Minimal PII collection; no profiling beyond learning   |
| **Accuracy**                    | Keep data correct and up-to-date             | Data rectification mechanism required                  |
| **Storage Limitation**          | Retain only as long as necessary             | Implement deletion schedules (DPIA required)           |
| **Integrity & Confidentiality** | Secure processing                            | AES-256 encryption, TLS for transit, access controls   |
| **Accountability**              | Demonstrate compliance                       | Document processing, conduct DPIAs, audit trails       |

### Lawful Basis (UK GDPR Article 6)

MirrorBuddy must establish one lawful basis per processing activity:

| Basis                                | Applicability                        | Evidence Required                             |
| ------------------------------------ | ------------------------------------ | --------------------------------------------- |
| **Consent** (Art 6.1.a)              | Best for non-essential processing    | Explicit opt-in, withdrawal mechanism         |
| **Contract** (Art 6.1.b)             | Service terms (if applicable)        | Terms of service signed by parent/user        |
| **Legal Obligation** (Art 6.1.c)     | Regulatory compliance                | References to UK laws                         |
| **Vital Interests** (Art 6.1.d)      | Protective emergencies only          | Limited applicability                         |
| **Public Task** (Art 6.1.e)          | Educational mission (if applicable)  | Institutional authorization                   |
| **Legitimate Interests** (Art 6.1.f) | Educational benefit vs. privacy risk | LIA (Legitimate Interest Assessment) required |

**MirrorBuddy's Primary Bases**:

- **Consent** for non-essential features (analytics, marketing)
- **Legitimate Interests** for core learning (with LIA documented)
- **Contract** for paid subscriptions

### Special Category Data (UK GDPR Article 9)

Includes: race, ethnicity, politics, religion, biometrics, genetic, health, sex life.

**MirrorBuddy's Exposure**:

- Learning differences (ADHD, dyslexia, autism) = health data
- **Restriction**: May NOT process without explicit consent or exemption
- **Exemption**: Possible under Art 9.2.e (employment, social security) if applicable

**Requirements**:

- Explicit consent form for learning difference data
- Separate consent withdrawal mechanism
- Document processing justification in DPIA
- Cannot use for secondary purposes (marketing, algorithmic profiling)

### International Transfers (UK GDPR Chapter 5)

UK is **NOT in the "adequate list"** post-Brexit. Transfer restrictions apply:

| Destination                 | Status               | Requirement                                                           |
| --------------------------- | -------------------- | --------------------------------------------------------------------- |
| **EEA (EU/Norway/Iceland)** | Adequacy decision    | Transfer permitted (mutual recognition)                               |
| **US, Canada, Australia**   | No adequacy          | Require SCCs or other safeguards                                      |
| **Third countries**         | Generally restricted | SCCs (Standard Contractual Clauses) or BCRs (Binding Corporate Rules) |

**MirrorBuddy's Transfers**:

- Supabase (PostgreSQL hosting) - typically EU-based ✓
- Azure OpenAI (AI processing) - may involve US transfers → Require SCC review
- AWS, GCP - Require SCC or adequacy review

**Action**: Audit all processor locations in DPIA; update SCC documentation per ADR 0063.

### Data Subject Rights (UK GDPR Articles 12-22)

Users have enforceable rights:

| Right                             | Timeframe | MirrorBuddy Requirement                                      |
| --------------------------------- | --------- | ------------------------------------------------------------ |
| Access                            | 1 month   | Provide full data export                                     |
| Rectification                     | 1 month   | Allow data corrections                                       |
| Erasure ("Right to be Forgotten") | 1 month   | Delete user + related data                                   |
| Restrict Processing               | 1 month   | Stop processing, retain data                                 |
| Data Portability                  | 1 month   | Export in machine-readable format (JSON/CSV)                 |
| Object                            | Timely    | Allow opt-outs from processing                               |
| Automated Decision                | Timely    | If AI makes binding decisions, disclose + allow human review |

**Implementation**:

- Admin API endpoints for data export/deletion
- User dashboard for consent withdrawal
- Audit trails for all rights requests
- Compliance audits in `/admin/data-subject-rights`

---

## 2. Data Protection Act 2018 (c. 12)

### Overview

The Data Protection Act 2018 supplements UK GDPR with:

- Statutory framework for UK GDPR implementation
- UK-specific processing rules
- Criminal offenses for GDPR violations

### Key Provisions

| Section        | Requirement                        | MirrorBuddy Action                         |
| -------------- | ---------------------------------- | ------------------------------------------ |
| **Part 2**     | UK GDPR implementation             | Full compliance with UK GDPR Articles 1-99 |
| **Part 3**     | Employment processing              | Not applicable (no employment data)        |
| **Part 4**     | Law enforcement                    | Not applicable (no law enforcement)        |
| **Part 5**     | National security                  | Not applicable                             |
| **Schedule 1** | Exemptions (journalism, art, etc.) | None applicable to MirrorBuddy             |

### Criminal Offenses (Section 170, Part 5)

**Data Protection Act 2018 establishes criminal liability**:

| Offense                                 | Threshold      | Penalty                                  | Mens Rea             |
| --------------------------------------- | -------------- | ---------------------------------------- | -------------------- |
| **Knowingly/Recklessly** violating GDPR | Serious breach | Up to £17.5m OR 4% global revenue        | Intent or negligence |
| **Obtaining, disclosing personal data** | Without right  | Up to 2 years imprisonment + £5,000 fine | Intent               |

---

## 3. Information Commissioner's Office (ICO)

### Authority & Powers

The **ICO** is the UK's independent authority for data protection:

- **Established**: Data Protection Act 1998
- **Statutory Role**: Enforce UK GDPR + Data Protection Act 2018
- **Powers**: Investigations, audits, enforcement notices, fines

### Investigation & Enforcement Process

```
User complaint or ICO initiative
         ↓
Preliminary assessment (4-8 weeks)
         ↓
Full investigation (if warranted)
         ↓
Decision on compliance (informal advice or formal notice)
         ↓
Remediation deadline (typically 30-90 days)
         ↓
Enforcement (fine, audit notice, or closure)
```

### Administrative Fines (UK GDPR Article 83)

The ICO can impose fines up to **€20 million OR 4% of global revenue** (whichever is higher).

| Infraction Type                      | Maximum Fine            | Examples                                                                   |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| **Tier 1: Technical/Administrative** | Up to €10m / 2% revenue | Late breach notification, incorrect data subject form                      |
| **Tier 2: Substantive Violations**   | Up to €20m / 4% revenue | Unlawful processing, failure to conduct DPIA, transfers without safeguards |

**MirrorBuddy Risk Areas** (if non-compliant):

- Processing children's learning difference data without consent → Tier 2
- International transfer without SCC → Tier 2
- No DPIA for high-risk processing → Tier 1-2
- Late breach notification → Tier 1

### Corrective Powers

The ICO can issue:

1. **Transparency Notices**: Provide data processing details within 30 days
2. **Compliance Orders**: Bring processing into compliance within specified timeframe
3. **Data Subject Notices**: Alert individuals of breaches
4. **Binding Decisions**: Resolve complaints and impose remedies
5. **Inspection Orders**: Right to audit premises and systems

---

## 4. Age Appropriate Design Code (Children's Code)

### Overview

The **ICO's Children's Code** (2020) is **legally binding statutory guidance** under UK GDPR + Data Protection Act 2018.

- **Title**: _Age Appropriate Design: A Code of Practice for Online Services_
- **Applicable**: Services that children <18 use or could use
- **Mandatory**: Failure to follow is evidence of GDPR breach
- **Status**: Most comprehensive children's privacy code globally

### Scope

**Applies to MirrorBuddy because**:

- Service explicitly targets students (often <18)
- If even accessible to children, protections apply (inclusive approach)
- Includes educational platforms, learning apps, EdTech services

### 15 Core Standards (Binding Requirements)

| Standard                            | Requirement                                             | MirrorBuddy Implementation                              |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| **1. Age Assurance**                | Determine if child; apply age-appropriate protections   | Age verification at signup; stricter rules for <13      |
| **2. Transparency**                 | Explain data use in age-appropriate language            | Simplified privacy notice for children                  |
| **3. Parental Engagement**          | Provide parental notification/oversight for <13         | Parent account features; export of child data           |
| **4. Defaults**                     | Privacy-friendly settings by default                    | No consent = most restrictive processing                |
| **5. Data Minimization**            | Collect only necessary data; delete when unneeded       | Minimal PII; auto-deletion schedules                    |
| **6. Profiling & Targeting**        | Prohibited for children unless essential                | Cannot profile for ad targeting; only learning insights |
| **7. Contact & Removal**            | Allow child to contact, remove data                     | Dashboard delete account + data export                  |
| **8. Performance Metrics**          | Don't measure engagement for behavioral profiling       | No dark patterns; no addictive design metrics           |
| **9. Identification & Recognition** | No facial recognition or biometric tracking             | Prohibited for student safety                           |
| **10. Location Tracking**           | Only with explicit consent; provide controls            | Geolocation must be optional                            |
| **11. Behavioral Advertising**      | Prohibited unless essential                             | No algorithmic ad targeting; educational content only   |
| **12. Parental Empowerment**        | Parents can manage child's data/settings                | Parent dashboard with full control                      |
| **13. Reporting & Complaints**      | Simple mechanism for child to report abuse              | In-app "Report" feature; escalation to trust & safety   |
| **14. Terms & Conditions**          | Child-friendly explanation                              | T&C in plain language; interactive explainer            |
| **15. Resilience & Support**        | Safeguards for online safety risks (grooming, exposure) | Safety module + teacher escalation                      |

### MirrorBuddy-Specific Adaptations

**Requirement**: Enhanced safeguards beyond general GDPR.

| Feature                  | Standard                         | MirrorBuddy Compliance                                                                |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| **AI Maestri**           | Standard 6 (Profiling)           | Learning progress tracking is necessary for tutoring; must document justification     |
| **Voice/Audio**          | Standard 9 (Biometric)           | Voice can be processed for content delivery only; not for identification/tracking     |
| **Learning Analytics**   | Standard 8 (Performance Metrics) | Track learning outcomes only; never for engagement maximization                       |
| **Parent Dashboard**     | Standard 3, 12                   | Parents can view conversations, restrict maestri, download data                       |
| **Conversation Memory**  | Standard 5 (Minimization)        | Limit message history to necessary duration (per tier); auto-delete old conversations |
| **Gamification**         | Standard 8, 11 (Dark Patterns)   | Rewards must encourage learning, not engagement; no push notifications for streaks    |
| **Tool Recommendations** | Standard 6 (Profiling)           | Can recommend tools based on learning need; not behavior prediction                   |

### Enforcement

**ICO's Approach**:

- Presumption that platform breaches Children's Code if processing child data
- Burden on service provider to demonstrate compliance
- No safe harbor for "we didn't know it was a child"

**Violations Trigger**:

- GDPR fine (up to 4% revenue)
- Prohibition notices
- Public enforcement action (reputational impact)

---

## 5. UK-Specific Additions to GDPR

### Post-Brexit Modifications

The UK has introduced specific changes to GDPR:

| Modification                            | Impact                              | MirrorBuddy                                       |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------- |
| **Adequacy Assessment Cancelled**       | EEA transfers require SCC review    | Update SCC documentation                          |
| **UK Retained Case Law**                | UK courts interpret GDPR (not CJEU) | Follow ICO guidance, not EU precedent             |
| **Trade & Cooperation Agreement (TCA)** | Framework for UK-EU data flows      | Personal data transfers permitted with safeguards |
| **International Data Transfers**        | No adequacy to most countries       | Require SCC/BCR for US, Canada, Australia         |
| **Regulatory Cooperation**              | UK ICO works with EU DPAs           | Harmonized enforcement expected                   |

### Exemptions in Schedule 1 (Data Protection Act 2018)

Limited exemptions not applicable to MirrorBuddy:

- Journalism
- Art & literature
- Academic research
- Official statistics
- Law enforcement

**Conclusion**: No applicable exemptions; full GDPR compliance required.

---

## 6. Compliance Checklist for MirrorBuddy

### Data Collection & Processing

- [ ] **Lawful Basis Documented**: Each processing activity has one of the six lawful bases (consent, contract, legitimate interests, legal obligation, vital interests, public task)
- [ ] **Consent Management**: Explicit opt-in for non-essential processing; easy withdrawal mechanism
- [ ] **Special Category Data**: If processing learning differences, explicit consent + DPIA
- [ ] **Data Minimization**: Only collect necessary data; no PII beyond learning needs
- [ ] **Purpose Limitation**: No secondary use (e.g., no selling data to third parties)

### Privacy & Transparency

- [ ] **Privacy Notice**: Clear, transparent explanation of processing in plain language
- [ ] **Child-Friendly Notice**: If <18 users, simplified version for children (Standard 2)
- [ ] **Parental Notification**: Parents of <13 users notified of data practices (Standard 3)
- [ ] **Terms of Service**: Plain language; child-friendly explanation

### Security & Integrity

- [ ] **Data Encryption**: AES-256 at rest, TLS 1.2+ in transit
- [ ] **Access Controls**: Role-based; audit logs for all access
- [ ] **Breach Notification**: ICO notified within 72 hours (if high risk)
- [ ] **Incident Response Plan**: Procedures for data breaches

### International Transfers

- [ ] **Transfer Audit**: All processor locations identified (Supabase, Azure, AWS, etc.)
- [ ] **SCC Review**: Standard Contractual Clauses in place for non-EEA transfers
- [ ] **Transfer Impact Assessment (TIA)**: Documentation of safeguards

### Data Subject Rights

- [ ] **Access (DSAR)**: Provide full export in machine-readable format (JSON/CSV)
- [ ] **Erasure**: Delete user + all related data upon request
- [ ] **Portability**: Export in standard format (GDPR-compliant)
- [ ] **Right to Object**: Allow users to opt-out of processing
- [ ] **Right to Rectification**: Users can correct data; system updates propagated

### Children's Code Compliance (Age Appropriate Design Code)

- [ ] **Standard 1 - Age Assurance**: Verify age; apply age-appropriate protections
- [ ] **Standard 2 - Transparency**: Explain data use in child-friendly language
- [ ] **Standard 3 - Parental Engagement**: Parent account for <13; oversight features
- [ ] **Standard 4 - Privacy Defaults**: Opt-in only for non-essential processing
- [ ] **Standard 5 - Data Minimization**: Delete unnecessary data; enforce retention limits
- [ ] **Standard 6 - Profiling**: No behavioral targeting; educational profiling only
- [ ] **Standard 7 - Contact & Removal**: Child dashboard to delete account/data
- [ ] **Standard 8 - Performance Metrics**: No engagement maximization metrics
- [ ] **Standard 9 - Identification & Recognition**: No facial recognition
- [ ] **Standard 10 - Location Tracking**: Optional with explicit control
- [ ] **Standard 11 - Behavioral Advertising**: No targeted ads to children
- [ ] **Standard 12 - Parental Empowerment**: Full parental dashboard + controls
- [ ] **Standard 13 - Reporting & Complaints**: Simple abuse reporting mechanism
- [ ] **Standard 14 - Terms & Conditions**: Child-friendly explainer
- [ ] **Standard 15 - Resilience & Support**: Safeguards for online safety

### Documentation & Accountability

- [ ] **DPIA (Data Protection Impact Assessment)**: Conducted for high-risk processing (Tier 1 + Children's Code)
- [ ] **Processing Log**: Record of all processing activities, lawful basis, retention
- [ ] **Audit Trails**: Logs of data access, deletions, corrections
- [ ] **Incident Log**: Breach register; assessments of impact
- [ ] **DPA (Data Processing Agreement)**: Signed with all processors (Supabase, AI vendors, analytics)
- [ ] **Vendor Compliance**: Confirmation that all third parties are GDPR-compliant

### Enforcement Readiness

- [ ] **ICO Response Protocol**: Procedures for handling investigation/audit requests
- [ ] **Breach Notification SOP**: Process for notifying users, ICO, affected parties within 72 hours
- [ ] **Data Subject Rights Portal**: Automated DSAR fulfillment within 30 days
- [ ] **Legal Review**: Annual review of T&C, privacy notice, policy changes

---

## 7. Penalties & Enforcement

### ICO Fines (Tiered)

The ICO can impose **administrative fines up to €20m or 4% global revenue**, whichever is higher.

#### Tier 1: Technical / Administrative Violations

**Examples**:

- Late breach notification (>72 hours without justification)
- Incomplete privacy notice
- Slow response to DSAR (>1 month without extension)
- Missing data processing agreement with processor
- Inadequate data retention schedule

**Penalty Range**: Up to €10m / 2% global revenue

**Examples for MirrorBuddy** (if €5m annual revenue):

- Breach notification 10 days late → €100k-€500k fine
- Incomplete privacy notice → €50k-€200k fine

#### Tier 2: Substantive / Material Violations

**Examples**:

- Processing children's data without consent
- Processing special category data (learning differences) without consent
- International transfer without SCC
- No DPIA for high-risk processing
- Failure to implement privacy by design
- Deliberate non-compliance with ICO correction notice
- No Data Processing Agreement with processor

**Penalty Range**: Up to €20m / 4% global revenue

**Examples for MirrorBuddy** (if €5m annual revenue):

- Processing child learning differences without consent → €200k-€2m fine
- International transfer without SCC → €150k-€1.5m fine
- Intentional GDPR violation → €500k-€2m fine

### Criminal Sanctions

Section 170 of Data Protection Act 2018:

| Offense                                                | Penalty                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Knowingly/recklessly violating GDPR                    | Up to **£17.5 million** OR **4% global revenue** (administrative fine) |
| Unlawfully obtaining personal data                     | Up to **2 years imprisonment** + **£5,000 fine** (criminal)            |
| Unlawfully disclosing personal data                    | Up to **2 years imprisonment** + **£5,000 fine** (criminal)            |
| Engaging in processor activities without authorization | Up to **2 years imprisonment** + **£5,000 fine** (criminal)            |

### Other Enforcement Actions

1. **Compliance Orders**: ICO can order compliance within timeframe (30-90 days)
2. **Interim Measures**: ICO can restrict processing immediately (e.g., halt AI processing pending audit)
3. **Assessment Notices**: ICO can conduct surprise audits/inspections
4. **Remedies for Data Subjects**: Individual claims in UK courts (no class action, but group claims possible)
5. **Reputation Damage**: Enforcement action published on ICO website; impacts public perception

---

## 8. Mapping GDPR to MirrorBuddy Features

### Learning Data Processing

**Feature**: AI Maestri, Quiz, Flashcards, Learning Paths

| Processing                 | Lawful Basis                               | Children's Code                     | Safeguards                                                    |
| -------------------------- | ------------------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| Track learning progress    | Legitimate Interests (educational benefit) | Standard 6 (justified profiling)    | DPIA required; learning-only profiling; no engagement metrics |
| Store conversation history | Contract (service provision)               | Standard 5 (minimization)           | Auto-delete after 90 days (Pro tier); manual delete anytime   |
| Provide AI recommendations | Legitimate Interests                       | Standard 6 (necessary for tutoring) | No secondary profiling; learning-only                         |
| Analyze misconceptions     | Legitimate Interests                       | Standard 6                          | Educational purpose only; not sold/shared                     |

### Special Category Data

**Feature**: Learning Differences Profile (ADHD, Dyslexia, Autism)

| Processing                        | Lawful Basis                     | Children's Code                  | Safeguards                                                                |
| --------------------------------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Store diagnosis/profile           | **Explicit Consent** (Art 9.2.a) | Standard 3 (parental engagement) | Separate consent form; parent + child must consent; easy withdrawal       |
| Use for accessibility features    | Consent (same)                   | Standard 4 (defaults)            | Settings pre-configured for accessibility; no tracking for other purposes |
| Share with Maestri for adaptation | Consent (same)                   | Standard 6 (no secondary use)    | Only for teaching; never for profiling/targeting; document in DPIA        |

### International Transfers

**Feature**: Azure OpenAI (US-based), Supabase (EU-based), Analytics (vendor-dependent)

| Processor             | Location       | Safeguard                | Documentation              |
| --------------------- | -------------- | ------------------------ | -------------------------- |
| Supabase PostgreSQL   | EU (typically) | No SCC needed (adequacy) | Transfer impact assessment |
| Azure OpenAI          | US             | SCC required             | SCC review per ADR 0063    |
| Vercel Analytics      | US/Global      | SCC required             | Vendor DPA + SCC           |
| Email vendor (Resend) | US             | SCC required             | Vendor SCC on file         |

**Action**: Audit all vendors; update SCC documentation in `/docs/compliance/SCC-VERIFICATION.md`.

---

## 9. Staying Compliant: Ongoing Requirements

### Annual Reviews

| Task                               | Frequency                           | Owner                   |
| ---------------------------------- | ----------------------------------- | ----------------------- |
| Privacy Notice Update              | Annually (or after material change) | Legal/Compliance        |
| Children's Code Audit              | Annually                            | Product/Compliance      |
| Vendor Compliance Check            | Annually                            | Operations              |
| DPIA Review (high-risk processing) | Annually (or if processing changes) | Data Protection Officer |
| Incident Log Review                | Quarterly                           | Compliance              |
| Staff Training                     | Annually                            | HR/Compliance           |

### Staying Updated

- **ICO Updates**: Subscribe to ICO email alerts (https://ico.org.uk/news/)
- **Regulatory Changes**: Monitor UK Parliament legislation (https://bills.parliament.uk/)
- **Case Law**: Follow UK court decisions on GDPR interpretation
- **Guidance**: Review ICO's _Guidance_ section for new standards

### Incident Response

**If a breach is suspected**:

1. **Assess within 72 hours**: Is it a "personal data breach" per UK GDPR Art 33?
2. **Notify ICO** (if high risk to rights/freedoms): Within 72 hours of discovery
3. **Notify Data Subjects** (if high risk): "Without undue delay" (typically <14 days)
4. **Document**: Create incident report; implement remediation
5. **Communicate**: Update privacy notice if practices change

---

## 10. Key Contacts & Resources

### Information Commissioner's Office (ICO)

- **Website**: https://ico.org.uk/
- **Complaints Portal**: https://ico.org.uk/make-a-complaint/
- **Guidance**: https://ico.org.uk/for-organisations/
- **Children's Code**: https://ico.org.uk/for-organisations/design-careers-and-marketing/age-appropriate-design-code/
- **Phone**: 0303 123 1113 (10am-4pm, Mon-Fri)
- **Email**: casework@ico.org.uk

### Relevant Legislation

| Act                                                           | URL                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Data Protection Act 2018                                      | https://legislation.gov.uk/ukpga/2018/12                                                       |
| UK GDPR (as retained law)                                     | https://www.legislation.gov.uk/eur/2016/679/contents                                           |
| Privacy and Electronic Communications Regulations 2003 (PECR) | https://legislation.gov.uk/uksi/2003/2426                                                      |
| Children's Code                                               | https://ico.org.uk/for-organisations/design-careers-and-marketing/age-appropriate-design-code/ |

### Key ICO Guidance Documents

1. _Accountability Framework_ - How to demonstrate GDPR compliance
2. _Data Protection Impact Assessments (DPIAs)_ - When and how to conduct
3. _Legitimate Interests Assessment (LIA)_ - Balancing rights vs. benefit
4. _International Data Transfers_ - Post-Brexit transfer mechanisms
5. _Incident Management_ - Breach response procedures
6. _Children's Code Guidance_ - Full compliance guide (15 standards)

---

## 11. Summary: Compliance Status for MirrorBuddy

### Immediate Actions Required

1. **Children's Code Audit** (if not completed)
   - Assess all 15 standards
   - Implement parental controls if <13 access
   - Simplify privacy notice for children

2. **Special Category Data Consent**
   - Separate consent form for learning differences
   - Parent + child consent for <13
   - Document in DPIA

3. **International Transfer Review**
   - Audit Azure OpenAI, Vercel, third-party vendor locations
   - Ensure SCC in place for US transfers
   - Update transfer impact assessment

4. **DPIA Updates**
   - Review for children's data processing (higher risk)
   - Include Children's Code compliance assessment
   - Identify mitigations for identified risks

5. **Incident Response Plan**
   - Document 72-hour notification procedure
   - Assign responsibility (CTO, Legal, Product)
   - Set up breach notification system

### Quarterly Compliance Review

- [ ] Vendor DPA/SCC status (any new vendors?)
- [ ] Incident log (any breaches? document response)
- [ ] Data retention schedule (are old chats being deleted?)
- [ ] Staff awareness (GDPR training updated?)
- [ ] User requests (DSAR response times within 30 days?)

### Annual Audit

- [ ] Full DPIA refresh
- [ ] Privacy notice update (any processing changes?)
- [ ] Children's Code compliance review (all 15 standards)
- [ ] Regulatory update (any new ICO guidance?)
- [ ] Penalties analysis (comparable breaches in market; lesson learned?)

---

## References

- **UK GDPR**: https://www.legislation.gov.uk/eur/2016/679/contents
- **Data Protection Act 2018**: https://legislation.gov.uk/ukpga/2018/12
- **ICO Children's Code**: https://ico.org.uk/for-organisations/design-careers-and-marketing/age-appropriate-design-code/
- **ICO Enforcement**: https://ico.org.uk/about-the-ico/what-we-do/enforcement/
- **ADR 0063**: Supabase SSL Certificate Requirements (Transfer safeguards)
- **ADR 0062**: AI Compliance Framework (Processing requirements)

---

**Document Version**: 1.0
**Date**: January 2026
**Status**: Ready for Legal Review
**Next Review**: January 2027
