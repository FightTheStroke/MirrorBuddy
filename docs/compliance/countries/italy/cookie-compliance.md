# Italy Cookie Compliance

**Jurisdiction**: Italian Republic (EU Member State)
**Legislation**: GDPR + Italian Privacy Code (D.Lgs. 196/2003) + Garante Provvedimento 229/2021
**Effective**: Provvedimento 229/2021 (10 June 2021)
**Enforcing Authority**: Garante per la protezione dei dati personali
**Status**: COMPLIANT

---

## 1. Legal Framework

| Document                   | Section      | Effective    | Scope                       |
| -------------------------- | ------------ | ------------ | --------------------------- |
| **GDPR**                   | Art. 5, 6    | 25 May 2018  | EU-wide data protection     |
| **Italian Privacy Code**   | As amended   | 19 Sep 2018  | National data protection    |
| **Provvedimento 229/2021** | All sections | 10 June 2021 | Cookie consent requirements |
| **ePrivacy Directive**     | Art. 5(3)    | 25 May 2011  | Electronic communications   |

### Garante per la protezione dei dati personali

**Authority**: Italian data protection authority
**Cookie Guidelines**: Provvedimento 229/2021 (official cookie guidance)

**Contact:**

- Website: https://www.gpdp.it
- Email: garante@gpdp.it
- Phone: +39 06 69677 1

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [Cookie - MirrorBuddy]

---

## 2. Provvedimento 229/2021 Requirements

### Key Requirements

1. **Prior Consent**: Explicit consent required before dropping non-essential cookies
2. **Clear Information**: Cookie banner must explain purposes, categories, third parties
3. **Granular Consent**: Users must be able to consent per category
4. **Easy Withdrawal**: Opt-out as easy as opt-in
5. **Consent Validity**: 6 months maximum (Garante recommendation)
6. **Cookie Policy**: Detailed policy linked from banner

### Cookie Categories

**Essential (No Consent Required)**:

- Session cookies
- Authentication cookies
- Security cookies
- Load-balancing cookies

**Non-Essential (Consent Required)**:

- Analytics cookies
- Marketing/advertising cookies
- Third-party tracking cookies
- Social media cookies

---

## 3. MirrorBuddy Cookie Implementation

### Cookies Used

| Cookie Name            | Type      | Purpose                   | Consent Required | Duration |
| ---------------------- | --------- | ------------------------- | ---------------- | -------- |
| mirrorbuddy-user-id    | Essential | Authentication            | No               | Session  |
| mirrorbuddy-visitor-id | Essential | Trial user tracking       | No               | 30 days  |
| mirrorbuddy-consent    | Essential | Store consent preferences | No               | 6 months |
| mirrorbuddy-locale     | Essential | Language preference       | No               | 1 year   |
| csrf-token             | Essential | Security                  | No               | Session  |

**Note**: MirrorBuddy currently uses NO analytics or marketing cookies. If added in future, consent will be required.

### Consent Banner (Italian Language)

**Location**: All pages on first visit
**Language**: Italian (with option to switch locale)
**Content**:

- Clear explanation of cookie use
- Link to full Cookie Policy
- "Accept All" button
- "Reject All" button (for non-essential only)
- "Customize" button (granular consent)

**Implementation**: See `src/components/CookieConsentBanner.tsx`

---

## 4. Compliance Checklist

### Pre-Launch

- [x] Cookie banner implemented (Italian)
- [x] Prior consent mechanism (no cookies before consent)
- [x] Granular consent options
- [x] Easy withdrawal mechanism (`/account/cookies`)
- [x] Cookie Policy published (Italian + English)
- [x] Only essential cookies without consent
- [x] 6-month consent validity
- [x] No tracking before consent

### Ongoing

- [ ] Annual Cookie Policy review
- [ ] Monitor for new cookie additions
- [ ] Consent log retention (proof of consent)
- [ ] Update banner if new cookie categories added

---

## 5. Consent Management

### Consent Storage

- **Where**: `localStorage` key `mirrorbuddy-consent`
- **What**: JSON object with consent preferences
- **Duration**: 6 months (Garante recommendation)
- **Re-prompt**: After 6 months or if cookie categories change

### Consent Withdrawal

- **Method**: `/account/cookies` page or banner footer link
- **Effect**: Immediate - all non-essential cookies deleted
- **Re-prompt**: Banner shown again after withdrawal

---

## 6. Cookie Policy

**Location**: `/cookies` page (Italian + English)

**Required Content** (Provvedimento 229/2021):

- List of all cookies (name, purpose, duration, third party)
- Cookie categories with consent requirements
- How to manage/delete cookies
- How to withdraw consent
- Link to Privacy Policy
- Contact for inquiries: roberdan@fightthestroke.org

**Status**: ✅ Published

---

## 7. Enforcement

### Garante Powers

- Audit website cookie compliance
- Issue warnings for violations
- Fine non-compliant organizations
- Order immediate cessation of non-compliant practices

### Penalties (Provvedimento 229/2021 + GDPR)

| Violation                         | Fine Range       |
| --------------------------------- | ---------------- |
| Missing consent banner            | €1,000-€10,000   |
| Cookies before consent            | €5,000-€20,000   |
| No granular consent               | €5,000-€20,000   |
| Misleading/incomplete information | €5,000-€50,000   |
| Repeated violations               | Up to 4% revenue |

---

## 8. Best Practices (Garante Guidance)

1. **No Pre-Ticked Boxes**: Consent must be active, not passive
2. **Scroll/Continue Not Consent**: User must explicitly click Accept
3. **Plain Language**: Avoid technical jargon in banner
4. **Visual Hierarchy**: Reject button as prominent as Accept
5. **Cookie Wall Discouraged**: Access should not be conditional on consent (essential services excepted)
6. **Third-Party Notice**: Clearly indicate which cookies are from third parties
7. **Consent Log**: Keep record of consent for accountability

---

## 9. Resources

| Resource                   | URL                                                                               |
| -------------------------- | --------------------------------------------------------------------------------- |
| **Garante Homepage**       | https://www.gpdp.it                                                               |
| **Provvedimento 229/2021** | https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9677876         |
| **Cookie Guidelines**      | https://www.gpdp.it/temi/cookie                                                   |
| **Sample Cookie Banner**   | https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 (Annex) |

---

## 10. Contact Information

**For cookie compliance inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Cookie - MirrorBuddy]
- Response: 5 business days

**Garante per la protezione dei dati personali:**

- Website: https://www.gpdp.it
- Email: garante@gpdp.it
- Phone: +39 06 69677 1

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 August 2026 (6 months)
**Owner**: Fightthestroke Foundation | **Reference**: GDPR, Provvedimento 229/2021, Garante Guidelines
