# Compliance Documentation Matrix

**Plan**: 90 - Multi-Language-Compliance (T6-01)
**Status**: Complete
**Last Updated**: 2026-02-07

---

## Overview

This matrix provides a comprehensive mapping of compliance requirements across all supported countries (Italy, Spain, France, Germany, UK) and regulatory frameworks (GDPR, AI Act, Accessibility, Cookie Consent).

---

## Matrix: Country × Requirement

| Requirement               | Italy                                                                 | Spain                                                                 | France                                                                 | Germany                                                                 | UK                                                                 |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **GDPR Compliance**       |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Data Protection Law       | D.Lgs 196/2003                                                        | LOPDGDD                                                               | Law 78-17                                                              | BDSG                                                                    | UK GDPR                                                            |
| Age of Consent            | 14 years                                                              | 14 years                                                              | 16 years                                                               | 16 years                                                                | 13 years (COPPA)                                                   |
| Parental Consent          | Under 14                                                              | Under 14                                                              | Under 16                                                               | Under 16                                                                | Under 13                                                           |
| Data Retention            | 3 years max                                                           | 3 years max                                                           | 3 years max                                                            | 3 years max                                                             | 3 years max                                                        |
| DSAR Response Time        | 30 days                                                               | 10 days                                                               | 30 days                                                                | 30 days                                                                 | 30 days                                                            |
| Authority                 | Garante                                                               | AEPD                                                                  | CNIL                                                                   | BfDI                                                                    | ICO                                                                |
| **Cookie Consent**        |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Regulation                | GDPR Art. 7                                                           | LOPDGDD Art. 22                                                       | Law 78-17 Art. 82                                                      | TTDSG Art. 3                                                            | UK GDPR + ICO                                                      |
| Language Required         | Italian                                                               | Spanish                                                               | French                                                                 | German                                                                  | English                                                            |
| Reject All Prominent      | Yes                                                                   | Yes                                                                   | Yes                                                                    | Yes                                                                     | Yes                                                                |
| Cookie Wall Prohibited    | Yes                                                                   | Yes                                                                   | Yes                                                                    | Yes                                                                     | Yes                                                                |
| Documentation             | `docs-archive/compliance-countries/italy/cookie-compliance.md`        | `docs-archive/compliance-countries/spain/cookie-compliance.md`        | `docs-archive/compliance-countries/france/cookie-compliance.md`        | `docs-archive/compliance-countries/germany/cookie-compliance.md`        | `docs-archive/compliance-countries/uk/cookie-compliance.md`        |
| **Accessibility**         |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Regulation                | Law 4/2004 (Legge Stanca)                                             | Real Decreto 1112/2018                                                | RGAA 4.1                                                               | BITV 2.0                                                                | Accessibility Regulations 2018                                     |
| Standard                  | WCAG 2.1 AA                                                           | WCAG 2.1 AA                                                           | WCAG 2.1 AA                                                            | WCAG 2.1 AA                                                             | WCAG 2.1 AA                                                        |
| Language Required         | Italian                                                               | Spanish                                                               | French                                                                 | German                                                                  | English                                                            |
| Authority                 | AGID                                                                  | AEPD                                                                  | CNIL/DINUM                                                             | BfDI                                                                    | EHRC/ICO                                                           |
| Statement Required        | Yes                                                                   | Yes                                                                   | Yes                                                                    | Yes                                                                     | Yes                                                                |
| Documentation             | `docs-archive/compliance-countries/italy/accessibility-compliance.md` | `docs-archive/compliance-countries/spain/accessibility-compliance.md` | `docs-archive/compliance-countries/france/accessibility-compliance.md` | `docs-archive/compliance-countries/germany/accessibility-compliance.md` | `docs-archive/compliance-countries/uk/accessibility-compliance.md` |
| **AI Act Compliance**     |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| National Implementation   | L.132/2025                                                            | EU AI Act                                                             | EU AI Act                                                              | EU AI Act                                                               | UK AI Act (pending)                                                |
| Authority                 | AgID                                                                  | AEPD                                                                  | CNIL                                                                   | BfDI                                                                    | ICO                                                                |
| High-Risk Classification  | Yes                                                                   | Yes                                                                   | Yes                                                                    | Yes                                                                     | Yes                                                                |
| Documentation             | `docs/compliance/AI-RISK-CLASSIFICATION.md`                           | `docs/compliance/AI-RISK-CLASSIFICATION.md`                           | `docs/compliance/AI-RISK-CLASSIFICATION.md`                            | `docs/compliance/AI-RISK-CLASSIFICATION.md`                             | `docs/compliance/AI-RISK-CLASSIFICATION.md`                        |
| **Data Protection**       |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Documentation             | `docs-archive/compliance-countries/italy/data-protection.md`          | `docs-archive/compliance-countries/spain/data-protection.md`          | `docs-archive/compliance-countries/france/data-protection.md`          | `docs-archive/compliance-countries/germany/data-protection.md`          | `docs-archive/compliance-countries/uk/data-protection.md`          |
| **Regulatory Contacts**   |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Authority Website         | https://www.garanteprivacy.it                                         | https://www.aepd.es                                                   | https://www.cnil.fr                                                    | https://www.bfdi.bund.de                                                | https://ico.org.uk                                                 |
| Authority Email           | garante@gpdp.it                                                       | info@aepd.es                                                          | contact@cnil.fr                                                        | poststelle@bfdi.bund.de                                                 | casework@ico.org.uk                                                |
| **Implementation Status** |                                                                       |                                                                       |                                                                        |                                                                         |                                                                    |
| Cookie Consent            | ✅ Implemented                                                        | ✅ Implemented                                                        | ✅ Implemented                                                         | ✅ Implemented                                                          | ✅ Implemented                                                     |
| Accessibility Statement   | ✅ Created                                                            | ✅ Created                                                            | ✅ Created                                                             | ✅ Created                                                              | ✅ Created                                                         |
| Data Protection Docs      | ✅ Complete                                                           | ✅ Complete                                                           | ✅ Complete                                                            | ✅ Complete                                                             | ✅ Complete                                                        |
| AI Compliance Docs        | ✅ Complete                                                           | ✅ Complete                                                           | ✅ Complete                                                            | ✅ Complete                                                             | ✅ Complete                                                        |

