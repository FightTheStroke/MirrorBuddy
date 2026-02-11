# i18n Internationalization Incident Runbook

> Specialized incident response guide for MirrorBuddy's multilingual platform. For general incidents, see [RUNBOOK.md](../operations/RUNBOOK.md)

## Overview

MirrorBuddy supports 5 languages with dynamic locale detection, translation loading, and language-aware content delivery. This runbook covers i18n-specific failures and recovery procedures.

### Supported Languages

| Language | Code | Region              | Status    |
| -------- | ---- | ------------------- | --------- |
| Italian  | it   | Italy               | Primary   |
| English  | en   | Global              | Supported |
| French   | fr   | France/Belgium      | Supported |
| German   | de   | Germany/Austria     | Supported |
| Spanish  | es   | Spain/Latin America | Supported |

---

## Incident INC-005: Missing Translations

**Severity:** SEV3 | **Response Time:** 4 hours

Users see untranslated keys (e.g., `i18n.chat.greeting`) or broken language packs instead of proper text.

### Symptoms

- UI displays translation keys instead of text (e.g., `i18n.button.submit`)
- 404 errors in browser console: `Failed to load /locales/{lang}/translation.json`
- Language pack not included in build bundle
- CDN cache stale after deployment

### Quick Diagnosis

```bash
# 1. Check if translation files exist in source (next-intl namespace structure)
ls -la messages/fr/

# 2. Check build output includes locale
grep -r "messages" .next/ | head -10

# 3. Check browser network tab for 404s
# Open DevTools > Network > Filter: /messages

# 4. Test direct translation URL
curl -I https://[domain]/messages/de/common.json

# 5. Check console for load errors
# DevTools > Console > Look for 404 or parse errors
```

### Root Causes

| Cause                         | Detection                                      | Fix                                       |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Missing source file           | `ls messages/{lang}/` returns empty            | Create translation file                   |
| Build not including locale    | Grep dist/ shows no reference                  | Run `npm run build`                       |
| Invalid JSON syntax           | `npx -y jsonlint messages/*/common.json` fails | Fix JSON in translation file              |
| CDN cache stale               | File exists locally but 404 remote             | Clear CDN cache (see below)               |
| Locale code mismatch          | Code requests `en-US` but file is `en`         | Update config in `src/lib/i18n/config.ts` |
| Language pack failed download | Network/CORS error in console                  | Check CORS headers, retry                 |

### Resolution Steps

#### Step 1: Add Missing Translation File

```bash
# Check which languages are available (next-intl namespace structure)
cd /Users/roberdan/GitHub/MirrorBuddy
ls messages/

# Copy all namespace files from existing language
cp -r messages/it/ messages/fr/

# Edit with translations
nano messages/fr/common.json

# Validate JSON syntax
npx -y jsonlint messages/fr/common.json
```

#### Step 2: Rebuild and Deploy

```bash
# Build locally to verify
npm run build

# Check build includes new locale
grep -r "fr" messages/ | head -5

# Deploy
git add messages/fr/
git commit -m "i18n: add French translations"
git push origin main

# Vercel auto-deploys, wait ~30 seconds
```

#### Step 3: Clear CDN Cache

Contact DevOps team with affected language code:

```
Subject: Clear CDN cache for language pack
Languages: fr, de
Reason: Translation files added/updated
Urgency: SEV3 - Users seeing broken text
```

**Manual CDN clear** (if available):

```bash
# Vercel dashboard > Project > CDN > Clear Cache
# Filter: /locales/{lang}/*
# Clear
```

#### Step 4: Verify Fix

```bash
# 1. Check file exists remotely
curl -s https://[domain]/locales/fr/translation.json | head -20

# 2. Reload page in browser
# DevTools > Network > Check locales load with 200 status

# 3. Verify text displays correctly
# Should see French text, not i18n keys

# 4. Test in all supported browsers
# Check no fallback needed
```

### Monitoring After Fix

- Monitor Grafana metric: `mirrorbuddy_i18n_missing_translations`
- Should drop to 0 within 5 minutes of cache clear
- Alert if metric > 5 for more than 10 minutes

---

## Incident INC-006: Locale Detection Failures

**Severity:** SEV3 | **Response Time:** 4 hours

User's language preference is not respected. Wrong language displayed despite correct browser settings or profile configuration.

### Symptoms

- User selects French, but app displays Italian
- Browser locale not detected correctly
- User profile language setting ignored
- Cookie/localStorage cleared unexpectedly
- Fallback language always used instead of preferred

### Quick Diagnosis

