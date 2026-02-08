# Legal Review Checklist by Country

**Plan**: 90 - Multi-Language-Compliance (T6-05)
**Status**: In Progress
**Last Updated**: 8 February 2026

---

## Overview

This checklist provides country-specific legal review requirements for MirrorBuddy's compliance across 5 countries (Italy, Spain, France, Germany, UK).

**Legend**: [x] = done and verified | [ ] = not yet done | [~] = partial (see notes)

---

## Italy

### GDPR/Data Protection

- [x] **Data Protection Law**: D.Lgs 196/2003 compliance verified
- [x] **Age of Consent**: 14 years (under 14 requires parental consent)
- [x] **DSAR Response Time**: 30 days
- [x] **Authority**: Garante per la Protezione dei Dati Personali
- [x] **Contact**: garante@gpdp.it
- [ ] **Documentation**: `docs/compliance/countries/italy/data-protection.md` — NOT YET CREATED

### Cookie Consent

- [x] **Regulation**: GDPR Article 7
- [x] **Language**: Italian required
- [x] **Reject All**: Must be prominent — implemented via geo-based config
- [x] **Cookie Wall**: Prohibited — verified in implementation
- [ ] **Documentation**: `docs/compliance/countries/italy/cookie-compliance.md` — NOT YET CREATED
- [x] **Implementation**: Geo-based cookie consent with Italian text

### Accessibility

