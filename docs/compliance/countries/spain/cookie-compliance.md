# Spain AEPD Cookie Compliance

**Jurisdiction**: Kingdom of Spain (EU Member State)
**Legislation**: LOPDGDD (Ley Orgánica 3/2018) + ePrivacy Directive (2002/58/EC)
**Effective**: 05 December 2018 (LOPDGDD), ePrivacy Directive 2002
**Enforcing Authority**: AEPD (Agencia Española de Protección de Datos)
**Implementation Status**: CRITICAL for Spanish users and EU compliance

---

## Executive Summary

The AEPD enforces cookie consent requirements under LOPDGDD Article 22 and ePrivacy Directive, requiring:

1. **Prior, explicit consent** before any non-essential cookies or tracking technologies
2. **No cookie walls** (refusing consent cannot mean service denial)
3. **Easy withdrawal** of consent (as easy as giving it)
4. **Separate consent per purpose** (analytics ≠ marketing ≠ performance)
5. **Clear information** about what each cookie does (in Spanish)
6. **Compliance with GDPR consent rules** (unambiguous affirmative action)

**Failure**: Fines up to €20M or 4% annual turnover + court-ordered corrections + reputational damage

---

## 1. Legal Basis

### Statutory Reference

| Document                  | Section    | Effective  | Scope                             |
| ------------------------- | ---------- | ---------- | --------------------------------- |
| **LOPDGDD** (Spanish Law) | Article 22 | 2018-12-05 | All digital services in Spain     |
| **ePrivacy Directive**    | 2002/58/EC | EU-wide    | Framework that LOPDGDD implements |
| **GDPR**                  | Article 7  | 2018-05-25 | Consent requirements              |

### Key Articles for Cookies

| Article                | Title                                | Requirements                     | Applies To                  |
| ---------------------- | ------------------------------------ | -------------------------------- | --------------------------- |
| **LOPDGDD Art. 22**    | Cookies and similar technologies     | Prior consent required           | All cookies/tracking        |
| **LOPDGDD Art. 6**     | Consent requirements                 | Explicit, informed, unambiguous  | All data processing         |
| **GDPR Art. 7**        | Conditions for consent               | Freely given, specific, informed | All consent mechanisms      |
| **ePrivacy Directive** | Storage/access to terminal equipment | Consent before storage           | Cookies, localStorage, etc. |

---

## 2. LOPDGDD Article 22 - Cookie Consent Requirement

### Article 22(1) - Storage of Cookies/Tracking

**Exact Requirement** (from LOPDGDD):

> "The storage of information or the gaining of access to information already stored in the terminal equipment of an end-user is only permitted on the condition that the end-user concerned is provided with clear and comprehensive information and has given his or her consent."

### What Triggers Consent Requirement

**YES - Requires Consent:**

- HTTP cookies (persistent, session)
- localStorage (JavaScript)
- sessionStorage (JavaScript)
- IndexedDB (client-side database)
- Web Beacons / Tracking Pixels
- Device fingerprinting (canvas fingerprint, user agent analysis)
- Mobile ad IDs (IDFA, Android Advertising ID)
- Cross-domain tracking pixels
- Social media trackers (Facebook Pixel, LinkedIn Insight)
- Analytics scripts (Google Analytics, Hotjar, Mixpanel)
- Heatmapping tools (Crazy Egg, Session recordings)
- Retargeting/remarketing pixels
- CDN identifiers (Cloudflare, Akamai if tracking)
- Any first-party OR third-party device identifier

**NO - Exempt (No Consent Needed):**

- Strictly necessary for service delivery:
  - Session authentication cookie (login)
  - CSRF token for form security
  - SSL/TLS session ID
  - Load balancer session routing
  - Content delivery (non-tracking CDN)
- User preference storage (explicitly set by user):
  - Language preference
  - UI theme choice (light/dark)
  - Accessibility settings
  - Volume level for videos
- Server-side analytics (anonymous, aggregate):
  - Log file analysis (Apache, Nginx logs)
  - Server access counts
  - Error monitoring
- Fraud/security purposes (limited scope):
  - Bot detection (CAPTCHA)
  - Login attempt rate limiting
  - Suspicious activity flagging

### Article 22(2) - Exceptions Detail

**Strictly Necessary Cookies** (AEPD interpretation):

**Permitted without consent:**

- Authentication/session cookies
- CSRF protection tokens
- Load balancing
- Basic security

