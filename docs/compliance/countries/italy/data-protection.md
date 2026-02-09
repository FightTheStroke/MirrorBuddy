# Conformità Protezione Dati — Italia

# Italy Data Protection Compliance

> **Lingua / Language**: Documento redatto in inglese per uso interno. La traduzione professionale in italiano è richiesta prima della presentazione al Garante Privacy.
> Document written in English for internal use. Professional Italian translation required before submission to Garante Privacy.

**Giurisdizione / Jurisdiction**: Repubblica Italiana (Stato Membro UE)
**Legislazione / Legislation**: GDPR (Regolamento 2016/679) + Codice Privacy (D.Lgs. 196/2003, come modificato 2018)
**Effective**: GDPR (25 May 2018), Privacy Code amendments (19 September 2018)
**Autorità / Data Protection Authority**: Garante per la protezione dei dati personali
**Stato / Status**: CONFORME / COMPLIANT - Subject to ongoing monitoring

---

## 1. Legal Framework

### Statutory Reference

| Document                        | Section         | Effective   | Scope                        |
| ------------------------------- | --------------- | ----------- | ---------------------------- |
| **GDPR**                        | All articles    | 25 May 2018 | EU-wide data protection      |
| **D.Lgs. 196/2003**             | As amended 2018 | 19 Sep 2018 | Italian privacy code         |
| **Legislative Decree 101/2018** | All articles    | 19 Sep 2018 | GDPR implementation in Italy |
| **Law 132/2025**                | AI education    | 2025        | Education-specific AI rules  |

### Italian DPA (Garante)

**Authority**: Garante per la protezione dei dati personali
**Role**: Independent supervisory authority for data protection in Italy

**Contact Information:**

- **Website**: https://www.gpdp.it
- **Email**: garante@gpdp.it
- **Phone**: +39 06 69677 1
- **Address**: Piazza Venezia 11, 00187 Roma, Italy
- **PEC**: protocollo@pec.gpdp.it

**For MirrorBuddy-specific inquiries:**

- **Primary contact**: roberdan@fightthestroke.org
- **Subject line**: [GDPR - MirrorBuddy]

---

## 2. Legal Bases for Processing

MirrorBuddy processes personal data under the following GDPR Article 6(1) legal bases:

### 2.1 Consent (Article 6(1)(a))

**Applies to:**

- Registered user accounts (Trial mode uses visitor ID, no consent needed)
- Optional features: Google Drive integration (beta), newsletter
- Cookies: Analytics, marketing (via cookie consent banner)

**Implementation:**

- Explicit opt-in required before processing
- Clear, plain language consent forms
- Granular consent (per purpose)
- Easy withdrawal mechanism (account settings)

### 2.2 Contract (Article 6(1)(b))

**Applies to:**

- Pro tier subscription processing (payment via Stripe)
- Service delivery: conversation memory, learning progress tracking
- Account management

**Implementation:**

- Processing necessary for service delivery
- Terms of Service clearly state data processing
- User can export data anytime (Article 20 portability)

### 2.3 Legal Obligation (Article 6(1)(c))

**Applies to:**

- Tax records (Italian law requires 10-year retention)
- Compliance with court orders or regulatory requests
- Breach notification to Garante (within 72 hours, Article 33)

### 2.4 Legitimate Interest (Article 6(1)(f))

**Applies to:**

- Security monitoring (fraud prevention, abuse detection)
- System performance monitoring (Sentry, Grafana Cloud)
- Anonymous analytics (aggregated usage metrics)

**Legitimate Interest Assessment (LIA):**

- Purpose: Ensure platform security and reliability
- Necessity: Cannot deliver safe service without monitoring
- Balancing test: User safety outweighs minimal privacy impact
- Safeguards: Data minimization, pseudonymization, 6-month retention

---

## 3. Special Category Data (Article 9)

MirrorBuddy processes special category data related to health/disability (learning differences):

**Data Types:**

- DSA profile selection (dyslexia, ADHD, visual impairment, etc.)
- Accessibility preferences (stored locally via Zustand, not server)

**Legal Basis for Processing:**

- **Article 9(2)(a)**: Explicit consent (required for DSA profile storage)
- **Article 9(2)(g)**: Substantial public interest (Italian education law)

**Additional Safeguards:**

- Data minimization: Only store profile type, not medical details
- Pseudonymization: User ID used, not name
- Access controls: Encrypted database, least privilege
- No third-party sharing without explicit consent
- Right to erasure honored immediately

---

## 4. Data Subject Rights

MirrorBuddy implements all GDPR data subject rights per Italian DPA guidance:

### 4.1 Right of Access (Article 15)

**Implementation:**

- User dashboard: `/account/privacy` page
- Download personal data JSON export
- Response time: Within 30 days (Italian DPA standard)
- Free of charge (first request)

### 4.2 Right to Rectification (Article 16)

**Implementation:**

- User can update profile anytime via `/account/settings`
- Contact us for data correction: roberdan@fightthestroke.org
- Corrected within 5 business days

### 4.3 Right to Erasure (Article 17)

