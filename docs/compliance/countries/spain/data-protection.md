# Conformidad de Protección de Datos — España

# Spain Data Protection Compliance

> **Idioma / Language**: Documento redactado en inglés para uso interno. Se requiere traducción profesional al español antes de su presentación a la AEPD.
> Document written in English for internal use. Professional Spanish translation required before submission to AEPD.

**Jurisdicción / Jurisdiction**: Reino de España (Estado Miembro UE)
**Legislación / Legislation**: RGPD + LOPDGDD (Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales 3/2018)
**Effective**: GDPR (25 May 2018), LOPDGDD (07 Dec 2018)
**Autoridad / Data Protection Authority**: AEPD (Agencia Española de Protección de Datos)
**Estado / Status**: CONFORME / COMPLIANT - Subject to ongoing monitoring

---

## 1. Legal Framework

| Document           | Section      | Effective   | Scope                       |
| ------------------ | ------------ | ----------- | --------------------------- |
| **GDPR**           | All articles | 25 May 2018 | EU-wide data protection     |
| **LOPDGDD 3/2018** | All articles | 07 Dec 2018 | Spanish data protection law |

### AEPD (Agencia Española de Protección de Datos)

**Contact:**

- Website: https://www.aepd.es
- Email: internacional@aepd.es
- Phone: +34 901 100 099
- Address: C/ Jorge Juan, 6, 28001 Madrid, Spain

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [RGPD - MirrorBuddy]

---

## 2. Legal Bases (Article 6 GDPR + LOPDGDD)

### Consent (Article 6(1)(a))

**LOPDGDD Art. 6**: Consent must be free, specific, informed, unambiguous

- User accounts (opt-in)
- Google Drive, newsletter
- Cookies (consent required)

### Contract (Article 6(1)(b))

- Pro subscriptions (Stripe)
- Service delivery

### Legal Obligation (Article 6(1)(c))

- Tax records (Spanish law: 4-6 year retention)
- Breach notification to AEPD (72 hours)

### Legitimate Interest (Article 6(1)(f))

**LOPDGDD Art. 19**: Legitimate interest assessment required

- Security monitoring
- Performance monitoring
- Anonymous analytics

---

## 3. Special Category Data (Article 9 + LOPDGDD Art. 9)

**DSA Profile Data** (health-related):

- **Legal Basis**: Article 9(2)(a) Explicit consent + Article 9(2)(g) Substantial public interest
- **LOPDGDD Art. 9**: Enhanced safeguards for health data of minors
- **Safeguards**: Pseudonymization, encryption, access controls, annual DPIA

---

## 4. Data Subject Rights

AEPD enforces all GDPR rights with Spanish-specific requirements:

### Access (Article 15) | Rectification (Article 16)

**LOPDGDD Art. 13-14**: Response must be in Spanish if requested

- Portal: `/account/privacy` (self-service)
- Response: 30 days
- Contact: roberdan@fightthestroke.org

### Erasure (Article 17) | Restriction (Article 18)

**LOPDGDD Art. 15-16**: Right to be forgotten ("derecho al olvido")

- Self-service deletion: `/account/delete`
- 30-day grace period
- Exceptions: Legal retention

### Data Portability (Article 20) | Right to Object (Article 21)

**LOPDGDD Art. 17-18**:

- JSON export (machine-readable)
- Opt-out for legitimate interest processing

### Automated Decision-Making (Article 22)

**LOPDGDD Art. 11**: Explicit notice if automated decisions have legal effects

- MirrorBuddy: No fully automated decisions
- AI suggestions require user approval

**Contact**: roberdan@fightthestroke.org | Subject: [Derechos RGPD - MirrorBuddy] | Response: 30 days

---

## 5. Data Breach Notification

### To AEPD (Article 33)

- **Timeline**: 72 hours
- **Portal**: https://www.aepd.es/es/derechos-y-deberes/conoce-tus-derechos/violacion-de-seguridad
- **Language**: Spanish required
- **Contact**: roberdan@fightthestroke.org

### To Data Subjects (Article 34)

**LOPDGDD Art. 33**: Clear, accessible language

- **When**: High risk to rights/freedoms
- **Method**: Direct email (Spanish language)

---

## 6. Data Protection Officer (DPO)

**Status**: Not yet designated

**LOPDGDD Art. 34**: DPO required if:

- Public authority
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale special category data

**Assessment**: Pilot phase, private foundation → DPO not required yet
**Future**: Designate when exceed 10,000 users
**Interim**: roberdan@fightthestroke.org

