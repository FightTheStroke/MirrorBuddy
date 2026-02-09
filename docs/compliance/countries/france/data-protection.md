# Conformité Protection des Données — France

# France Data Protection Compliance

> **Langue / Language**: Document rédigé en anglais pour usage interne. Une traduction professionnelle en français est requise avant soumission à la CNIL.
> Document written in English for internal use. Professional French translation required before submission to CNIL.

**Juridiction / Jurisdiction**: République Française (État Membre UE)
**Législation / Legislation**: RGPD (Règlement 2016/679) + Loi Informatique et Libertés (Loi 78-17, modifiée 2018/2019)
**Effective**: GDPR (25 May 2018), French amendments (20 June 2018, 24 June 2019)
**Autorité / Data Protection Authority**: Commission Nationale de l'Informatique et des Libertés (CNIL)
**Statut / Status**: CONFORME / COMPLIANT - Subject to ongoing monitoring

---

## 1. Legal Framework

### Statutory Reference

| Document                 | Section      | Effective    | Scope                          |
| ------------------------ | ------------ | ------------ | ------------------------------ |
| **GDPR**                 | All articles | 25 May 2018  | EU-wide data protection        |
| **Law 78-17**            | As amended   | 20 June 2018 | French data protection law     |
| **Ordonnance 2018-1125** | All articles | 12 Dec 2018  | GDPR implementation            |
| **Law 2019-774**         | All articles | 24 June 2019 | Digital sovereignty amendments |

### CNIL (Commission Nationale de l'Informatique et des Libertés)

**Authority**: French data protection authority (independent administrative authority)
**Role**: Supervise GDPR and French data protection law compliance

**Contact Information:**

- **Website**: https://www.cnil.fr
- **Email**: Contact form at https://www.cnil.fr/fr/plaintes
- **Phone**: +33 1 53 73 22 22
- **Address**: 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France

**For MirrorBuddy-specific inquiries:**

- **Primary contact**: roberdan@fightthestroke.org
- **Subject line**: [RGPD - MirrorBuddy]

---

## 2. Legal Bases for Processing

MirrorBuddy processes personal data under GDPR Article 6(1) legal bases, with French-specific considerations:

### 2.1 Consent (Article 6(1)(a))

**French Specificity**: CNIL requires consent to be "free, specific, informed, and unambiguous"

- Registered user accounts (opt-in during registration)
- Optional features: Google Drive, newsletter
- Cookies: CNIL strictly enforces prior consent for non-essential cookies

### 2.2 Contract (Article 6(1)(b))

- Pro tier subscriptions (Stripe payment processing)
- Service delivery (conversation memory, learning progress)

### 2.3 Legal Obligation (Article 6(1)(c))

- Tax records (French law requires 10-year retention)
- Court orders or CNIL requests
- Breach notification to CNIL (72 hours, Article 33)

### 2.4 Legitimate Interest (Article 6(1)(f))

**French Requirement**: Must document legitimate interest assessment (LIA)

- Security monitoring (fraud, abuse detection)
- Performance monitoring (Sentry, Grafana)
- Anonymous analytics (aggregated only)

---

## 3. Special Category Data (Article 9)

### DSA Profile Data (Health-Related)

**French Law**: Article 9 GDPR + Loi 78-17 Article 6

**Legal Basis:**

- Article 9(2)(a): Explicit consent (documented)
- Article 9(2)(g): Substantial public interest (education for minors with disabilities)

**CNIL Guidance Compliance:**

- Data minimization: Only profile type stored, no medical diagnoses
- Pseudonymization mandatory
- Enhanced security (encryption at rest + transit)
- Annual DPIA review

---

## 4. Data Subject Rights

CNIL enforces all GDPR rights with specific French requirements:

### 4.1 Right of Access (Article 15)

**French Specificity**: Response must be in French if requested

- User dashboard: `/account/privacy`
- JSON export available
- Response time: 30 days (1 month)

### 4.2 Right to Rectification (Article 16)

- Self-service: `/account/settings`
- Contact: roberdan@fightthestroke.org
- Corrected within 5 business days

### 4.3 Right to Erasure (Article 17)

**French Specificity**: "Droit à l'oubli" (right to be forgotten)

- Self-service deletion: `/account/delete`
- 30-day grace period before permanent deletion
- Exceptions: Legal retention (tax), ongoing legal claims

### 4.4 Right to Restriction (Article 18)

- Request via contact form
- Account placed in restricted state (no AI processing)
- Response within 7 business days

### 4.5 Right to Data Portability (Article 20)