```bash
# 1. Check browser locale detection
# Open DevTools > Console > Run:
console.log(navigator.language)  // Should show user's locale

# 2. Check user profile in database
# Query: SELECT id, email, language FROM User WHERE email = 'user@example.com';
# Verify 'language' column has correct value

# 3. Check cookie persistence
# DevTools > Application > Cookies > Filter: mirrorbuddy-locale
# Value should be the user's language code

# 4. Check session language
# DevTools > Application > Session Storage > mirrorbuddy-language
# Should match selected language

# 5. Verify i18n config
# Run: curl http://localhost:3000/api/i18n/config
# Response should list all 5 supported languages
```

### Root Causes

| Cause                      | Detection                                                            | Fix                              |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| Browser locale unsupported | `navigator.language` = "pt-BR" but only en/it/fr/de/es               | Map locale or add new language   |
| User profile not synced    | DB shows wrong language                                              | Query why sync failed, resync    |
| Cookie cleared             | `mirrorbuddy-locale` missing                                         | Restore cookie, check TTL        |
| Invalid locale code        | DB stores "french" not "fr"                                          | Normalize all codes to ISO 639-1 |
| Fallback triggered         | Logs show "unsupported locale, using en"                             | Check locale code matching       |
| Auth provider sync issue   | User changes language in auth provider, not reflected in MirrorBuddy | Manual sync or re-login          |

### Resolution Steps

#### Step 1: Identify Affected User

```bash
# Get user locale data
curl -s http://localhost:3000/api/user/[user-id]/locale

# Response should show:
# {
#   "preferredLanguage": "fr",
#   "browserLocale": "fr-BE",
#   "storedLocale": "fr",
#   "detectedLocale": "fr"
# }
```

#### Step 2: Check Supported Locales

```typescript
// src/lib/i18n/config.ts
export const SUPPORTED_LOCALES = ['it', 'en', 'fr', 'de', 'es'];
export const DEFAULT_LOCALE = 'it';

// Verify user's language is in this list
// If missing, either:
// A) Add new language (requires translation file)
// B) Map unsupported locale to supported (e.g., pt-BR → es)
```

#### Step 3: Map Unsupported Locale (Quick Fix)

```typescript
// src/lib/i18n/locale-mapper.ts
export const LOCALE_MAPPING: Record<string, string> = {
  pt: 'es', // Portuguese → Spanish
  'pt-BR': 'es', // Brazilian Portuguese → Spanish
  'en-US': 'en', // US English → English
  'en-GB': 'en', // British English → English
  'fr-CA': 'fr', // Canadian French → French
  'de-AT': 'de', // Austrian German → German
};

export function mapLocale(locale: string): string {
  return LOCALE_MAPPING[locale] || DEFAULT_LOCALE;
}
```

#### Step 4: Force Language Refresh

For the affected user:

```bash
# Clear the locale cookie
# User opens browser DevTools > Application > Cookies
# Find: mirrorbuddy-locale
# Delete it

# OR via API (admin action)
curl -X POST http://localhost:3000/api/admin/clear-locale-cache \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'

# User refreshes page - should detect browser locale fresh
```

#### Step 5: Verify Fix

```bash
# 1. User refreshes page
# 2. App detects correct locale from navigator.language
# 3. Correct translation file loads (check Network tab)
# 4. UI displays in correct language
# 5. Cookie mirrorbuddy-locale set to correct value
```

### Add New Supported Language

If mapping unsupported locale to existing language doesn't solve it, add new language:

```bash
# 1. Create translation files (next-intl namespace structure)
cp -r messages/it/ messages/pt/

# 2. Add to config
# Edit src/lib/i18n/config.ts
export const SUPPORTED_LOCALES = ['it', 'en', 'fr', 'de', 'es', 'pt'];

# 3. Build and deploy
npm run build
git add messages/pt/ src/lib/i18n/config.ts
git commit -m "i18n: add Portuguese language support"
git push

# 4. Clear CDN cache for language pack
```

### Monitoring After Fix

- Monitor Grafana metric: `mirrorbuddy_i18n_locale_detection_failures`
- Should be < 1% after fix
- Alert if metric > 5% for extended period

---

## Locale Detection Algorithm

MirrorBuddy detects user language in priority order:

```
1. User's explicit selection (mirrorbuddy-locale cookie)
2. User profile setting (database userLanguage column)
3. Browser locale (navigator.language)
4. IP geolocation (from Vercel Analytics)
5. Default fallback (Italian)
```

### Code Flow