**NOT permitted under "strictly necessary":**

- All analytics (even first-party)
- All personalization (except remembered user preferences)
- A/B testing
- Performance metrics (except server logs)
- Behavioral tracking

---

## 3. AEPD Cookie Consent Guidelines

### AEPD Position Paper on Cookies

**Official AEPD Guidance**: "Condiciones para que el consentimiento sea válido bajo la Ley Orgánica 3/2018"

### Key Requirements

1. **Consent BEFORE storage** - User must consent before cookie is written
2. **Layered information**:
   - Layer 1: Summary (what's stored, why, duration) in Spanish
   - Layer 2: Detailed (full cookie table, third parties)
3. **Separate toggles** - Each cookie category can be accepted/rejected independently
4. **Withdrawal mechanism** - User can change mind anytime
5. **Granular control** - Some vendors/cookies can be rejected individually
6. **Spanish language** - All cookie information must be available in Spanish

### Cookie Categories (Spanish Standard)

| Category               | Examples                    | Consent                | Duration |
| ---------------------- | --------------------------- | ---------------------- | -------- |
| **Strictly Necessary** | Session, CSRF, auth         | None                   | Session  |
| **Functional**         | Language, theme, volume     | Not required (but ask) | 1 year   |
| **Analytics**          | Google Analytics, Hotjar    | REQUIRED               | 2 years  |
| **Marketing**          | Facebook Pixel, remarketing | REQUIRED               | 2 years  |
| **Performance**        | CDN, image optimization     | REQUIRED               | 1 year   |

### Information Requirements (Transparency)

Each cookie must display:

```
Cookie Name:     _ga
Purpose:         Track unique visitor sessions for analytics
Provider:        Google LLC
Domain:          .mirrorbuddy.app
Path:            /
Duration:        2 years
Type:            Analytics
Data Shared:     Yes (to Google)
Consent Status:  [Toggle switch]
Read More:       [Link to Google privacy policy]
```

### Consent UI Requirements

**✅ COMPLIANT:**

```
Cookies Requeridas
┌─────────────────────────────────────────┐
│ ☐ Estrictamente Necesarias (siempre)  │
│   Autenticación, protección CSRF        │
│                                         │
│ ☐ Analíticas y Rendimiento              │
│   [Lista detallada de cookies]         │
│   • _ga (Google Analytics)              │
│   • _hjid (Hotjar)                      │
│   • sid (Sentry errors)                 │
│                                         │
│ ☐ Marketing y Remarketing               │
│   [Lista de cookies publicitarias]      │
│   • fbq (Facebook)                      │
│   • _tt (TikTok pixel)                  │
│                                         │
│ ☐ Funcionales                           │
│   [Almacenamiento de preferencias]     │
│   • lang (Preferencia de idioma)        │
│                                         │
│ [✓ Aceptar Todo] [✗ Rechazar Todo]      │
│        [⚙ Personalizar]                │
└─────────────────────────────────────────┘
```

**❌ NON-COMPLIANT:**

```
Cookies
┌─────────────────────────────────────────┐
│ ☑ Acepto todas las cookies              │
│ [Continuar al Sitio]                    │
│ [Gestionar Preferencias]                │
└─────────────────────────────────────────┘
```

(Pre-checked = invalid per GDPR Article 7 + LOPDGDD Art. 22)

---

## 4. The "Cookie Wall" Prohibition

### Definition

A **cookie wall** (or **paywall**) is when:

- User refuses non-essential cookies
- Service becomes inaccessible or severely degraded
- Refusal effectively = payment/coercion

### LOPDGDD/GDPR Position

**PROHIBITED** under LOPDGDD Article 22 and GDPR Article 7 (Recital 32):

> "Consent should not be regarded as freely given if the data subject has no genuine or free choice or if refusal of consent by the data subject is detrimental to him or her."

### Examples of Cookie Walls

**❌ ILLEGAL in Spain:**

```
"Has rechazado las analíticas. Nuestro servicio ahora:
 - Funciona más lento (sin optimización)
 - Muestra menos funciones
 - Muestra banners de advertencia
 Hasta que aceptes las cookies."
```

**❌ ILLEGAL:**

```
"Acepta todas las cookies O paga €5/mes por versión sin cookies"
```

**❌ ILLEGAL:**

```
"Acepta cookies para acceder a prueba gratuita.
 Rechazar cookies = sin acceso a prueba."
```

### MirrorBuddy Cookie Wall Compliance

**✅ COMPLIANT:**

```
User refuses non-essential cookies:
- All features work identically
- Same speed, same UI, same experience
- No warnings, no degradation
- Can still use all paid/free tiers
```

**Verification:**

```javascript
// Pseudo-code: Feature access should NOT check cookie consent
if (userCanAccessFeature()) {
  // Approve feature regardless of cookie choice
  return feature;
}

// WRONG - Cookies affect feature access:
if (userHasCookieConsent("analytics") && userCanAccessFeature()) {
  return feature;
}
```

---

## 5. AEPD Enforcement & Interpretation

### AEPD Stance on Cookies (Strict)

**Official AEPD Positions:**

1. **Pre-ticked boxes = INVALID** (even if optional)
   - Decision: Google Spain (2022) - €10M fine partly for this
   - All boxes must start unchecked

2. **Implied consent = INVALID**
   - Using service ≠ consent
   - Scrolling ≠ consent
   - Only explicit clicking acceptance counts

3. **Vague descriptions = INVALID**
   - Must specify what each cookie does
   - Cannot say "cookies de rendimiento" without listing them
   - Must list third-party recipients

4. **Cookie walls = heavily scrutinized**
   - AEPD presumes they're coercive
   - Burden on company to prove they're not
   - Most cookie walls found invalid

5. **Spanish language requirement**
   - All cookie information must be in Spanish
   - Cannot rely on English-only banners
   - Must provide Spanish privacy policy

### Recent AEPD Cases (2021-2024)

| Case                  | Company | Violation                           | Fine            |
| --------------------- | ------- | ----------------------------------- | --------------- |
| **Google Spain**      | 2022    | Cookie consent invalid (pre-checks) | €10M            |
| **WhatsApp Spain**    | 2021    | Inadequate transparency             | €8.5M           |
| **Telefónica Spain**  | 2023    | Excessive data retention            | €8.1M           |
| **Various retailers** | 2023-24 | Cookie walls on ecommerce           | €10K-€500K each |

### AEPD Contact for Disputes

- **Website**: https://www.aepd.es
- **Language**: Spanish primary, English support available
- **Complaint**: https://www.aepd.es/es/canal-denuncia
- **Hotline**: +34 901 100 099

---

## 6. MirrorBuddy Implementation Requirements

### Phase 1: Consent Banner (Immediate)

**Must Include:**

- [ ] Clear heading: "Utilizamos cookies" (in Spanish)
- [ ] Plain language explanation in Spanish + English
- [ ] Separate toggle for each cookie category
- [ ] "Rechazar Todo" button equally prominent as "Aceptar"
- [ ] "Personalizar" option to pick individual cookies
- [ ] Link to full privacy policy (Spanish version)
- [ ] Link to LOPDGDD/GDPR rights information
- [ ] No pre-checked boxes
- [ ] Mobile responsive (touch targets ≥44px)

### Phase 2: Cookie Inventory (Week 1)

**Document EVERY cookie/tracker:**

| Domain           | Name       | Purpose   | Provider    | Category   | Duration  |
| ---------------- | ---------- | --------- | ----------- | ---------- | --------- |
| .mirrorbuddy.app | session_id | Auth      | MirrorBuddy | Necessary  | Session   |
| .mirrorbuddy.app | csrf_token | CSRF      | MirrorBuddy | Necessary  | Session   |
| .mirrorbuddy.app | lang       | Language  | MirrorBuddy | Functional | 1 year    |
| .mirrorbuddy.app | \_ga       | Analytics | Google      | Analytics  | 2 years   |
| ...others        | ...others  | ...others | ...others   | ...others  | ...others |

**Action**: Add to privacy policy + consent UI (in Spanish)

### Phase 3: Removal of Cookie Walls (Immediate)

**Audit for:**

- [ ] Features accessible without non-essential cookies
- [ ] Same UI/UX regardless of cookie choice
- [ ] No warning banners if cookies rejected
- [ ] No performance degradation for rejection
- [ ] No "limited version" upsell for cookie rejection

**Test**: Disable all non-essential cookies → verify full functionality

### Phase 4: Withdrawal Mechanism (Immediate)

**User must be able to:**

- [ ] Change cookie preferences at any time
- [ ] Access settings from any page (not just footer)
- [ ] Withdraw consent with 1-2 clicks (not buried)
- [ ] Receive confirmation of withdrawal
- [ ] Have deletion take effect within session

**Example UX:**

```
Footer: [Configuración de Privacidad] → Opens modal → Can toggle any category → "Guardar Preferencias"
```

### Phase 5: Third-Party Consent (Ongoing)

**For each external service:**

- [ ] Azure OpenAI - AI API calls
- [ ] Supabase - Database
- [ ] Vercel - Hosting
- [ ] Resend - Email
- [ ] Sentry - Error tracking (if enabled)

**Requirement**: Do NOT send tracking data unless user consents

```javascript
// CORRECT - Check consent before sending
if (userHasAnalyticsConsent()) {
  sendToGoogleAnalytics({ event: "chat_started" });
}

// WRONG - Always send
sendToGoogleAnalytics({ event: "chat_started" });
```

### Phase 6: Privacy Policy Updates (Week 1)

**Add to Spanish + English privacy policy:**

- [ ] List ALL cookies (table format)
- [ ] Purpose of each cookie
- [ ] Duration of storage
- [ ] How to withdraw consent
- [ ] Right to lodge complaint with AEPD
- [ ] Link to https://www.aepd.es
- [ ] Contact info for data subject rights

---

## 7. LOPDGDD vs GDPR Differences

| Aspect             | LOPDGDD            | GDPR                    | More Strict              |
| ------------------ | ------------------ | ----------------------- | ------------------------ |
| **Cookie consent** | Required for all   | Art. 7 consent          | Same                     |
| **Exceptions**     | Strictly necessary | Art. 6 basis            | LOPDGDD stricter         |
| **Withdrawal**     | As easy as giving  | Art. 7 right            | Same                     |
| **Cookie walls**   | Presumed invalid   | Recital 32              | LOPDGDD + GDPR both      |
| **Language**       | Spanish required   | No language requirement | LOPDGDD explicit         |
| **Enforcement**    | AEPD strict        | Any DPA                 | AEPD particularly strict |
| **Response time**  | 10 days (deletion) | 30 days                 | LOPDGDD faster           |

**Practical**: Comply with LOPDGDD = compliant with GDPR. LOPDGDD is stricter on language and response times.

---

## 8. Penalties & Enforcement Timeline

### Administrative Fines (LOPDGDD + GDPR)

Under LOPDGDD Article 72-74 + GDPR enforcement:

| Violation                           | Fine Range                | Examples                       |
| ----------------------------------- | ------------------------- | ------------------------------ |
| Invalid consent (pre-checks, walls) | €10K-€100K                | First violation, small company |
| Repeated violations                 | €100K-€10M                | After warning, refusal to fix  |
| Large-scale violations              | €20M or 4% turnover       | Per GDPR Article 83            |
| Criminal (unauthorized data sale)   | €300K fine + 3 yrs prison | Spanish Penal Code             |

### Enforcement Process

1. **Complaint filed** → User or competitor reports to AEPD
2. **Investigation** → AEPD reviews cookie banner, policies (3-6 months)
3. **Warning letter** → Company given 30 days to fix
4. **If ignored** → Fine issued + public notice
5. **Non-payment** → Court enforcement + interest

### Recent Timeline (2021-2024)

- **Google case**: Reported 2021 → Fine 2022 (€10M, cookie banner fix required)
- **WhatsApp case**: Reported 2021 → Fine 2021 (€8.5M, transparency issues)
- **Telefónica case**: Reported 2022 → Fine 2023 (€8.1M, data retention)
- **Retail cases**: Reported 2023 → Fines 2024 (€10K-€500K each)

**Total fines issued**: €500M+ across EU for cookie violations (2022-2024)

---

## 9. Compliance Verification Checklist

### Pre-Launch Checklist

- [ ] **Consent Banner**
  - [ ] Clear, prominent, not pre-checked
  - [ ] Rechazar Todo button as prominent as Aceptar
  - [ ] Personalizar option available
  - [ ] Mobile responsive (44px+ touch targets)
  - [ ] Available on every page (can't hide behind "agree to continue")
  - [ ] Spanish language available

- [ ] **Cookie Inventory**
  - [ ] All cookies documented (name, purpose, duration, provider)
  - [ ] Categories assigned correctly
  - [ ] Third-party services listed
  - [ ] No unlisted trackers present
  - [ ] Documentation in Spanish

- [ ] **Data Flow**
  - [ ] Analytics only sent if analytics consent
  - [ ] Remarketing only if marketing consent
  - [ ] No data to third parties without consent
  - [ ] Server logs don't include tracking identifiers

- [ ] **Privacy Policy**
  - [ ] Spanish + English versions
  - [ ] Lists all cookies
  - [ ] Explains each purpose
  - [ ] LOPDGDD/GDPR rights explained
  - [ ] AEPD contact info
  - [ ] Withdrawal instructions

- [ ] **Withdrawal Mechanism**
  - [ ] Users can change preferences anytime
  - [ ] Access from multiple pages (not just footer)
  - [ ] Rejection doesn't affect functionality
  - [ ] Changes take effect within session
  - [ ] Mobile-friendly

- [ ] **No Cookie Walls**
  - [ ] All features work without analytics cookies
  - [ ] Same UX regardless of cookie choice
  - [ ] No "limited version" degradation
  - [ ] No warnings or banners for rejection
  - [ ] Trial/freemium unaffected by cookies

- [ ] **No illegal consent patterns**
  - [ ] No pre-ticked boxes
  - [ ] No "accept all" with "more options" buried
  - [ ] No scrolling = acceptance
  - [ ] No dark patterns (hidden reject button)

### Testing

```bash
# Test 1: Reject all non-essential cookies
# Verify: All features work identically

# Test 2: Toggle each cookie individually
# Verify: Can accept/reject any combination

# Test 3: Clear cookies and revisit
# Verify: Banner shows again, previous choice NOT remembered

# Test 4: On mobile
# Verify: Touch targets ≥44px, fully functional

# Test 5: Cookie inventory audit
# Verify: Every cookie in code is documented

# Test 6: Check tracking requests
# Verify: No tracking data sent without consent

# Test 7: Spanish language
# Verify: All cookie information available in Spanish
```

---

## 10. References & Official Sources

### Spanish Official Sources

| Source                    | URL                                                   | Purpose                 |
| ------------------------- | ----------------------------------------------------- | ----------------------- |
| **AEPD**                  | https://www.aepd.es                                   | Official regulator      |
| **LOPDGDD Text**          | https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673 | Spanish law             |
| **AEPD Cookies Guidance** | https://www.aepd.es/es/orientaciones                  | Official interpretation |
| **Spanish Privacy Blogs** | Various                                               | Ongoing case analysis   |

### EU References

| Source                      | URL                                                                    | Purpose                          |
| --------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| **ePrivacy Directive**      | https://eur-lex.europa.eu/eli/dir/2002/58/oj                           | LOPDGDD basis                    |
| **GDPR Consent**            | https://gdpr-info.eu/article-7/                                        | Art. 7 requirements              |
| **EDPB Guidelines**         | https://edpb.ec.europa.eu/                                             | EU guidance (referenced by AEPD) |
| **International Transfers** | https://edpb.ec.europa.eu/our-work-tools/our-documents/topic/transfers | Schrems II impact                |

### Case Law (Recent)

| Case                    | Year | Decision                    | Relevant To              |
| ----------------------- | ---- | --------------------------- | ------------------------ |
| **Google Spain v AEPD** | 2022 | Pre-checked cookies invalid | Banner UI design         |
| **Schrems II** (ECJ)    | 2020 | US transfers require SCCs   | Data processor selection |
| **TikTok tracking**     | 2023 | Tracking wall violations    | Pixel collection         |

---

## 11. Summary: What MirrorBuddy Must Do

**To comply with LOPDGDD/AEPD in Spain:**

1. ✅ **Show consent banner** - Clear, no pre-checks, "rechazar todo" equally visible, in Spanish
2. ✅ **Document all cookies** - Name, purpose, duration, provider (in Spanish)
3. ✅ **NO cookie walls** - All features work regardless of cookie choice
4. ✅ **Easy withdrawal** - Users can change minds anytime, easily
5. ✅ **Update privacy policy** - List cookies, explain rights, AEPD info (in Spanish)
6. ✅ **Separate consent per purpose** - Analytics ≠ Marketing ≠ Functional
7. ✅ **Comply with GDPR Article 7** - Consent must be freely given, specific, informed, unambiguous
8. ✅ **Spanish language** - All cookie information must be available in Spanish
9. ✅ **Monitor enforcement** - Watch for AEPD cases, update if needed

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Final for Implementation
**Compliance Owner**: Legal/Compliance Team
**Next Review**: 2026-04-27 (quarterly)
**Reference**: LOPDGDD 2018, GDPR 2016/679, ePrivacy Directive 2002/58/EC, AEPD Guidance