**French Specificity**: Must be in commonly used, machine-readable format

- JSON export (structured data)
- Direct download or transfer to third party

### 4.6 Right to Object (Article 21)

- Object to legitimate interest processing
- Object to direct marketing (opt-out)
- Honored within 5 business days

### 4.7 Automated Decision-Making (Article 22)

**CNIL Requirement**: Explicit notice if automated decisions have legal/significant effects

- MirrorBuddy: No fully automated decisions
- AI suggestions require user approval

**Contact for Rights Requests:**

- **Email**: roberdan@fightthestroke.org
- **Subject line**: [Droits RGPD - MirrorBuddy]
- **Response time**: 30 days (extendable to 90 if complex)

---

## 5. Data Breach Notification

### 5.1 Notification to CNIL (Article 33)

**Timeline**: Within 72 hours of becoming aware of breach

**Process:**

1. Detect breach (automated + user reports)
2. Assess severity (CNIL severity scale: low/medium/high/critical)
3. If high risk: Notify CNIL within 72 hours
4. Use CNIL online portal: https://notifications.cnil.fr

**French-Specific Requirements:**

- Notification must be in French
- Include CNIL incident reference number
- Follow CNIL breach notification template

**Information to Include:**

- Nature of breach (type, date, duration)
- Data categories affected
- Estimated number of French data subjects
- Likely consequences
- Measures taken/proposed
- Contact: roberdan@fightthestroke.org

### 5.2 Notification to Data Subjects (Article 34)

**When Required**: If breach likely to result in high risk to rights/freedoms

**French Requirement**: Notification must be in French

**Method:**

- Direct email (preferred by CNIL)
- Website notice if individual contact impossible
- Clear, simple language (avoid technical jargon)

---

## 6. Data Protection Officer (DPO)

**Status**: Not yet designated (threshold not met)

**CNIL Guidance**: DPO required if:

- Public authority (not applicable to MirrorBuddy)
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale special category data processing

**MirrorBuddy Assessment:**

- Private foundation (not public authority)
- Pilot phase, limited users (not large-scale)
- **Conclusion**: DPO not required at current scale

**Future Plan:**

- Designate DPO if exceed 10,000 active users in France
- Interim contact: roberdan@fightthestroke.org

---

## 7. International Data Transfers

### 7.1 Third-Country Transfers

**CNIL Strict Enforcement**: Post-Schrems II, CNIL actively investigates US transfers

| Service      | Location       | Safeguard                    | CNIL Compliance |
| ------------ | -------------- | ---------------------------- | --------------- |
| **Vercel**   | US (+ EU)      | EU-US Data Privacy Framework | ✅ Monitored    |
| **Supabase** | EU (Frankfurt) | No transfer                  | ✅ EU-only      |
| **Sentry**   | US             | SCCs + TIA                   | ✅ Assessed     |
| **Grafana**  | US (+ EU)      | SCCs + TIA                   | ✅ Assessed     |
| **OpenAI**   | US             | No PII sent + TIA            | ✅ Anonymized   |
| **Stripe**   | US             | SCCs + adequate safeguards   | ✅ Payments     |

### 7.2 CNIL Requirements

**Transfer Impact Assessment (TIA)**: Required for all US transfers

- Document security of third country
- Assess risk of government access to data
- Implement supplementary measures if needed

**Supplementary Measures Applied:**

- Data minimization: No PII to OpenAI
- Encryption: TLS 1.3 in transit, AES-256 at rest
- Pseudonymization: User IDs instead of names
- Right to erasure enforced across processors

---

## 8. Children's Data (Minors)

### 8.1 Age of Consent (Article 8 GDPR)

**French Law**: Age of digital consent is **15 years** (Ordonnance 2018-1125, Article 45)

**MirrorBuddy Target Users**: Ages 8-18 (many below 15)

**Parental Consent Requirements:**

- Users under 15 require verifiable parental consent
- Consent mechanism: Parent/guardian email verification
- Parent can exercise all data subject rights on behalf of child

### 8.2 CNIL Guidance on Minors

**Additional Protections (CNIL Recommendation):**

- No profiling of minors for marketing purposes
- Enhanced security (2FA for parent accounts)
- Annual DPIA review for child data processing
- Clear information in age-appropriate language

**Implementation:**

- Age gate during registration
- Parent email verification if under 15
- Parent dashboard: `/account/parent-dashboard`
- No targeted advertising to minors

---

## 9. Records of Processing Activities (Article 30)

**French Requirement**: CNIL expects detailed records

**MirrorBuddy Implementation:**