---

## Requirement Categories

### 1. GDPR/Data Protection

**Common Requirements (All Countries):**

- Privacy Policy (localized)
- Cookie Policy (localized)
- Data Processing Agreement (DPA) with processors
- Data Protection Impact Assessment (DPIA)
- Data Subject Access Request (DSAR) mechanism
- Data breach notification (72 hours)
- Right to deletion
- Right to portability

**Country-Specific Variations:**

- **Age of consent**: Italy/Spain (14), France/Germany (16), UK (13)
- **Response times**: Spain (10 days), others (30 days)
- **Language**: Must be in local language

### 2. Cookie Consent

**Common Requirements (All Countries):**

- Prior explicit consent
- No cookie walls
- Easy withdrawal
- Separate consent per purpose
- Clear information
- Reject All button prominent

**Country-Specific Variations:**

- **Language**: Must be in local language
- **Regulatory framework**: Varies by country
- **Enforcement**: Different authorities

### 3. Accessibility

**Common Requirements (All Countries):**

- WCAG 2.1 Level AA compliance
- Accessibility statement
- Regular monitoring
- User feedback mechanism
- Remediation plan

**Country-Specific Variations:**

- **Language**: Must be in local language
- **Regulatory framework**: Varies by country
- **Authority**: Different enforcement bodies

### 4. AI Act Compliance

**Common Requirements (All Countries):**

- High-risk classification
- Technical documentation
- Risk management system
- Human oversight
- Transparency
- Accuracy and robustness

**Country-Specific Variations:**

- **National implementation**: Italy (L.132/2025), others (EU AI Act)
- **Authority**: Different oversight bodies

---

## Documentation Structure