**Implementation:**

- Self-service deletion: `/account/delete` page
- Immediate account deactivation
- 30-day grace period before permanent deletion
- Legal retention exceptions disclosed (tax records)
- Confirmation email sent

### 4.4 Right to Restriction (Article 18)

**Implementation:**

- User can request processing restriction via contact form
- Account placed in "restricted" state (no AI processing)
- Data retained but not processed until resolution
- Response within 7 business days

### 4.5 Right to Data Portability (Article 20)

**Implementation:**

- JSON export of all user data
- Machine-readable format
- Direct download or send to third party (if technically feasible)
- Includes: profile, conversation history, learning progress

### 4.6 Right to Object (Article 21)

**Implementation:**

- Object to legitimate interest processing (security monitoring)
- Object to direct marketing (unsubscribe link)
- User can disable optional analytics
- Honored within 5 business days

### 4.7 Automated Decision-Making (Article 22)

**Implementation:**

- No fully automated decisions with legal/significant effects
- AI suggestions reviewed by user before action
- User always in control (can ignore AI recommendations)
- Transparency: AI limitations disclosed in Model Card

**Contact for Rights Requests:**

- **Email**: roberdan@fightthestroke.org
- **Subject line**: [Data Subject Rights - MirrorBuddy]
- **Response time**: 30 days (extendable to 60 if complex)

---

## 5. Data Breach Notification

### 5.1 Notification to Garante (Article 33)

**Timeline**: Within 72 hours of becoming aware of breach

**Process:**

1. Detect breach (automated monitoring + user reports)
2. Assess severity (data types, number of users, risk level)
3. If high risk: Notify Garante within 72 hours
4. Use Garante online portal: https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9124510

**Information to Include:**

- Nature of breach (what happened, when)
- Data categories affected
- Number of data subjects affected
- Likely consequences
- Measures taken or proposed
- Contact point: roberdan@fightthestroke.org

### 5.2 Notification to Data Subjects (Article 34)

**When Required**: If breach likely to result in high risk to rights and freedoms

**Timeline**: Without undue delay

**Method:**

- Direct email to affected users
- Public notice on website if individual contact impossible
- Clear language (no jargon)
- Advice on protective measures

**Content:**

- What happened (simple explanation)
- What data was affected
- Likely consequences
- Steps we're taking
- Steps user can take
- Contact for questions: roberdan@fightthestroke.org

---

## 6. Data Protection Officer (DPO)

**Status**: Not yet designated (threshold not met)

**Italian DPA Guidance**: DPO required if:

- Public authority
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale processing of special categories

**MirrorBuddy Assessment**:

- Not a public authority (private foundation)
- Not large-scale (pilot phase, limited users)
- Special category processing limited (DSA profiles only)
- **Conclusion**: DPO not required at current scale

**Plan for Future**:

- Monitor user base growth
- Designate DPO if exceed 10,000 active users
- Contact: roberdan@fightthestroke.org acts as interim data protection contact

---

## 7. International Data Transfers

### 7.1 Third-Country Transfers

MirrorBuddy uses third-party services that may involve data transfers outside the EU:

| Service      | Location       | Safeguard                    | Data Types                |
| ------------ | -------------- | ---------------------------- | ------------------------- |
| **Vercel**   | US (+ EU)      | EU-US Data Privacy Framework | Code, logs                |
| **Supabase** | EU (Frankfurt) | No transfer                  | User data (primary)       |
| **Sentry**   | US             | SCCs + DPA                   | Error logs                |
| **Grafana**  | US (+ EU)      | SCCs + DPA                   | Performance metrics       |
| **OpenAI**   | US             | No PII sent                  | Chat prompts (anonymized) |
| **Stripe**   | US             | SCCs + adequate safeguards   | Payment data              |

### 7.2 Safeguards (Chapter V GDPR)

**Standard Contractual Clauses (SCCs):**

- All US service providers use EU Commission-approved SCCs (2021/914)
- DPAs signed with Sentry, Grafana, Stripe
- Regular compliance monitoring

**Additional Measures:**

- Data minimization: No PII sent to OpenAI
- Encryption in transit (TLS 1.2+) and at rest
- Pseudonymization where feasible
- Right to erasure enforced across all processors

**Garante Guidance Compliance:**

- Italian DPA transfer guidance (Provvedimento 231/2021) followed
- Case-by-case transfer impact assessment for new services

---

## 8. Children's Data (Minors)

### 8.1 Age of Consent (Article 8 GDPR)

**Italian Law**: Age of digital consent is **14 years** (D.Lgs. 101/2018, Article 2-quinquies)

**MirrorBuddy Target Users**: Ages 8-18 (many below 14)

**Parental Consent Requirements:**

- Users under 14 require verifiable parental consent
- Consent mechanism: Parent/guardian email verification
- Parent can exercise data subject rights on behalf of child

### 8.2 Implementation

**Age Gate:**

- Birthdate required during registration
- If under 14: Prompt for parent/guardian email
- Parent receives verification email with consent form
- Account activated only after parent consent

**Parental Rights:**