- [x] **Regulation**: Law 4/2004 (Legge Stanca)
- [x] **Standard**: WCAG 2.1 Level AA
- [x] **Language**: Italian required
- [x] **Authority**: AGID (Agenzia per l'Italia Digitale)
- [x] **Documentation**: `docs/compliance/countries/italy/accessibility-compliance.md`
- [ ] **Implementation**: Accessibility statement in Italian — NOT YET CREATED

### AI Act Compliance

- [x] **National Implementation**: L.132/2025
- [x] **Authority**: AgID
- [x] **High-Risk Classification**: Verified
- [x] **Documentation**: `docs/compliance/AI-RISK-CLASSIFICATION.md`
- [ ] **Contacts**: `docs/compliance/countries/italy/ai-regulatory-contacts.md` — NOT YET CREATED

**Status**: 🟡 **PARTIAL** — missing data-protection doc, cookie doc, accessibility statement, AI contacts

---

## Spain

### GDPR/Data Protection

- [x] **Data Protection Law**: LOPDGDD (Ley Orgánica 3/2018) compliance verified
- [x] **Age of Consent**: 14 years (under 14 requires parental consent)
- [x] **DSAR Response Time**: 10 days (stricter than GDPR 30 days)
- [x] **Authority**: AEPD (Agencia Española de Protección de Datos)
- [x] **Contact**: consultas@aepd.es
- [ ] **Documentation**: `docs/compliance/countries/spain/data-protection.md` — NOT YET CREATED

### Cookie Consent

- [x] **Regulation**: LOPDGDD Article 22
- [x] **Language**: Spanish required
- [x] **Reject All**: Must be prominent ("Rechazar Todo") — implemented
- [x] **Cookie Wall**: Prohibited — verified
- [x] **Documentation**: `docs/compliance/countries/spain/cookie-compliance.md`
- [x] **Implementation**: Geo-based cookie consent with Spanish text

### Accessibility

- [x] **Regulation**: Real Decreto 1112/2018
- [x] **Standard**: WCAG 2.1 Level AA
- [x] **Language**: Spanish required
- [x] **Authority**: Ministerio de Asuntos Económicos y Transformación Digital + Observatorio de Accesibilidad Web (OAW)
- [x] **Documentation**: `docs/compliance/countries/spain/accessibility-compliance.md`
- [ ] **Implementation**: Accessibility statement in Spanish — NOT YET CREATED

### AI Act Compliance

- [x] **National Implementation**: EU AI Act (direct application)
- [x] **Authority**: AESIA (Agencia Española de Supervisión de la Inteligencia Artificial)
- [x] **High-Risk Classification**: Verified
- [x] **Documentation**: `docs/compliance/AI-RISK-CLASSIFICATION.md`
- [ ] **Contacts**: `docs/compliance/countries/spain/ai-regulatory-contacts.md` — NOT YET CREATED

**Status**: 🟡 **PARTIAL** — missing data-protection doc, accessibility statement, AI contacts

---

## France

### GDPR/Data Protection

- [x] **Data Protection Law**: Law 78-17 (Informatique et Libertés) compliance verified
- [x] **Age of Consent**: 16 years (under 16 requires parental consent)
- [x] **DSAR Response Time**: 30 days
- [x] **Authority**: CNIL (Commission Nationale de l'Informatique et des Libertés)
- [x] **Contact**: contact@cnil.fr
- [ ] **Documentation**: `docs/compliance/countries/france/data-protection.md` — NOT YET CREATED

### Cookie Consent

- [x] **Regulation**: Law 78-17 Article 82 + CNIL Deliberation 2020-091
- [x] **Language**: French required
- [x] **Reject All**: Must be prominent ("Tout Refuser") — implemented
- [x] **Cookie Wall**: Prohibited — verified
- [x] **Documentation**: `docs/compliance/countries/france/cookie-compliance.md`
- [x] **Implementation**: Geo-based cookie consent with French text

### Accessibility

- [x] **Regulation**: RGAA 4.1 (Référentiel Général d'Amélioration de l'Accessibilité)
- [x] **Standard**: WCAG 2.1 Level AA
- [x] **Language**: French required
- [x] **Authority**: DINUM (Direction Interministérielle du Numérique) + Défenseur des droits
- [x] **Documentation**: `docs/compliance/countries/france/accessibility-compliance.md`
- [ ] **Implementation**: Accessibility statement in French — NOT YET CREATED

### AI Act Compliance

- [x] **National Implementation**: EU AI Act (direct application)
- [x] **Authority**: CNIL (data protection) + Ministry of Economy (AI oversight)
- [x] **High-Risk Classification**: Verified
- [x] **Documentation**: `docs/compliance/AI-RISK-CLASSIFICATION.md`
- [ ] **Contacts**: `docs/compliance/countries/france/ai-regulatory-contacts.md` — NOT YET CREATED

**Status**: 🟡 **PARTIAL** — missing data-protection doc, accessibility statement, AI contacts

---

## Germany

### GDPR/Data Protection

- [x] **Data Protection Law**: BDSG (Bundesdatenschutzgesetz) compliance verified
- [x] **Age of Consent**: 16 years (under 16 requires parental consent)
- [x] **DSAR Response Time**: 30 days
- [x] **Authority**: BfDI (Bundesbeauftragter für den Datenschutz und die Informationsfreiheit)
- [x] **Contact**: poststelle@bfdi.bund.de
- [ ] **Documentation**: `docs/compliance/countries/germany/data-protection.md` — NOT YET CREATED

### Cookie Consent

- [x] **Regulation**: TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz) Article 3
- [x] **Language**: German required
- [x] **Reject All**: Must be prominent ("Alle Ablehnen") — implemented
- [x] **Cookie Wall**: Prohibited — verified
- [ ] **Documentation**: `docs/compliance/countries/germany/cookie-compliance.md` — NOT YET CREATED
- [x] **Implementation**: Geo-based cookie consent with German text

### Accessibility

- [x] **Regulation**: BITV 2.0 (Barrierefreie-Informationstechnik-Verordnung)
- [x] **Standard**: WCAG 2.1 Level AA
- [x] **Language**: German required
- [x] **Authority**: BFIT-Bund (Bundesfachstelle Barrierefreiheit) + Schlichtungsstelle BGG
- [x] **Documentation**: `docs/compliance/countries/germany/accessibility-compliance.md`
- [ ] **Implementation**: Accessibility statement in German — NOT YET CREATED

### AI Act Compliance

- [x] **National Implementation**: EU AI Act (direct application)
- [x] **Authority**: BfDI (data protection aspects)
- [x] **High-Risk Classification**: Verified
- [x] **Documentation**: `docs/compliance/AI-RISK-CLASSIFICATION.md`
- [ ] **Contacts**: `docs/compliance/countries/germany/ai-regulatory-contacts.md` — NOT YET CREATED

**Status**: 🟡 **PARTIAL** — missing data-protection doc, cookie doc, accessibility statement, AI contacts

---

## UK

### Data Protection

- [x] **Data Protection Law**: UK GDPR + Data Protection Act 2018 compliance verified
- [x] **Age of Consent**: 13 years (under 13 requires parental consent)
- [x] **DSAR Response Time**: 30 days
- [x] **Authority**: ICO (Information Commissioner's Office)
- [x] **Contact**: casework@ico.org.uk
- [ ] **Documentation**: `docs/compliance/countries/uk/data-protection.md` — NOT YET CREATED

### Cookie Consent

- [x] **Regulation**: UK GDPR + ICO Guidelines (PECR)
- [x] **Language**: English required
- [x] **Reject All**: Must be prominent ("Reject All") — implemented
- [x] **Cookie Wall**: Prohibited — verified
- [ ] **Documentation**: `docs/compliance/countries/uk/cookie-compliance.md` — NOT YET CREATED
- [x] **Implementation**: Geo-based cookie consent with English text

### Accessibility

- [x] **Regulation**: Public Sector Bodies Accessibility Regulations 2018
- [x] **Standard**: WCAG 2.1 Level AA (GOV.UK Design System)
- [x] **Language**: English required
- [x] **Authority**: EHRC (Equality and Human Rights Commission) + ICO
- [x] **Documentation**: `docs/compliance/countries/uk/accessibility-compliance.md`
- [ ] **Implementation**: Accessibility statement in English — NOT YET CREATED

### AI Compliance

- [~] **National Framework**: UK has no AI-specific legislation yet; ICO and AI Safety Institute provide guidance
- [x] **Authority**: ICO (data protection) + AI Safety Institute (safety evaluations)
- [x] **High-Risk Classification**: Verified under EU AI Act framework (voluntary alignment)
- [x] **Documentation**: `docs/compliance/AI-RISK-CLASSIFICATION.md`
- [ ] **Contacts**: `docs/compliance/countries/uk/ai-regulatory-contacts.md` — NOT YET CREATED

**Status**: 🟡 **PARTIAL** — missing data-protection doc, cookie doc, accessibility statement, AI contacts

---

## Cross-Country Requirements

### Common Requirements (All Countries)

- [x] **Privacy Policy**: Localized for all 5 languages
- [x] **Cookie Policy**: Localized for all 5 languages
- [ ] **Accessibility Statement**: NOT YET CREATED for any language
- [x] **AI Transparency Policy**: Localized for all 5 languages
- [x] **DPIA**: Complete and up-to-date
- [x] **Data Flow Mapping**: Complete
- [ ] **DPAs**: Processor agreements — NOT YET VERIFIED
- [x] **SCCs**: All extra-EU transfers protected (Vercel EU region pinned)

### Implementation Status

| Requirement                 | Italy | Spain | France | Germany | UK  |
| --------------------------- | ----- | ----- | ------ | ------- | --- |
| **Data Protection Docs**    | ❌    | ❌    | ❌     | ❌      | ❌  |
| **Cookie Consent (code)**   | ✅    | ✅    | ✅     | ✅      | ✅  |
| **Cookie Compliance Doc**   | ❌    | ✅    | ✅     | ❌      | ❌  |
| **Accessibility Doc**       | ✅    | ✅    | ✅     | ✅      | ✅  |
| **Accessibility Statement** | ❌    | ❌    | ❌     | ❌      | ❌  |
| **AI Compliance Docs**      | ✅    | ✅    | ✅     | ✅      | ✅  |
| **AI Regulatory Contacts**  | ❌    | ❌    | ❌     | ❌      | ❌  |
| **Localized Content**       | ✅    | ✅    | ✅     | ✅      | ✅  |

---

## Still To Do

1. **Data protection docs** for all 5 countries (country-specific GDPR implementation details)
2. **Cookie compliance docs** for Italy, Germany, UK
3. **Accessibility statements** for all 5 languages (public-facing, linked from footer)
4. **AI regulatory contacts** for all 5 countries
5. **DPA verification** with all processors (Vercel, Supabase, Azure, Resend, Upstash)
6. **Legal expert review** of all documentation before production launch

---

## Legal Review Process

### Pre-Launch Review (Per Country)

1. **Documentation Review**
   - [ ] Verify all country-specific docs are complete
   - [ ] Verify language is correct (native, not auto-translate)
   - [ ] Verify authority contacts are correct
   - [ ] Verify regulatory framework references are accurate

2. **Implementation Review**
   - [ ] Verify cookie consent shows correct language
   - [ ] Verify accessibility statement shows correct authority
   - [ ] Verify privacy policy references correct laws
   - [ ] Verify age thresholds are correctly implemented

3. **Legal Verification**
   - [ ] Legal expert reviews country-specific docs
   - [ ] Legal expert verifies regulatory framework accuracy
   - [ ] Legal expert confirms authority contacts
   - [ ] Legal expert approves for production

### Ongoing Review (Quarterly)

- [ ] Review regulatory updates per country
- [ ] Update documentation if laws change
- [ ] Verify authority contacts are still valid
- [ ] Update compliance matrix if needed

---

## Quick Reference

### Find Documentation

**Compliance Matrix**: `docs/compliance/COMPLIANCE-MATRIX.md`
**Country Docs**: `docs/compliance/countries/{country}/`
**ADR**: `docs/adr/0090-multi-country-compliance-architecture.md`

---

**Document Version**: 2.0
**Last Updated**: 2026-02-08
**Status**: In Progress
**Next Review**: 2026-05-08 (quarterly)
