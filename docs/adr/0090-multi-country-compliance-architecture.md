# ADR 0090: Multi-Country Compliance Architecture

## Status

Accepted

## Date

2026-01-27

## Context

MirrorBuddy serves users across 5 countries (Italy, Spain, France, Germany, UK) with different regulatory requirements:

1. **GDPR variations** - Age of consent differs (14 vs 16 years)
2. **Cookie consent** - Country-specific regulations (LOPDGDD, Law 78-17, TTDSG, UK GDPR)
3. **Accessibility** - National standards (Law 4/2004, RD 1112/2018, RGAA 4.1, BITV 2.0, Accessibility Regulations 2018)
4. **AI Act** - National implementations (L.132/2025 in Italy, EU AI Act elsewhere)
5. **Language requirements** - All compliance content must be in local language

### The Challenge

Each country has:

- Different regulatory frameworks
- Different enforcement authorities
- Different language requirements
- Different age thresholds
- Different response time requirements

This creates complexity in:

- Cookie consent banners (must show correct language and buttons)
- Accessibility statements (must reference correct authority)
- Privacy policies (must comply with local variations)
- Data protection documentation (must reference local laws)

### Options Considered

#### Option 1: Single Compliance Set (Lowest Effort)

**Pros:**

- Minimal implementation
- Single set of documents

**Cons:**

- Non-compliant with local requirements
- Legal risk in each country
- Missing language requirements
- Wrong authority contacts

#### Option 2: Country-Specific Implementations (Chosen)

**Pros:**

- Full compliance per country
- Correct language and authorities
- Legal risk mitigation
- Scalable to new countries

**Cons:**

- More initial work
- Ongoing maintenance
- Requires documentation structure

## Decision

Implement multi-country compliance architecture with:

### 1. Geo-Based Configuration System

**Location**: `src/lib/compliance/cookie-consent-config.ts`

**Purpose**: Provides country-specific configurations for cookie consent banners

**Features:**

- Maps locale to country code
- Returns country-specific configuration (text, buttons, authority)
- Supports IT, ES, FR, DE, UK, US, OTHER
- Includes regulatory framework name
- Includes authority contact information

**Usage:**

```typescript
import { getCookieConsentConfigFromLocale } from "@/lib/compliance/cookie-consent-config";

const config = getCookieConsentConfigFromLocale(locale);
// Returns: { country, regulation, language, acceptAllText, rejectAllText, authority, ... }
```

### 2. Country-Specific Documentation Structure

**Location**: `docs/compliance/countries/{country}/`

**Structure:**

```
docs/compliance/countries/
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

**Purpose**: Centralized country-specific compliance documentation

### 3. Compliance Matrix

**Location**: `docs/compliance/COMPLIANCE-MATRIX.md`

**Purpose**: Quick reference mapping country × requirement

**Content:**

- Requirements table (country × requirement type)
- Documentation paths
- Authority contacts
- Implementation status
- Quick reference guide

### 4. Localized Compliance Pages

**Cookie Consent**: `src/components/consent/cookie-consent-wall.tsx`

- Uses `cookie-consent-config.ts` for country-specific text
- Shows correct language and buttons
- Links to correct regulatory authority

**Accessibility Statement**: `src/app/[locale]/accessibility/`

- Localized content for all languages
- Country-specific authority contacts
- Regulatory framework references

### 5. Locale Detection and Routing

**Location**: `src/proxy.ts`, `src/i18n/routing.ts`

**Implementation:**

- next-intl middleware handles locale detection
- Priority: Cookie → Accept-Language → Default
- Redirects paths without locale prefix
- Excludes /api, /admin, static files

**Geo-detection**: Available via `request.geo?.country` for future enhancements

## Consequences

### Positive

1. **Full Compliance**: Each country has correct regulatory framework references
2. **Language Compliance**: All content in correct language
3. **Authority Contacts**: Correct regulatory authority per country
4. **Scalability**: Easy to add new countries
5. **Maintainability**: Centralized configuration and documentation
6. **Legal Risk Mitigation**: Reduces non-compliance risk

### Negative

1. **Initial Effort**: Requires creating documentation for each country
2. **Ongoing Maintenance**: Must keep documentation updated
3. **Complexity**: More files and configurations to manage
4. **Testing**: Must test compliance flows per country

### Neutral

1. **Documentation Volume**: More documentation files
2. **Configuration Files**: Additional config files for country mappings

## Implementation Details

### Cookie Consent Configuration

```typescript
// src/lib/compliance/cookie-consent-config.ts
export function getCookieConsentConfigFromLocale(
  locale: string,
): CookieConsentConfig {
  const country = localeToCountry(locale);
  return getCookieConsentConfig(country);
}
```

### Usage in Components

```typescript
// src/components/consent/cookie-consent-wall.tsx
const locale = useLocale();
const config = getCookieConsentConfigFromLocale(locale);

// Use config.acceptAllText, config.rejectAllText, config.authority, etc.
```

### Documentation Structure

Each country has 4 documentation files:

1. `data-protection.md` - GDPR/data protection requirements
2. `cookie-compliance.md` - Cookie consent requirements
3. `accessibility-compliance.md` - Accessibility requirements
4. `ai-regulatory-contacts.md` - AI Act regulatory contacts

## Related ADRs

- **ADR 0066**: Multi-Language i18n Architecture (locale routing)
- **ADR 0062**: AI Compliance Framework (AI Act compliance)
- **ADR 0060**: Instant Accessibility Feature (accessibility implementation)
- **ADR 0075**: Cookie Handling Standards (cookie consent)

## Verification

- [x] Cookie consent configurations created for all countries
- [x] Country-specific documentation created
- [x] Compliance matrix created
- [x] Accessibility statement localized
- [x] Locale detection verified
- [x] Regulatory authority contacts documented

## Status

✅ **IMPLEMENTED** - Plan 90 (Multi-Language-Compliance)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
