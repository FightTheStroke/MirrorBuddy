# Datenschutz-Konformität — Deutschland

# Germany Data Protection Compliance

> **Sprache / Language**: Dokument in englischer Sprache für den internen Gebrauch erstellt. Eine professionelle Übersetzung ins Deutsche ist vor der Einreichung beim BfDI erforderlich.
> Document written in English for internal use. Professional German translation required before submission to BfDI.

**Zuständigkeit / Jurisdiction**: Bundesrepublik Deutschland (EU-Mitgliedstaat)
**Gesetzgebung / Legislation**: DSGVO + BDSG (Bundesdatenschutzgesetz, geändert 2018/2019)
**Effective**: GDPR (25 May 2018), BDSG amendments (25 May 2018)
**Behörde / Data Protection Authority**: BfDI (Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit)
**Status / Zustand**: KONFORM / COMPLIANT - Subject to ongoing monitoring

---

## 1. Legal Framework

| Document  | Section      | Effective   | Scope                        |
| --------- | ------------ | ----------- | ---------------------------- |
| **GDPR**  | All articles | 25 May 2018 | EU-wide data protection      |
| **BDSG**  | As amended   | 25 May 2018 | German data protection law   |
| **TTDSG** | All articles | 01 Dec 2021 | Telecommunications/e-Privacy |

### BfDI (Bundesbeauftragter für den Datenschutz und die Informationsfreiheit)

**Contact:**

- Website: https://www.bfdi.bund.de
- Email: poststelle@bfdi.bund.de
- Phone: +49 (0)228 99 7799-0
- Address: Graurheindorfer Str. 153, 53117 Bonn, Germany

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [DSGVO - MirrorBuddy]

---

## 2. Legal Bases (Article 6 GDPR + BDSG)

### Consent (Article 6(1)(a))

- User accounts (opt-in)
- Google Drive, newsletter
- Cookies (TTDSG § 25 requires explicit consent)

### Contract (Article 6(1)(b))

- Pro subscriptions (Stripe)
- Service delivery

### Legal Obligation (Article 6(1)(c))

- Tax records (10-year retention, German tax law)
- Breach notification to BfDI (72 hours)

### Legitimate Interest (Article 6(1)(f))

**BDSG § 6**: Legitimate interest assessment required

- Security monitoring
- Performance monitoring
- Anonymous analytics

---

## 3. Special Category Data (Article 9 + BDSG § 22)

**DSA Profile Data** (health-related):

- **Legal Basis**: Article 9(2)(a) Explicit consent + Article 9(2)(g) Substantial public interest
- **BDSG § 22(1)(b)**: Processing for research/education allowed with safeguards
- **Safeguards**: Pseudonymization, encryption, access controls, annual DPIA

---

## 4. Data Subject Rights

BfDI enforces strict GDPR compliance:

### Access (Article 15) | Rectification (Article 16)

- Portal: `/account/privacy` (self-service)
- Response: 30 days
- Contact: roberdan@fightthestroke.org

### Erasure (Article 17) | Restriction (Article 18)

- Self-service deletion: `/account/delete`
- 30-day grace period
- Exceptions: Legal retention

### Data Portability (Article 20) | Right to Object (Article 21)

- JSON export
- Opt-out for legitimate interest processing

### Automated Decision-Making (Article 22)

- No fully automated decisions with legal effects
- AI suggestions require user approval

**Contact**: roberdan@fightthestroke.org | Subject: [DSGVO-Rechte - MirrorBuddy] | Response: 30 days

---

## 5. Data Breach Notification

### To BfDI (Article 33)

- **Timeline**: 72 hours
- **Portal**: https://www.bfdi.bund.de/DE/Datenschutz/Meldungen/meldungen_node.html
- **Language**: German required
- **Contact**: roberdan@fightthestroke.org

### To Data Subjects (Article 34)

- **When**: High risk to rights/freedoms
- **Method**: Direct email (German language)
- Clear, simple explanation

---

## 6. Data Protection Officer (DPO)

**Status**: Not yet designated

**BDSG § 38**: DPO required if:

- At least 20 persons regularly process personal data
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale special category data

**Assessment**: Pilot phase, small team → DPO not required yet
**Future**: Designate when exceed 10,000 users or 20+ staff
**Interim**: roberdan@fightthestroke.org

---

## 7. International Data Transfers

### Third-Country Transfers (Chapter V GDPR + BDSG § 84)