---

## 7. International Data Transfers

### Third-Country Transfers (Chapter V GDPR + LOPDGDD Art. 40-42)

**AEPD Strict Enforcement**: Post-Schrems II, AEPD actively reviews US transfers

| Service      | Location       | Safeguard                     | AEPD Compliance |
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

### Age of Consent (Article 8 GDPR + LOPDGDD Art. 7)

**Spanish Law**: Age 14 (LOPDGDD Art. 7)

**MirrorBuddy**: Users ages 8-18

- Under 14 require parental consent
- Parent email verification
- Parent dashboard: `/account/parent-dashboard`
- No targeted advertising to minors

**LOPDGDD Art. 92**: Rights of minors in digital environment

- Enhanced protections for children
- 2FA for parent accounts
- Annual DPIA for child data
- Age-appropriate language

---

## 9. Records of Processing Activities (Article 30)

**LOPDGDD Art. 31**: Maintain detailed records

**Implementation**:

- Document: `DATA-FLOW-MAPPING.md`
- Updated quarterly
- Available to AEPD upon request (in Spanish)

---

## 10. DPIA (Article 35 + LOPDGDD Art. 28)

**Status**: ✅ COMPLETED (`docs/compliance/DPIA.md`)

**LOPDGDD Requirement**: DPIA mandatory for:

- Special category data (DSA profiles)
- Children's data
- AI-based decision support

**Results**: Residual risk LOW (adequate mitigations)
**Review**: Annually

---

## 11. Cookies and Trackers (LOPDGDD Art. 22)

**Spanish Cookie Law** (LOPDGDD + AEPD Guidelines):

- Explicit consent required for non-essential cookies
- Consent banner (Spanish language)
- Granular consent options
- 13-month validity (AEPD standard)
- Easy withdrawal

**Categories**:

1. Essential (no consent): Session, auth
2. Analytics (consent required): Usage metrics
3. Marketing: None currently

**Reference**: See `docs/compliance/countries/spain/cookie-compliance.md`

---

## 12. Vendor Management (Article 28)

All processors have signed DPAs:

| Vendor   | DPA Status | Spanish Addendum |
| -------- | ---------- | ---------------- |
| Vercel   | ✅ Signed  | Not needed       |
| Supabase | ✅ Signed  | Not needed       |
| Sentry   | ✅ Signed  | Not needed       |
| Grafana  | ✅ Signed  | Not needed       |
| OpenAI   | ✅ Signed  | Not needed       |
| Stripe   | ✅ Signed  | Not needed       |

---

## 13. Compliance Checklist

### Pre-Launch

- [x] Legal bases documented
- [x] Privacy Policy (Spanish + English)
- [x] Cookie consent (LOPDGDD-compliant)
- [x] Data subject rights
- [x] DPIA completed
- [x] Processing records
- [x] DPAs signed
- [x] Parental consent (under 14)
- [x] Breach response plan

### Ongoing

- [ ] Annual DPIA review
- [ ] Quarterly records update
- [ ] Rights requests within 30 days
- [ ] Privacy Policy updates
- [ ] Vendor DPA renewal

---

## 14. Resources

| Resource              | URL                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------ |
| **AEPD Homepage**     | https://www.aepd.es                                                                  |
| **RGPD Guidelines**   | https://www.aepd.es/es/areas-de-actuacion/reglamento-europeo-de-proteccion-de-datos  |
| **Breach Reporting**  | https://www.aepd.es/es/derechos-y-deberes/conoce-tus-derechos/violacion-de-seguridad |
| **Cookie Guidelines** | https://www.aepd.es/es/areas-de-actuacion/cookies                                    |
| **Children's Data**   | https://www.aepd.es/es/areas-de-actuacion/menores                                    |

---

## 15. Contact Information

**For data protection inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Protección de datos - MirrorBuddy]
- Response: 5 business days (rights: 30 days)

**To exercise data subject rights:**

- Portal: `/account/privacy`
- Email: roberdan@fightthestroke.org

**For data breach reports:**

- Email: roberdan@fightthestroke.org
- Subject: [URGENTE - Violación de seguridad]

**AEPD:**

- Website: https://www.aepd.es
- Email: internacional@aepd.es
- Phone: +34 901 100 099

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 February 2027
**Owner**: Fightthestroke Foundation | **Reference**: GDPR, LOPDGDD, AEPD Guidelines
