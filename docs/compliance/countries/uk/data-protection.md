# UK Data Protection Compliance

**Jurisdiction**: United Kingdom (England, Scotland, Wales, Northern Ireland)
**Legislation**: UK GDPR + Data Protection Act 2018
**Effective**: UK GDPR (01 Jan 2021 post-Brexit), DPA 2018 (25 May 2018)
**Data Protection Authority**: ICO (Information Commissioner's Office)
**Status**: COMPLIANT - Subject to ongoing monitoring

---

## 1. Legal Framework

| Document                     | Section      | Effective   | Scope                     |
| ---------------------------- | ------------ | ----------- | ------------------------- |
| **UK GDPR**                  | All articles | 01 Jan 2021 | UK data protection        |
| **Data Protection Act 2018** | All parts    | 25 May 2018 | UK implementation of GDPR |
| **PECR 2003**                | As amended   | 11 Dec 2003 | e-Privacy/cookies         |

### ICO (Information Commissioner's Office)

**Contact:**

- Website: https://ico.org.uk
- Email: casework@ico.org.uk
- Phone: +44 303 123 1113
- Address: Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [UK GDPR - MirrorBuddy]

---

## 2. Legal Bases (Article 6 UK GDPR + DPA 2018)

### Consent (Article 6(1)(a))

**ICO Guidance**: Consent must be freely given, specific, informed, unambiguous

- User accounts (opt-in)
- Google Drive, newsletter
- Cookies (PECR requires explicit consent)

### Contract (Article 6(1)(b))

- Pro subscriptions (Stripe)
- Service delivery

### Legal Obligation (Article 6(1)(c))

- Tax records (UK law: 6-year retention)
- Breach notification to ICO (72 hours)

### Legitimate Interest (Article 6(1)(f))

**DPA 2018 Schedule 1**: Legitimate interest assessment required

- Security monitoring
- Performance monitoring
- Anonymous analytics

---

## 3. Special Category Data (Article 9 + DPA 2018 Schedule 1)

**DSA Profile Data** (health-related):

- **Legal Basis**: Article 9(2)(a) Explicit consent + Article 9(2)(g) Substantial public interest
- **DPA 2018 Sch. 1 Part 2**: Safeguards for health data
- **Safeguards**: Pseudonymization, encryption, access controls, annual DPIA

---

## 4. Data Subject Rights

ICO enforces all UK GDPR rights:

### Access (Article 15) | Rectification (Article 16)

- Portal: `/account/privacy` (self-service)
- Response: 30 days (1 month)
- Contact: roberdan@fightthestroke.org

### Erasure (Article 17) | Restriction (Article 18)

**Right to be forgotten**:

- Self-service deletion: `/account/delete`
- 30-day grace period
- Exceptions: Legal retention

### Data Portability (Article 20) | Right to Object (Article 21)

- JSON export (machine-readable)
- Opt-out for legitimate interest processing

### Automated Decision-Making (Article 22)

**ICO Requirement**: Explicit notice if automated decisions have legal effects

- MirrorBuddy: No fully automated decisions
- AI suggestions require user approval

**Contact**: roberdan@fightthestroke.org | Subject: [Data Rights - MirrorBuddy] | Response: 30 days

---

## 5. Data Breach Notification

### To ICO (Article 33)

- **Timeline**: 72 hours
- **Portal**: https://ico.org.uk/for-organisations/report-a-breach/
- **Language**: English
- **Contact**: roberdan@fightthestroke.org

### To Data Subjects (Article 34)

**ICO Guidance**: Plain English, clear explanation

- **When**: High risk to rights/freedoms
- **Method**: Direct email

---

## 6. Data Protection Officer (DPO)

**Status**: Not yet designated

**UK GDPR Article 37**: DPO required if:

- Public authority
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale special category data

**Assessment**: Pilot phase, private organization → DPO not required yet
**Future**: Designate when exceed 10,000 users
**Interim**: roberdan@fightthestroke.org

---

## 7. International Data Transfers

### Third-Country Transfers (Chapter V UK GDPR)

**Post-Brexit**: UK has its own adequacy regime

| Service      | Location       | Safeguard                        | ICO Compliance |
| ------------ | -------------- | -------------------------------- | -------------- |
| **Vercel**   | US (+ EU/UK)   | UK Extension to EU SCCs          | ✅             |
| **Supabase** | EU (Frankfurt) | UK adequacy for EU (+ IDTA)      | ✅             |
| **Sentry**   | US             | UK IDTA + supplementary measures | ✅             |
| **Grafana**  | US (+ EU/UK)   | UK IDTA + supplementary measures | ✅             |
| **OpenAI**   | US             | No PII sent                      | ✅ Anonymized  |
| **Stripe**   | US             | UK IDTA + adequate safeguards    | ✅             |

**UK International Data Transfer Agreement (IDTA)**: ICO-approved mechanism
**Supplementary Measures**: Data minimization, encryption, pseudonymization

---

## 8. Children's Data (Minors)

### Age of Consent (Article 8 UK GDPR)

**UK Law**: Age 13 (UK GDPR Article 8(1))

**MirrorBuddy**: Users ages 8-18

- Under 13 require parental consent
- Parent email verification
- Parent dashboard: `/account/parent-dashboard`
- No targeted advertising to minors

**ICO Age-Appropriate Design Code**: Additional protections

- Default high privacy settings for children
- No profiling by default
- Transparent, age-appropriate information
- 2FA for parent accounts

---

## 9. Records of Processing Activities (Article 30)

**UK GDPR Requirement**: Maintain detailed records

**Implementation**:

- Document: `DATA-FLOW-MAPPING.md`
- Updated quarterly
- Available to ICO upon request

---

## 10. DPIA (Article 35)

**Status**: ✅ COMPLETED (`docs/compliance/DPIA.md`)

**ICO Requirement**: DPIA mandatory for:

- Special category data (DSA profiles)
- Children's data at scale
- AI-based decision support

**Results**: Residual risk LOW (adequate mitigations)
**Review**: Annually

---

## 11. Cookies and Trackers (PECR 2003)

**Privacy and Electronic Communications Regulations**:

- Explicit consent required for non-essential cookies
- Consent banner (English language)
- Granular consent options
- 12-month validity (ICO standard)
- Easy withdrawal

**Categories**:

1. Essential (no consent): Session, auth
2. Analytics (consent required): Usage metrics
3. Marketing: None currently

---

## 12. Vendor Management (Article 28)

All processors have signed DPAs with UK addendums where applicable:

| Vendor   | DPA Status | UK Addendum     |
| -------- | ---------- | --------------- |
| Vercel   | ✅ Signed  | ✅ UK Extension |
| Supabase | ✅ Signed  | ✅ UK Extension |
| Sentry   | ✅ Signed  | ✅ UK IDTA      |
| Grafana  | ✅ Signed  | ✅ UK IDTA      |
| OpenAI   | ✅ Signed  | ✅ UK IDTA      |
| Stripe   | ✅ Signed  | ✅ UK IDTA      |

---

## 13. Compliance Checklist

### Pre-Launch

- [x] Legal bases documented
- [x] Privacy Policy (English)
- [x] Cookie consent (PECR-compliant)
- [x] Data subject rights
- [x] DPIA completed
- [x] Processing records
- [x] DPAs signed (UK addendums)
- [x] Parental consent (under 13)
- [x] Breach response plan

### Ongoing

- [ ] Annual DPIA review
- [ ] Quarterly records update
- [ ] Rights requests within 30 days
- [ ] Privacy Policy updates
- [ ] Vendor DPA renewal

---

## 14. Resources

| Resource                    | URL                                                                  |
| --------------------------- | -------------------------------------------------------------------- |
| **ICO Homepage**            | https://ico.org.uk                                                   |
| **UK GDPR Guidance**        | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/ |
| **Breach Reporting**        | https://ico.org.uk/for-organisations/report-a-breach/                |
| **Children's Code**         | https://ico.org.uk/for-organisations/childrens-code/                 |
| **International Transfers** | https://ico.org.uk/for-organisations/international-transfers/        |
| **PECR (Cookie) Guidance**  | https://ico.org.uk/for-organisations/pecr/                           |

---

## 15. Contact Information

**For data protection inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Data Protection - MirrorBuddy]
- Response: 5 business days (rights: 30 days)

**To exercise data subject rights:**

- Portal: `/account/privacy`
- Email: roberdan@fightthestroke.org

**For data breach reports:**

- Email: roberdan@fightthestroke.org
- Subject: [URGENT - Data Breach Report]

**ICO:**

- Website: https://ico.org.uk
- Email: casework@ico.org.uk
- Phone: +44 303 123 1113
- Report breach: https://ico.org.uk/for-organisations/report-a-breach/

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 February 2027
**Owner**: Fightthestroke Foundation | **Reference**: UK GDPR, DPA 2018, PECR 2003, ICO Guidance