- Internal document: `DATA-FLOW-MAPPING.md`
- Updated quarterly
- Includes: purposes, legal bases, categories, recipients, retention, safeguards, transfers

**Available to CNIL upon request in French.**

---

## 10. Data Protection Impact Assessment (DPIA) (Article 35)

**Status**: ✅ **COMPLETED**

**Document**: `docs/compliance/DPIA.md`

**CNIL Requirement**: DPIA mandatory for:

- Special category data (DSA profiles)
- Children's data at scale
- AI-based decision support

**Assessment Results:**

- Risks: Data breach, bias, unauthorized access
- Mitigations: Encryption, bias audits, access controls
- Residual risk: LOW
- CNIL consultation: Not required (adequate mitigations)

**Review Schedule**: Annually or when material changes occur

---

## 11. Cookies and Trackers

### French Cookie Law (Loi 78-17 + CNIL Guidelines)

**CNIL Strict Enforcement**: Prior consent required for all non-essential cookies

**MirrorBuddy Implementation:**

- Cookie consent banner (French language)
- Granular consent (analytics, marketing, functional)
- No cookies dropped before consent
- 13-month consent validity (CNIL standard)
- Easy withdrawal via `/account/cookies`

**Cookie Categories:**

1. **Essential**: Session, auth (no consent needed)
2. **Analytics**: Usage metrics (consent required)
3. **Marketing**: None currently used

**Reference**: See `docs/compliance/countries/france/cookie-compliance.md`

---

## 12. Vendor Management (Article 28)

All data processors have signed DPAs compliant with CNIL requirements:

| Vendor       | Role             | DPA Status | French Addendum |
| ------------ | ---------------- | ---------- | --------------- |
| **Vercel**   | Hosting          | ✅ Signed  | Not needed      |
| **Supabase** | Database         | ✅ Signed  | Not needed      |
| **Sentry**   | Error monitoring | ✅ Signed  | Not needed      |
| **Grafana**  | Performance      | ✅ Signed  | Not needed      |
| **OpenAI**   | AI API (Azure)   | ✅ Signed  | Not needed      |
| **Stripe**   | Payments         | ✅ Signed  | Not needed      |

---

## 13. Compliance Checklist

### Pre-Launch

- [x] Legal basis documented for all processing
- [x] Privacy Policy published (French + English)
- [x] Cookie consent banner (CNIL-compliant)
- [x] Data subject rights implemented
- [x] DPIA completed
- [x] Records of processing documented
- [x] DPAs signed with all processors
- [x] Parental consent for users under 15
- [x] Breach response plan documented
- [ ] Register with CNIL if required (TBD based on scale)

### Ongoing

- [ ] Annual DPIA review
- [ ] Quarterly records update
- [ ] Monitor breaches (automated + manual)
- [ ] Respond to rights requests within 30 days
- [ ] Update Privacy Policy (notify users)
- [ ] Vendor DPA renewal (annual review)

---

## 14. Resources & Guidance

### CNIL Resources

| Resource                     | URL                                        | Purpose                 |
| ---------------------------- | ------------------------------------------ | ----------------------- |
| **CNIL Homepage**            | https://www.cnil.fr                        | Official DPA website    |
| **RGPD Guidelines**          | https://www.cnil.fr/fr/reglement-europeen  | GDPR guidance (French)  |
| **Breach Notification**      | https://notifications.cnil.fr              | Report breaches         |
| **Cookie Guidelines**        | https://www.cnil.fr/fr/cookies-et-traceurs | Cookie compliance       |
| **Children's Data Guidance** | https://www.cnil.fr/fr/mineurs             | Minors' data protection |

---

## 15. Contact Information

**For data protection inquiries:**

- **Email**: roberdan@fightthestroke.org
- **Subject line**: [Protection des données - MirrorBuddy]
- **Response time**: 5 business days (rights requests: 30 days)

**To exercise data subject rights:**

- **Portal**: `/account/privacy` (self-service)
- **Email**: roberdan@fightthestroke.org

**For data breach reports:**

- **Urgent contact**: roberdan@fightthestroke.org
- **Subject line**: [URGENT - Violation de données]

**CNIL:**

- **Website**: https://www.cnil.fr
- **Phone**: +33 1 53 73 22 22
- **Complaints**: https://www.cnil.fr/fr/plaintes

---

**Document Version**: 1.0
**Last Updated**: 09 February 2026
**Next Review**: 09 February 2027
**Status**: Active
**Owner**: Fightthestroke Foundation
**Reference**: GDPR, Loi 78-17, CNIL Guidelines