```typescript
// src/lib/i18n/detect-locale.ts
export async function detectUserLocale(request: NextRequest, userId?: string): Promise<string> {
  // 1. Check cookie first
  const cookieLocale = request.cookies.get('mirrorbuddy-locale')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check user profile
  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.language && SUPPORTED_LOCALES.includes(user.language)) {
      return user.language;
    }
  }

  // 3. Browser locale
  const browserLocale = request.headers.get('accept-language')?.split(',')[0];
  if (browserLocale) {
    const mapped = mapLocale(browserLocale);
    if (SUPPORTED_LOCALES.includes(mapped)) {
      return mapped;
    }
  }

  // 4. IP geolocation
  const geoCountry = request.geo?.country;
  const geoLocale = GEO_TO_LOCALE_MAP[geoCountry] || DEFAULT_LOCALE;
  if (SUPPORTED_LOCALES.includes(geoLocale)) {
    return geoLocale;
  }

  // 5. Default
  return DEFAULT_LOCALE; // 'it'
}
```

---

## Common Debugging Queries

### Find Users with Unsupported Languages

```sql
SELECT id, email, language, createdAt
FROM User
WHERE language NOT IN ('it', 'en', 'fr', 'de', 'es')
ORDER BY createdAt DESC;
```

**Action**: Contact affected users, ask to re-select language from dropdown.

### Find Users Missing Language Setting

```sql
SELECT id, email, language, createdAt
FROM User
WHERE language IS NULL
ORDER BY createdAt DESC;
```

**Action**: Set to browser locale or default (IT).

### Check Translation Coverage

```bash
# Verify all 5 language files have same keys
npx tsx scripts/validate-i18n-keys.ts

# Output should show:
# ✓ All 5 languages have same translation keys
# Keys: 247
# Untranslated (en): 0
```

### Monitor Translation Load Latency

```bash
# Check CDN latency in Grafana
# Dashboard: mirrorbuddy > i18n Metrics
# Panel: Language Pack CDN Latency (ms)
# GO threshold: < 500ms
# NO-GO threshold: > 2000ms
```

---

## Performance SLOs for i18n

| Metric                        | GO Threshold | NO-GO Threshold | Notes                      |
| ----------------------------- | ------------ | --------------- | -------------------------- |
| Missing translations (count)  | 0            | >5              | Triggers alert             |
| Locale detection success rate | >99%         | <95%            | Include all sources        |
| Translation load time         | <200ms       | >500ms          | P95 latency                |
| Language pack CDN hit ratio   | >95%         | <80%            | Cache efficiency           |
| Fallback language usage       | <1%          | >5%             | Indicates detection issues |

---

## Escalation Path

### INC-005 (Missing Translations)

1. **L1 (Frontend Eng)**: Verify translation file exists, check build logs
2. **L2 (i18n Team, 30min)**: Add missing keys if partial, rebuild
3. **L3 (DevOps, 1hr)**: Clear CDN cache, verify deployment

### INC-006 (Locale Detection)

1. **L1 (Frontend Eng)**: Check browser console, user profile
2. **L2 (i18n Team, 30min)**: Add locale mapping or update config
3. **L3 (DB Eng, 1hr)**: Fix profile sync, rebuild locale index

---

## Prevention Measures

### Pre-Deployment Checklist

- [ ] All 5 language files have translation keys (run validation script)
- [ ] No hardcoded language codes (always use constants)
- [ ] New UI strings added to all 5 translation files
- [ ] Locale mapping covers common unsupported codes
- [ ] CDN cache TTL set correctly (4 hours for translation files)
- [ ] i18n monitoring alerts configured in Grafana
- [ ] Fallback language working (test in console: `updateLanguage('xx')`)

### Translation File Validation

```bash
# Run before every deployment
npm run i18n:validate

# Checks:
# ✓ JSON syntax is valid
# ✓ All 5 languages have same keys
# ✓ No untranslated English keys
# ✓ No duplicate keys
# ✓ Character encoding is UTF-8
```

### Automated Testing

```bash
# E2E test locale detection
npm run test -- locale-detection.spec.ts

# E2E test all languages load
npm run test -- language-switching.spec.ts

# Unit test translation keys
npm run test:unit -- i18n-keys.test.ts
```

---

## Related Documents

- [RUNBOOK.md](../operations/RUNBOOK.md) - General incident response
- [ADR 0064](../adr/0064-formal-informal-professor-address.md) - Formal/informal address rules
- [ADR 0068](../adr/0068-conversion-funnel-dashboard.md) - Conversion funnel dashboard

---

_Version 1.0 | January 2026 | Initial i18n incident guide for multilingual platform_
