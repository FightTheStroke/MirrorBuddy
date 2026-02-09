# Cookie-Konformität nach TTDSG — Deutschland

# Germany Cookie Compliance

> **Sprache / Language**: Dokument in englischer Sprache für den internen Gebrauch erstellt. Eine professionelle Übersetzung ins Deutsche ist vor der Einreichung beim BfDI erforderlich.
> Document written in English for internal use. Professional German translation required before submission to BfDI.

**Zuständigkeit / Jurisdiction**: Bundesrepublik Deutschland (EU-Mitgliedstaat)
**Gesetzgebung / Legislation**: DSGVO + TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz) § 25
**Effective**: TTDSG (01 December 2021)
**Behörde / Enforcing Authority**: BfDI (Bundesbeauftragter für den Datenschutz und die Informationsfreiheit)
**Status / Zustand**: KONFORM / COMPLIANT

---

## 1. Legal Framework

| Document  | Section  | Effective   | Scope                                |
| --------- | -------- | ----------- | ------------------------------------ |
| **GDPR**  | Art. 5,6 | 25 May 2018 | EU-wide data protection              |
| **TTDSG** | § 25     | 01 Dec 2021 | Telecommunications/telemedia privacy |
| **BDSG**  | Various  | 25 May 2018 | German data protection law           |

### TTDSG § 25 - Cookie Consent Requirement

**Key Provision**: "The storage of information in the terminal equipment of an end user or access to information already stored there shall only be permitted if the end user has consented..."

**Exceptions**: Strictly necessary for service provision or communication transmission

### BfDI (Bundesbeauftragter für den Datenschutz)

**Authority**: Federal data protection and freedom of information commissioner

**Contact:**

- Website: https://www.bfdi.bund.de
- Email: poststelle@bfdi.bund.de
- Phone: +49 (0)228 99 7799-0

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [Cookie - MirrorBuddy]

---

## 2. TTDSG § 25 Requirements

### Prior Consent Mandatory

- **Before Storage**: Consent required BEFORE cookies are set
- **Exceptions**: Only for strictly necessary cookies (session, auth, security)
- **Granular**: User must be able to consent per category
- **Withdrawal**: As easy to withdraw as to give consent

### Consent Characteristics (GDPR Article 4(11) + TTDSG § 25)

1. **Freely given**: No detriment for refusal
2. **Specific**: Per purpose/category
3. **Informed**: Clear explanation of what/why
4. **Unambiguous**: Active opt-in (no pre-ticked boxes)

### Cookie Categories

**Essential (No Consent Required)**:

- Session cookies
- Authentication cookies
- Security cookies (CSRF)
- Load-balancing cookies

**Non-Essential (Consent Required)**:

- Analytics cookies
- Marketing/advertising cookies
- Third-party tracking cookies
- Social media plugins

---

## 3. MirrorBuddy Cookie Implementation

### Cookies Used

| Cookie Name            | Type      | Purpose                   | Consent Required | Duration  |
| ---------------------- | --------- | ------------------------- | ---------------- | --------- |
| mirrorbuddy-user-id    | Essential | Authentication            | No               | Session   |
| mirrorbuddy-visitor-id | Essential | Trial user tracking       | No               | 30 days   |
| mirrorbuddy-consent    | Essential | Store consent preferences | No               | 13 months |
| mirrorbuddy-locale     | Essential | Language preference       | No               | 1 year    |
| csrf-token             | Essential | Security                  | No               | Session   |

**Note**: MirrorBuddy currently uses NO analytics or marketing cookies. If added, consent will be required.

### Consent Banner (German Language)

**Location**: All pages on first visit
**Language**: German (with locale switcher)
**Content**:

- Clear explanation (TTDSG compliance)
- Link to full Cookie Policy
- "Alle akzeptieren" (Accept All) button
- "Alle ablehnen" (Reject All) button
- "Anpassen" (Customize) button

**Implementation**: `src/components/CookieConsentBanner.tsx`

---

## 4. Compliance Checklist

### Pre-Launch

- [x] Cookie banner (German)
- [x] Prior consent (no cookies before consent)
- [x] Granular consent
- [x] Easy withdrawal (`/account/cookies`)
- [x] Cookie Policy (German + English)
- [x] Only essential without consent
- [x] 13-month consent validity (BfDI standard)
- [x] No tracking before consent

### Ongoing

- [ ] Annual Cookie Policy review
- [ ] Monitor new cookie additions
- [ ] Consent log retention
- [ ] Update banner if categories change

---

## 5. Consent Management

### Consent Storage

- **Where**: `localStorage` key `mirrorbuddy-consent`
- **What**: JSON object with preferences
- **Duration**: 13 months (BfDI standard)
- **Re-prompt**: After 13 months or policy changes

### Consent Withdrawal

- **Method**: `/account/cookies` page or banner link
- **Effect**: Immediate cookie deletion
- **Re-prompt**: Banner shown after withdrawal

---

## 6. Cookie Policy

**Location**: `/cookies` page (German + English)

**Required Content** (TTDSG § 25):

- List of all cookies (name, purpose, duration, third party)
- Cookie categories with consent requirements
- How to manage/delete cookies
- How to withdraw consent
- Link to Privacy Policy
- Contact: roberdan@fightthestroke.org

**Status**: ✅ Published

---

## 7. Enforcement

### BfDI Powers

- Audit cookie compliance
- Issue warnings
- Fine violations
- Order cessation of non-compliant practices

### Penalties (TTDSG § 28 + GDPR)

| Violation              | Fine Range       |
| ---------------------- | ---------------- |
| Missing consent banner | €1,000-€10,000   |
| Cookies before consent | €5,000-€50,000   |
| No granular consent    | €5,000-€50,000   |
| Misleading information | €10,000-€100,000 |
| Repeated violations    | Up to 4% revenue |

---

## 8. Best Practices (BfDI Guidance)

1. **No Pre-Ticked Boxes**: Active consent required
2. **Scroll Not Consent**: User must click Accept
3. **Plain German**: Avoid technical jargon
4. **Equal Buttons**: Reject as prominent as Accept
5. **Cookie Wall Discouraged**: Access shouldn't require consent for non-essential
6. **Third-Party Notice**: Indicate external cookies
7. **Consent Log**: Keep records for accountability

---

## 9. Resources

| Resource              | URL                                                         |
| --------------------- | ----------------------------------------------------------- |
| **BfDI Homepage**     | https://www.bfdi.bund.de                                    |
| **TTDSG Full Text**   | https://www.gesetze-im-internet.de/ttdsg/                   |
| **TTDSG Guidance**    | https://www.bfdi.bund.de/DE/TTDSG/ttdsg_node.html           |
| **Cookie Guidelines** | https://www.bfdi.bund.de/DE/Service/FAQ/ttdsg-faq_node.html |

---

## 10. Contact Information

**For cookie compliance inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Cookie - MirrorBuddy]
- Response: 5 business days

**BfDI:**

- Website: https://www.bfdi.bund.de
- Email: poststelle@bfdi.bund.de
- Phone: +49 (0)228 99 7799-0

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 February 2027
**Owner**: Fightthestroke Foundation | **Reference**: GDPR, TTDSG § 25, BfDI Guidelines