```
docs/compliance/
├── AI-RISK-CLASSIFICATION.md
├── AI-RISK-MANAGEMENT.md
├── AI-RISK-REGISTER.md
├── DPIA.md
├── GDPR.md
└── COMPLIANCE-MATRIX.md (this file)

docs-archive/compliance-countries/
├── italy/
│   ├── data-protection.md
│   ├── cookie-compliance.md
│   ├── accessibility-compliance.md
│   └── ai-regulatory-contacts.md
├── spain/
│   ├── data-protection.md
│   ├── cookie-compliance.md
│   ├── accessibility-compliance.md
│   └── ai-regulatory-contacts.md
├── france/
│   ├── data-protection.md
│   ├── cookie-compliance.md
│   ├── accessibility-compliance.md
│   └── ai-regulatory-contacts.md
├── germany/
│   ├── data-protection.md
│   ├── cookie-compliance.md
│   ├── accessibility-compliance.md
│   └── ai-regulatory-contacts.md
└── uk/
    ├── data-protection.md
    ├── cookie-compliance.md
    ├── accessibility-compliance.md
    └── ai-regulatory-contacts.md
```

---

## Implementation Checklist

### Cookie Consent

- [x] Geo-based cookie consent variations implemented
- [x] Country-specific configurations (IT, ES, FR, DE, UK)
- [x] Localized text and buttons
- [x] Prominent Reject All buttons
- [x] Regulatory authority links

### Accessibility

- [x] WCAG 2.1 AA compliance verified
- [x] Accessibility statement page created
- [x] Localized for all languages
- [x] Country-specific authority contacts
- [x] 7 DSA profiles documented

### Data Protection

- [x] Country-specific data protection guides
- [x] Age of consent documented
- [x] Parental consent flows verified
- [x] DSAR response times documented

### AI Compliance

- [x] AI Risk Classification documented
- [x] High-risk classification verified
- [x] Regulatory contacts documented

---

## Quick Reference

### Find Documentation by Country

**Italy:**

- Data Protection: `docs-archive/compliance-countries/italy/data-protection.md`
- Cookie Consent: `docs-archive/compliance-countries/italy/cookie-compliance.md`
- Accessibility: `docs-archive/compliance-countries/italy/accessibility-compliance.md`
- Authority: Garante (garante@gpdp.it)

**Spain:**

- Data Protection: `docs-archive/compliance-countries/spain/data-protection.md`
- Cookie Consent: `docs-archive/compliance-countries/spain/cookie-compliance.md`
- Accessibility: `docs-archive/compliance-countries/spain/accessibility-compliance.md`
- Authority: AEPD (info@aepd.es)

**France:**

- Data Protection: `docs-archive/compliance-countries/france/data-protection.md`
- Cookie Consent: `docs-archive/compliance-countries/france/cookie-compliance.md`
- Accessibility: `docs-archive/compliance-countries/france/accessibility-compliance.md`
- Authority: CNIL (contact@cnil.fr)

**Germany:**

- Data Protection: `docs-archive/compliance-countries/germany/data-protection.md`
- Cookie Consent: `docs-archive/compliance-countries/germany/cookie-compliance.md`
- Accessibility: `docs-archive/compliance-countries/germany/accessibility-compliance.md`
- Authority: BfDI (poststelle@bfdi.bund.de)

**UK:**

- Data Protection: `docs-archive/compliance-countries/uk/data-protection.md`
- Cookie Consent: `docs-archive/compliance-countries/uk/cookie-compliance.md`
- Accessibility: `docs-archive/compliance-countries/uk/accessibility-compliance.md`
- Authority: ICO (casework@ico.org.uk)

---

## Compliance Status Summary

| Category                 | Status                | Coverage                                                        |
| ------------------------ | --------------------- | --------------------------------------------------------------- |
| **GDPR/Data Protection** | ✅ Complete           | 5/5 countries                                                   |
| **Cookie Consent**       | ✅ Complete           | 5/5 countries                                                   |
| **Accessibility**        | ✅ Complete           | 5/5 countries                                                   |
| **AI Act Compliance**    | In Progress (Q2 2026) | 5/5 countries                                                   |
| **Regulatory Contacts**  | ✅ Complete           | 5/5 countries                                                   |
| **Documentation**        | In Progress           | DPIA, Model Card, AI Policy complete; AI Act conformity Q2 2026 |

---

**Document Version**: 1.1
**Last Updated**: 2026-02-07
**Status**: Complete
**Next Review**: 2026-04-27 (quarterly)
