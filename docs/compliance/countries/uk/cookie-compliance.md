# UK Cookie Compliance

**Jurisdiction**: United Kingdom (England, Scotland, Wales, Northern Ireland)
**Legislation**: UK GDPR + PECR 2003 (Privacy and Electronic Communications Regulations)
**Effective**: PECR (11 December 2003, amended 26 May 2011)
**Enforcing Authority**: ICO (Information Commissioner's Office)
**Status**: COMPLIANT

---

## 1. Legal Framework

| Document                | Section   | Effective   | Scope                       |
| ----------------------- | --------- | ----------- | --------------------------- |
| **UK GDPR**             | Art. 5, 6 | 01 Jan 2021 | UK data protection          |
| **PECR 2003**           | Reg. 6    | 11 Dec 2003 | e-Privacy/cookies           |
| **PECR Amendment 2011** | Reg. 6    | 26 May 2011 | Cookie consent requirements |

### PECR Regulation 6 - Cookie Consent Requirement

**Key Provision**: "A person shall not store or gain access to information stored in the terminal equipment of a subscriber or user unless... (a) the subscriber or user is provided with clear and comprehensive information... and (b) the subscriber or user has given their consent."

**Exceptions**: Cookies "strictly necessary" for service provision

### ICO (Information Commissioner's Office)

**Authority**: UK data protection and privacy regulator

**Contact:**

- Website: https://ico.org.uk
- Email: casework@ico.org.uk
- Phone: +44 303 123 1113

**MirrorBuddy contact**: roberdan@fightthestroke.org | Subject: [Cookies - MirrorBuddy]

---

## 2. PECR Regulation 6 Requirements

### Prior Consent Mandatory

- **Before Storage**: Consent required BEFORE non-essential cookies are set
- **Exceptions**: Only for strictly necessary cookies
- **Clear Information**: Users must understand what cookies do
- **Withdrawal**: As easy to withdraw as to give consent

### Consent Characteristics (UK GDPR + PECR)

1. **Freely given**: No detriment for refusal
2. **Specific**: Per purpose/category
3. **Informed**: Clear explanation
4. **Unambiguous**: Active opt-in (no implied consent)

### Cookie Categories

**Strictly Necessary (No Consent Required)**:

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
| mirrorbuddy-consent    | Essential | Store consent preferences | No               | 12 months |
| mirrorbuddy-locale     | Essential | Language preference       | No               | 1 year    |
| csrf-token             | Essential | Security                  | No               | Session   |

**Note**: MirrorBuddy currently uses NO analytics or marketing cookies. If added, consent will be required.

### Consent Banner (English Language)

**Location**: All pages on first visit
**Language**: English
**Content**:

- Clear explanation (PECR compliant)
- Link to full Cookie Policy
- "Accept All" button
- "Reject All" button
- "Customize" button

**Implementation**: `src/components/CookieConsentBanner.tsx`

---

## 4. Compliance Checklist

### Pre-Launch

- [x] Cookie banner (English)
- [x] Prior consent (no cookies before consent)
- [x] Granular consent options
- [x] Easy withdrawal (`/account/cookies`)
- [x] Cookie Policy published
- [x] Only essential without consent
- [x] 12-month consent validity (ICO standard)
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
- **Duration**: 12 months (ICO standard)
- **Re-prompt**: After 12 months or policy changes

### Consent Withdrawal

- **Method**: `/account/cookies` page or banner link
- **Effect**: Immediate cookie deletion
- **Re-prompt**: Banner shown after withdrawal

---

## 6. Cookie Policy

**Location**: `/cookies` page

**Required Content** (ICO Guidance):

- List of all cookies (name, purpose, duration, third party)
- Cookie categories with consent requirements
- How to manage/delete cookies
- How to withdraw consent
- Link to Privacy Policy
- Contact: roberdan@fightthestroke.org

**Status**: ✅ Published

---

## 7. Enforcement

### ICO Powers

- Audit cookie compliance
- Issue warnings
- Fine violations (up to £500,000 for PECR breaches)
- Order cessation of non-compliant practices

### Penalties (PECR Reg. 6 + UK GDPR)

| Violation                   | Fine Range       |
| --------------------------- | ---------------- |
| Missing consent banner      | £1,000-£10,000   |
| Cookies before consent      | £5,000-£50,000   |
| No granular consent         | £5,000-£50,000   |
| Misleading information      | £10,000-£100,000 |
| Serious/repeated violations | Up to £500,000   |

**Note**: ICO can also issue enforcement notices and undertakings

---

## 8. Best Practices (ICO Guidance)

1. **No Pre-Ticked Boxes**: Active consent required
2. **Scroll Not Consent**: User must explicitly accept
3. **Plain English**: Avoid technical jargon
4. **Equal Buttons**: Reject as prominent as Accept
5. **Cookie Wall Discouraged**: Access shouldn't require consent for non-essential
6. **Third-Party Notice**: Clearly indicate external cookies
7. **Consent Log**: Keep records for accountability

### ICO Cookie Guidance Key Points

- "Clear and comprehensive information" means users understand what data is collected and why
- Implied consent (scrolling, continued browsing) is NOT sufficient
- "Reject All" option should be as easy to use as "Accept All"
- Users must be able to consent to some but not all cookies

---

## 9. Resources

| Resource             | URL                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **ICO Homepage**     | https://ico.org.uk                                                                                                                              |
| **PECR Guidance**    | https://ico.org.uk/for-organisations/pecr/                                                                                                      |
| **Cookie Guidance**  | https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/ |
| **Consent Guidance** | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/                                                       |

---

## 10. Contact Information

**For cookie compliance inquiries:**

- Email: roberdan@fightthestroke.org
- Subject: [Cookies - MirrorBuddy]
- Response: 5 business days

**ICO:**

- Website: https://ico.org.uk
- Email: casework@ico.org.uk
- Phone: +44 303 123 1113
- Report concerns: https://ico.org.uk/make-a-complaint/

---

**Version**: 1.0 | **Updated**: 09 February 2026 | **Review**: 09 February 2027
**Owner**: Fightthestroke Foundation | **Reference**: UK GDPR, PECR 2003, ICO Guidance