- Parents can access child's data via `/account/parent-dashboard`
- Parents can delete child's account
- Parents receive copy of DPIA summary

**Additional Protections:**

- No targeted advertising to minors
- No data sharing with third parties (except service processors)
- Enhanced security (2FA available for parent accounts)

---

## 9. Records of Processing Activities (Article 30)

**Requirement**: Maintain written record of all processing activities

**MirrorBuddy Implementation:**

- Internal document: `DATA-FLOW-MAPPING.md` (compliance folder)
- Updated quarterly
- Includes: purposes, categories, recipients, retention, safeguards

**Available to Garante upon request.**

---

## 10. Data Protection Impact Assessment (DPIA) (Article 35)

**Status**: ✅ **COMPLETED**

**Document**: `docs/compliance/DPIA.md`

**Trigger**: High-risk processing (special category data, minors, AI decision support)

**Assessment Results:**

- Risks identified: Data breach, bias, unauthorized access
- Mitigations: Encryption, bias audits, access controls, monitoring
- Residual risk: LOW (acceptable with safeguards)
- Garante consultation: Not required (risk mitigated adequately)

**Review Schedule**: Annually or when processing changes materially

---

## 11. Vendor Management (Article 28)

All data processors have signed Data Processing Agreements (DPAs):

| Vendor       | Role             | DPA Status | Italian Addendum |
| ------------ | ---------------- | ---------- | ---------------- |
| **Vercel**   | Hosting          | ✅ Signed  | Not needed       |
| **Supabase** | Database         | ✅ Signed  | Not needed       |
| **Sentry**   | Error monitoring | ✅ Signed  | Not needed       |
| **Grafana**  | Performance      | ✅ Signed  | Not needed       |
| **OpenAI**   | AI API (Azure)   | ✅ Signed  | Not needed       |
| **Stripe**   | Payments         | ✅ Signed  | Not needed       |

**DPA Requirements (Article 28(3)):**

- Process only on documented instructions
- Ensure confidentiality
- Implement appropriate security measures
- Assist with data subject rights requests
- Notify of breaches immediately
- Delete or return data at end of contract

---

## 12. Compliance Checklist

### Pre-Launch (Required)

- [x] Legal basis identified for all processing
- [x] Privacy Policy published (Italian + English)
- [x] Cookie consent banner (Italian language)
- [x] Data subject rights implemented
- [x] DPIA completed
- [x] Records of processing activities documented
- [x] DPAs signed with all processors
- [x] Parental consent mechanism for users under 14
- [x] Data breach response plan documented
- [ ] Register with Garante (if required - TBD based on launch scale)

### Ongoing (Post-Launch)

- [ ] Annual DPIA review
- [ ] Quarterly records of processing update
- [ ] Monitor for data breaches (automated + manual)
- [ ] Respond to data subject rights requests within 30 days
- [ ] Update Privacy Policy as needed (notify users of material changes)
- [ ] Vendor DPA renewal (check expiry dates annually)

---

## 13. Resources & Guidance

### Italian DPA (Garante) Resources

| Resource                       | URL                                                                       | Purpose                   |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------- |
| **Garante Homepage**           | https://www.gpdp.it                                                       | Official DPA website      |
| **Guidelines**                 | https://www.gpdp.it/web/guest/home/docweb/-/docweb-display                | Italian-specific guidance |
| **Breach Notification Portal** | https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9124510 | Report breaches           |
| **Children's Data Guidance**   | https://www.gpdp.it/temi/minori                                           | Minors' data protection   |
| **Cookie Guidelines**          | https://www.gpdp.it/temi/cookie                                           | Cookie compliance         |

### GDPR Official Sources

| Resource                 | URL                                                                                     | Purpose                        |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------------ |
| **GDPR Full Text**       | https://eur-lex.europa.eu/eli/reg/2016/679/oj                                           | EU Regulation 2016/679         |
| **Italian Privacy Code** | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196 | D.Lgs. 196/2003 (consolidated) |
| **EDPB Guidelines**      | https://edpb.europa.eu/our-work-tools/our-documents_en                                  | EU-wide guidance               |

---

## 14. Contact Information

**For data protection inquiries:**

- **Email**: roberdan@fightthestroke.org
- **Subject line**: [Data Protection - MirrorBuddy]
- **Response time**: 5 business days (rights requests: 30 days)

**To exercise data subject rights:**

- **Portal**: `/account/privacy` (self-service)
- **Email**: roberdan@fightthestroke.org (if assistance needed)

**For data breach reports:**

- **Urgent contact**: roberdan@fightthestroke.org
- **Subject line**: [URGENT - Data Breach Report]

**Italian DPA (Garante):**

- **Website**: https://www.gpdp.it
- **Email**: garante@gpdp.it
- **Phone**: +39 06 69677 1

---

**Document Version**: 1.0
**Last Updated**: 09 February 2026
**Next Review**: 09 February 2027 (annual)
**Status**: Active
**Owner**: Fightthestroke Foundation
**Reference**: GDPR, D.Lgs. 196/2003, Italian DPA guidance