| Service      | Location       | Safeguard                     | BfDI Compliance |
| ------------ | -------------- | ----------------------------- | --------------- |
| **Vercel**   | US (+ EU)      | EU-US Data Privacy Framework  | ✅              |
| **Supabase** | EU (Frankfurt) | No transfer                   | ✅ EU-only      |
| **Sentry**   | US             | SCCs + supplementary measures | ✅              |
| **Grafana**  | US (+ EU)      | SCCs + supplementary measures | ✅              |
| **OpenAI**   | US             | No PII sent                   | ✅ Anonymized   |
| **Stripe**   | US             | SCCs + adequate safeguards    | ✅              |

**Supplementary Measures**: Data minimization, encryption (TLS 1.3, AES-256), pseudonymization

---

## 8. Children's Data (Minors)

### Age of Consent (Article 8 GDPR + BDSG)

**German Law**: Age 16 (BDSG follows GDPR default)

**MirrorBuddy**: Users ages 8-18

- Under 16 require parental consent
- Parent email verification
- Parent dashboard: `/account/parent-dashboard`
- No targeted advertising to minors

**BfDI Guidance**: Enhanced protections for children

- 2FA for parent accounts
- Annual DPIA for child data
- Clear age-appropriate language

---

## 9. Records of Processing Activities (Article 30)

**BDSG § 70**: Maintain detailed records

**Implementation**:

- Document: `DATA-FLOW-MAPPING.md`
- Updated quarterly
- Available to BfDI upon request (in German)

---

## 10. DPIA (Article 35 + BDSG § 67)

**Status**: ✅ COMPLETED (`docs/compliance/DPIA.md`)

**Trigger**: Special category data + minors + AI
**Results**: Residual risk LOW (adequate mitigations)
**Review**: Annually

---

## 11. Cookies and Trackers (TTDSG § 25)

**German Cookie Law** (Telecommunications Telemedia Data Protection Act):

- Explicit consent required for non-essential cookies
- Consent banner (German language)
- Granular consent options
- 13-month validity
- Easy withdrawal

**Categories**:

1. Essential (no consent): Session, auth
2. Analytics (consent required): Usage metrics
3. Marketing: None currently

---

## 12. Vendor Management (Article 28)

All processors have signed DPAs:

| Vendor   | DPA Status | German Addendum |
| -------- | ---------- | --------------- |
| Vercel   | ✅ Signed  | Not needed      |
| Supabase | ✅ Signed  | Not needed      |
| Sentry   | ✅ Signed  | Not needed      |
| Grafana  | ✅ Signed  | Not needed      |
| OpenAI   | ✅ Signed  | Not needed      |
| Stripe   | ✅ Signed  | Not needed      |

---

## 13. Compliance Checklist

### Pre-Launch

- [x] Legal bases documented
- [x] Privacy Policy (German + English)
- [x] Cookie consent (TTDSG-compliant)
- [x] Data subject rights
- [x] DPIA completed
- [x] Processing records
- [x] DPAs signed
- [x] Parental consent (under 16)
- [x] Breach response plan

### Ongoing

- [ ] Annual DPIA review
- [ ] Quarterly records update
- [ ] Rights requests within 30 days
- [ ] Privacy Policy updates
- [ ] Vendor DPA renewal

---

## 14. Resources

| Resource               | URL                                                                   |
| ---------------------- | --------------------------------------------------------------------- |
| **BfDI Homepage**      | https://www.bfdi.bund.de                                              |
| **DSGVO Guidelines**   | https://www.bfdi.bund.de/DE/Datenschutz/datenschutz_node.html         |
| **Breach Reporting**   | https://www.bfdi.bund.de/DE/Datenschutz/Meldungen/meldungen_node.html |
| **TTDSG (Cookie Law)** | https://www.bfdi.bund.de/DE/TTDSG/ttdsg_node.html                     |

---

## 15. Contact Information

**For data protection inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Datenschutz - MirrorBuddy]
- Response: 5 business days (rights: 30 days)

**To exercise data subject rights:**

- Portal: `/account/privacy`
- Email: roberdan@fightthestroke.org

**For data breach reports:**

- Email: roberdan@fightthestroke.org
- Subject: [URGENT - Datenschutzverletzung]

**BfDI:**

- Website: https://www.bfdi.bund.de
- Email: poststelle@bfdi.bund.de
- Phone: +49 (0)228 99 7799-0

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 February 2027
**Owner**: Fightthestroke Foundation | **Reference**: GDPR, BDSG, TTDSG, BfDI Guidelines
